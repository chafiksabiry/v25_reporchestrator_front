import { getAgentId, getAuthToken } from '../utils/authUtils';
import type { RepNotificationKind } from '../contexts/NotificationsContext';
import { getDashRepApiHost } from '../utils/repApiUrl';

export type NotificationSocketPayload = {
  type?: string;
  repId?: string;
  created?: boolean;
  notification?: {
    id?: string;
    notificationKey?: string;
    kind?: RepNotificationKind | string;
    status?: string;
    gigId?: string;
    journeyId?: string;
    title?: string;
    message?: string;
    actionPath?: string;
    read?: boolean;
    createdAt?: number;
  };
};

function getWsUrl(): string | null {
  const host = getDashRepApiHost();
  if (!host) return null;
  try {
    const url = new URL(host);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    // WS is mounted at server root, not under /api.
    url.pathname = '/notification-updates';
    url.search = '';
    return url.toString();
  } catch {
    return null;
  }
}

export type NotificationSocketOptions = {
  /**
   * Appelé une fois par connexion, quand le serveur est prêt à livrer (message `authenticated`, ou
   * `connected` pour l'ancien serveur) — pas à l'ouverture du socket. Sert à rattraper par un GET
   * les notifications émises pendant l'authentification ou une coupure (le serveur n'a pas de file).
   */
  onConnect?: () => void;
};

/** Code de fermeture renvoyé par le serveur quand l'authentification échoue (jeton absent/invalide/expiré). */
export const WS_AUTH_FAILED_CLOSE_CODE = 4401;
const RECONNECT_BASE_MS = 3000;
const RECONNECT_MAX_MS = 30000;
const WAIT_FOR_TOKEN_MS = 15000;
/** Après `connected`, délai d'attente de `authenticated` avant de conclure à un ancien serveur (qui n'en envoie pas). */
const LEGACY_READY_FALLBACK_MS = 1500;

/** Dépendances injectables (tests) ; les valeurs par défaut sont celles du navigateur. */
export interface NotificationSocketDeps {
  wsUrl: string | null;
  getToken: () => string | null;
  getAgentId: () => string | null | undefined;
  createSocket: (url: string) => WebSocket;
  /** Appelle `cb` quand le jeton a pu changer (autre onglet, retour sur l'onglet) ; renvoie la désinscription. */
  onTokenMayChange: (cb: () => void) => () => void;
}

const defaultDeps = (): NotificationSocketDeps => ({
  wsUrl: getWsUrl(),
  getToken: () => {
    try {
      return getAuthToken();
    } catch {
      return null;
    }
  },
  getAgentId: () => getAgentId(),
  createSocket: (url) => new WebSocket(url),
  onTokenMayChange: (cb) => {
    if (typeof window === 'undefined') return () => {};
    const onVisible = () => {
      if (document.visibilityState === 'visible') cb();
    };
    window.addEventListener('storage', cb);
    window.addEventListener('focus', cb);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('storage', cb);
      window.removeEventListener('focus', cb);
      document.removeEventListener('visibilitychange', onVisible);
    };
  },
});

/**
 * Connexion à dash_rep_back `/notification-updates` (notifications durables en temps réel).
 *
 * Authentification : après l'ouverture, le client envoie `{ type: 'auth', token }` (jamais de jeton
 * dans l'URL) ; le serveur ferme la connexion s'il ne la reçoit pas dans les 5 s. Chaque
 * reconnexion relit le jeton et se réauthentifie.
 * - Fermeture 4401 (auth refusée) : aucune boucle — on ne se reconnecte que lorsque le jeton a changé.
 * - Pas de jeton : pas de connexion ; elle s'ouvre dès qu'un jeton apparaît.
 * - Nouveau serveur : il répond `authenticated` ; l'abonnement est implicite (par le jeton), aucun
 *   `subscribe` n'est envoyé. L'état « prêt » ne dépend jamais de `subscribed`.
 * - `connected` : envoyé à l'ouverture par l'ancien serveur ET par le nouveau (avant la vérification du
 *   jeton). On y envoie `subscribe` (ancien serveur ; ignoré sans effet par le nouveau) mais on n'est
 *   PAS prêt : si `authenticated` n'arrive pas dans LEGACY_READY_FALLBACK_MS, c'est un ancien serveur.
 * - `options.onConnect` (rattrapage par GET) est appelé une fois par connexion, à `authenticated` ou,
 *   à défaut, après ce repli — jamais à l'ouverture ni à `connected` : avant l'auth, une notification
 *   émise pendant la vérification du jeton serait perdue.
 * Les messages `connected` / `subscribed` / `authenticated` ne sont jamais traités comme des notifications.
 */
export function connectNotificationSocketWith(
  deps: NotificationSocketDeps,
  onNotification: (data: NotificationSocketPayload) => void,
  options?: NotificationSocketOptions
): () => void {
  if (!deps.wsUrl) return () => {};
  const wsUrl = deps.wsUrl;

  let socket: WebSocket | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let disposed = false;
  let attempts = 0;
  /** Jeton avec lequel le serveur a refusé l'auth (4401) : on n'insiste pas avec le même. */
  let rejectedToken: string | null = null;
  /** Annule le délai de repli « ancien serveur » de la connexion courante. */
  let clearSocketTimer: (() => void) | null = null;

  const clearTimer = () => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  };

  const schedule = (delayMs: number) => {
    if (disposed || reconnectTimer) return;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      connect();
    }, delayMs);
  };

  const send = (payload: unknown) => {
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    try {
      socket.send(JSON.stringify(payload));
    } catch {
      /* ignore */
    }
  };

  const connect = () => {
    if (disposed || socket) return;
    const token = deps.getToken();
    if (!token) {
      // Pas de jeton : rien à authentifier. On revérifie lentement (sans réseau).
      schedule(WAIT_FOR_TOKEN_MS);
      return;
    }
    if (rejectedToken && token === rejectedToken) {
      // Auth déjà refusée avec ce jeton : on attend qu'il change (pas de boucle de reconnexion).
      return;
    }
    let ws: WebSocket;
    try {
      ws = deps.createSocket(wsUrl);
    } catch {
      attempts += 1;
      schedule(Math.min(RECONNECT_MAX_MS, RECONNECT_BASE_MS * 2 ** Math.min(attempts, 4)));
      return;
    }
    socket = ws;
    const usedToken = token;

    let ready = false;
    let legacyTimer: ReturnType<typeof setTimeout> | null = null;
    const clearLegacyTimer = () => {
      if (legacyTimer) {
        clearTimeout(legacyTimer);
        legacyTimer = null;
      }
    };
    clearSocketTimer = clearLegacyTimer;
    const markReady = () => {
      clearLegacyTimer();
      if (ready || disposed || socket !== ws) return;
      ready = true;
      options?.onConnect?.();
    };

    ws.onopen = () => {
      attempts = 0;
      send({ type: 'auth', token: usedToken });
    };

    ws.onmessage = (event) => {
      let data: NotificationSocketPayload;
      try {
        data = JSON.parse(String(event.data));
      } catch {
        return;
      }
      if (data?.type === 'connected') {
        // Ancien serveur : l'abonnement par repId existe encore.
        const repId = deps.getAgentId();
        if (repId) send({ type: 'subscribe', repId });
        // Le nouveau serveur envoie aussi `connected` à l'ouverture (avant l'auth) : on n'est PAS prêt.
        // Sans `authenticated` dans le délai, c'est un ancien serveur : on conclut alors à « prêt ».
        if (!ready && !legacyTimer) legacyTimer = setTimeout(markReady, LEGACY_READY_FALLBACK_MS);
        return;
      }
      if (data?.type === 'authenticated') {
        // Nouveau serveur : abonnement implicite ; on rattrape ce qui a pu être émis avant.
        markReady();
        return;
      }
      if (data?.type !== 'notification' || !data.notification) return; // subscribed, authenticated, …

      const myAgentId = deps.getAgentId();
      if (data.repId && myAgentId && String(data.repId) !== String(myAgentId)) return;
      onNotification(data);
    };

    ws.onclose = (event) => {
      clearLegacyTimer();
      if (socket === ws) socket = null;
      if (disposed) return;
      if (event?.code === WS_AUTH_FAILED_CLOSE_CODE) {
        rejectedToken = usedToken; // pas de reconnexion tant que le jeton n'a pas changé
        return;
      }
      attempts += 1;
      schedule(Math.min(RECONNECT_MAX_MS, RECONNECT_BASE_MS * 2 ** Math.min(attempts - 1, 4)));
    };

    ws.onerror = () => {
      try {
        ws.close();
      } catch {
        /* ignore */
      }
    };
  };

  // Le jeton a pu changer (nouvelle connexion dans un autre onglet…) : on retente si c'était bloqué.
  const stopWatching = deps.onTokenMayChange(() => {
    if (disposed) return;
    const token = deps.getToken();
    if (rejectedToken && token && token !== rejectedToken) {
      rejectedToken = null;
      attempts = 0;
      clearTimer();
      connect();
    } else if (!socket && token && !(rejectedToken && token === rejectedToken)) {
      // En attente d'un jeton (ou d'une reconnexion planifiée) : on connecte tout de suite.
      clearTimer();
      connect();
    }
  });

  connect();

  return () => {
    disposed = true;
    stopWatching();
    clearTimer();
    clearSocketTimer?.();
    try {
      socket?.close();
    } catch {
      /* ignore */
    }
    socket = null;
  };
}

export function connectRepNotificationSocket(
  onNotification: (data: NotificationSocketPayload) => void,
  options?: NotificationSocketOptions
): () => void {
  return connectNotificationSocketWith(defaultDeps(), onNotification, options);
}
