import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  connectNotificationSocketWith,
  WS_AUTH_FAILED_CLOSE_CODE,
  type NotificationSocketDeps,
} from './notificationSocket';

class FakeSocket {
  static instances: FakeSocket[] = [];
  readyState = 0;
  sent: any[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;
  onclose: ((e: { code: number }) => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(public url: string) {
    FakeSocket.instances.push(this);
  }
  send(data: string) {
    this.sent.push(JSON.parse(data));
  }
  close() {
    this.readyState = 3;
  }
  // aides de test
  open() {
    this.readyState = 1;
    this.onopen?.();
  }
  receive(msg: unknown) {
    this.onmessage?.({ data: JSON.stringify(msg) });
  }
  closeWith(code: number) {
    this.readyState = 3;
    this.onclose?.({ code });
  }
}

const NOTIF = { type: 'notification', repId: 'rep-1', notification: { id: 'n1', title: 'Hello' } };

describe('WebSocket /notification-updates : authentification', () => {
  let token: string | null;
  let tokenWatchers: Array<() => void>;
  let deps: NotificationSocketDeps;

  beforeEach(() => {
    vi.useFakeTimers();
    (globalThis as any).WebSocket = Object.assign(FakeSocket, { OPEN: 1 });
    FakeSocket.instances = [];
    token = 'jwt-1';
    tokenWatchers = [];
    deps = {
      wsUrl: 'wss://dash.example/notification-updates',
      getToken: () => token,
      getAgentId: () => 'rep-1',
      createSocket: (url) => new FakeSocket(url) as unknown as WebSocket,
      onTokenMayChange: (cb) => {
        tokenWatchers.push(cb);
        return () => {
          tokenWatchers = tokenWatchers.filter((w) => w !== cb);
        };
      },
    };
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('envoie { type: "auth", token } dès l’ouverture, jamais le jeton dans l’URL, et pas de subscribe', () => {
    connectNotificationSocketWith(deps, () => {});
    const ws = FakeSocket.instances[0];
    expect(ws.url).not.toContain('jwt-1');
    ws.open();
    expect(ws.sent).toEqual([{ type: 'auth', token: 'jwt-1' }]);
  });

  it('ancien serveur : sur « connected », envoie aussi l’abonnement par repId', () => {
    connectNotificationSocketWith(deps, () => {});
    const ws = FakeSocket.instances[0];
    ws.open();
    ws.receive({ type: 'connected' });
    expect(ws.sent).toEqual([{ type: 'auth', token: 'jwt-1' }, { type: 'subscribe', repId: 'rep-1' }]);
  });

  it('livre les notifications ; ignore connected / subscribed / authenticated et les autres REP', () => {
    const got: any[] = [];
    connectNotificationSocketWith(deps, (d) => got.push(d));
    const ws = FakeSocket.instances[0];
    ws.open();
    ws.receive({ type: 'subscribed' });
    ws.receive({ type: 'authenticated' });
    ws.receive({ type: 'notification' }); // sans contenu
    ws.receive({ ...NOTIF, repId: 'autre-rep' });
    ws.receive(NOTIF);
    expect(got).toHaveLength(1);
    expect(got[0].notification.id).toBe('n1');
  });

  it('nouveau serveur : « authenticated » → rattrapage (onConnect) une seule fois, aucun subscribe', () => {
    const onConnect = vi.fn();
    connectNotificationSocketWith(deps, () => {}, { onConnect });
    const ws = FakeSocket.instances[0];
    ws.open();
    expect(onConnect).not.toHaveBeenCalled(); // pas à l'ouverture : l'auth n'est pas terminée
    ws.receive({ type: 'authenticated' });
    ws.receive({ type: 'authenticated' });
    expect(onConnect).toHaveBeenCalledTimes(1);
    expect(ws.sent).toEqual([{ type: 'auth', token: 'jwt-1' }]); // abonnement implicite
  });

  it('nouveau serveur : « subscribed » n’est jamais nécessaire (ni ne déclenche le rattrapage)', () => {
    const onConnect = vi.fn();
    const got: any[] = [];
    connectNotificationSocketWith(deps, (d) => got.push(d), { onConnect });
    const ws = FakeSocket.instances[0];
    ws.open();
    ws.receive({ type: 'authenticated' });
    ws.receive(NOTIF); // livré sans aucun « subscribed »
    expect(got).toHaveLength(1);
    expect(onConnect).toHaveBeenCalledTimes(1);
  });

  it('ancien serveur : « connected » → subscribe + rattrapage, sans « authenticated » ni « subscribed »', () => {
    const onConnect = vi.fn();
    const got: any[] = [];
    connectNotificationSocketWith(deps, (d) => got.push(d), { onConnect });
    const ws = FakeSocket.instances[0];
    ws.open();
    expect(onConnect).not.toHaveBeenCalled();
    ws.receive({ type: 'connected' });
    expect(ws.sent).toEqual([{ type: 'auth', token: 'jwt-1' }, { type: 'subscribe', repId: 'rep-1' }]);
    expect(onConnect).toHaveBeenCalledTimes(1);
    ws.receive(NOTIF);
    expect(got).toHaveLength(1);
  });

  it('notification manquée pendant la coupure : chaque reconnexion authentifiée relance le rattrapage', () => {
    const onConnect = vi.fn();
    connectNotificationSocketWith(deps, () => {}, { onConnect });
    FakeSocket.instances[0].open();
    FakeSocket.instances[0].receive({ type: 'authenticated' });
    expect(onConnect).toHaveBeenCalledTimes(1);
    FakeSocket.instances[0].closeWith(1006); // coupure : une notification émise ici est perdue côté WS
    vi.advanceTimersByTime(3000);
    const ws2 = FakeSocket.instances[1];
    ws2.open();
    expect(onConnect).toHaveBeenCalledTimes(1); // pas encore authentifié : pas de rattrapage prématuré
    ws2.receive({ type: 'authenticated' });
    expect(onConnect).toHaveBeenCalledTimes(2); // le GET récupère la notification manquée
  });

  it('connexion fermée avant « authenticated » (4401) : aucun rattrapage', () => {
    const onConnect = vi.fn();
    connectNotificationSocketWith(deps, () => {}, { onConnect });
    FakeSocket.instances[0].open();
    FakeSocket.instances[0].closeWith(WS_AUTH_FAILED_CLOSE_CODE);
    expect(onConnect).not.toHaveBeenCalled();
  });

  it('coupure réseau : reconnexion avec ré-authentification (jeton relu)', () => {
    connectNotificationSocketWith(deps, () => {});
    FakeSocket.instances[0].open();
    token = 'jwt-2'; // jeton renouvelé entre-temps
    FakeSocket.instances[0].closeWith(1006);
    vi.advanceTimersByTime(3000);
    expect(FakeSocket.instances).toHaveLength(2);
    FakeSocket.instances[1].open();
    expect(FakeSocket.instances[1].sent).toEqual([{ type: 'auth', token: 'jwt-2' }]);
  });

  it('fermeture 4401 : AUCUNE boucle de reconnexion avec le même jeton', () => {
    connectNotificationSocketWith(deps, () => {});
    FakeSocket.instances[0].open();
    FakeSocket.instances[0].closeWith(WS_AUTH_FAILED_CLOSE_CODE);
    vi.advanceTimersByTime(10 * 60 * 1000);
    expect(FakeSocket.instances).toHaveLength(1);
    tokenWatchers.forEach((cb) => cb()); // même jeton : toujours rien
    expect(FakeSocket.instances).toHaveLength(1);
  });

  it('après un 4401, reconnexion dès que le jeton a changé', () => {
    connectNotificationSocketWith(deps, () => {});
    FakeSocket.instances[0].open();
    FakeSocket.instances[0].closeWith(WS_AUTH_FAILED_CLOSE_CODE);
    token = 'jwt-neuf';
    tokenWatchers.forEach((cb) => cb());
    expect(FakeSocket.instances).toHaveLength(2);
    FakeSocket.instances[1].open();
    expect(FakeSocket.instances[1].sent[0]).toEqual({ type: 'auth', token: 'jwt-neuf' });
  });

  it('sans jeton : pas de connexion ; elle s’ouvre quand le jeton apparaît', () => {
    token = null;
    connectNotificationSocketWith(deps, () => {});
    vi.advanceTimersByTime(60_000);
    expect(FakeSocket.instances).toHaveLength(0);
    token = 'jwt-tardif';
    tokenWatchers.forEach((cb) => cb());
    expect(FakeSocket.instances).toHaveLength(1);
  });

  it('reconnexion espacée (3 s puis plus), jamais en rafale', () => {
    connectNotificationSocketWith(deps, () => {});
    FakeSocket.instances[0].closeWith(1006);
    vi.advanceTimersByTime(2999);
    expect(FakeSocket.instances).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(FakeSocket.instances).toHaveLength(2);
    FakeSocket.instances[1].closeWith(1006); // échec avant ouverture : délai plus long
    vi.advanceTimersByTime(3000);
    expect(FakeSocket.instances).toHaveLength(2);
    vi.advanceTimersByTime(3000);
    expect(FakeSocket.instances).toHaveLength(3);
  });

  it('désinscription : plus de reconnexion', () => {
    const stop = connectNotificationSocketWith(deps, () => {});
    stop();
    FakeSocket.instances[0].closeWith(1006);
    vi.advanceTimersByTime(60_000);
    expect(FakeSocket.instances).toHaveLength(1);
    expect(tokenWatchers).toHaveLength(0);
  });

  it('URL absente : aucune connexion', () => {
    connectNotificationSocketWith({ ...deps, wsUrl: null }, () => {});
    expect(FakeSocket.instances).toHaveLength(0);
  });
});
