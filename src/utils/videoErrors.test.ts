import { describe, expect, it, vi } from 'vitest';
import {
  checkVideoBeforeUpload,
  checkVideoDuration,
  parseRetryAfter,
  toVideoApiError,
  videoErrorMessage,
  withRetryAfterOnce,
  type VideoErrorCode,
} from './videoErrors';
import { VIDEO_MAX_BYTES } from './videoLimits';

const ALL: VideoErrorCode[] = [
  'VIDEO_TOO_LARGE', 'NOT_A_VIDEO', 'VIDEO_TOO_SHORT', 'VIDEO_TOO_LONG', 'NO_VIDEO', 'UPLOAD_BUSY',
  'VIDEO_STORAGE_ERROR', 'UPLOAD_FAILED', 'ANALYSIS_FAILED', 'INTERNAL_ERROR', 'UNAUTHORIZED', 'UNKNOWN',
];

describe('erreurs d’envoi de vidéo', () => {
  it('413 VIDEO_TOO_LARGE : 100 Mo, à refaire', () => {
    const e = toVideoApiError(413, { code: 'VIDEO_TOO_LARGE', message: 'maximum 100 Mo' });
    expect(e.code).toBe('VIDEO_TOO_LARGE');
    expect(e.retryable).toBe(false);
    expect(videoErrorMessage(e.code, 'fr')).toContain('100 Mo');
    expect(videoErrorMessage(e.code, 'en')).toContain('100 MB');
    expect(toVideoApiError(413).code).toBe('VIDEO_TOO_LARGE'); // sans corps
  });

  it.each(['NOT_A_VIDEO', 'VIDEO_TOO_SHORT', 'VIDEO_TOO_LONG', 'NO_VIDEO'] as const)(
    '%s (400) : non relançable automatiquement',
    (code) => {
      const e = toVideoApiError(400, { code });
      expect(e.code).toBe(code);
      expect(e.retryable).toBe(false);
    }
  );

  it('durées affichées : 30 secondes, et durée maximale paramétrable (défaut 3 min, 10 min ailleurs)', () => {
    expect(videoErrorMessage('VIDEO_TOO_SHORT', 'fr')).toContain('30 secondes');
    expect(videoErrorMessage('VIDEO_TOO_SHORT', 'en')).toContain('30 seconds');
    expect(videoErrorMessage('VIDEO_TOO_LONG', 'fr')).toContain('3 minutes');
    expect(videoErrorMessage('VIDEO_TOO_LONG', 'fr', { maxMinutes: 10 })).toContain('10 minutes');
    expect(videoErrorMessage('VIDEO_TOO_LONG', 'en', { maxMinutes: 5 })).toContain('5 minutes');
  });

  it('429 UPLOAD_BUSY : Retry-After pris en compte (défaut 5 s, borné à 30 s)', () => {
    expect(toVideoApiError(429, { code: 'UPLOAD_BUSY' }, '5')).toMatchObject({ code: 'UPLOAD_BUSY', retryable: true, retryAfterMs: 5000 });
    expect(toVideoApiError(429, undefined, '2').retryAfterMs).toBe(2000);
    expect(toVideoApiError(429).retryAfterMs).toBe(5000);
    expect(parseRetryAfter('9999')).toBe(30000);
    expect(parseRetryAfter('n’importe quoi')).toBe(5000);
  });

  it('502 VIDEO_STORAGE_ERROR : relançable, message dédié', () => {
    const e = toVideoApiError(502, { code: 'VIDEO_STORAGE_ERROR', message: 'texte brut serveur' });
    expect(e.code).toBe('VIDEO_STORAGE_ERROR');
    expect(e.retryable).toBe(true);
    expect(videoErrorMessage(e.code, 'fr')).toContain('stockage vidéo');
    expect(videoErrorMessage(e.code, 'fr')).not.toContain('texte brut');
  });

  it('autres statuts : message générique humain, jamais le texte brut ni « Server error »', () => {
    for (const status of [500, 503, 418]) {
      const e = toVideoApiError(status, { message: 'Server error 400 stack trace…' });
      const msg = videoErrorMessage(e.code, 'fr');
      expect(msg).not.toMatch(/Server error|stack trace|\d{3}/);
    }
    expect(toVideoApiError(500).code).toBe('INTERNAL_ERROR');
    expect(toVideoApiError(401).code).toBe('UNAUTHORIZED');
  });

  it('chaque code a un message FR et EN réels (pas la clé), sans variable non résolue', () => {
    for (const c of ALL) {
      for (const l of ['fr', 'en']) {
        const m = videoErrorMessage(c, l);
        expect(m.length, `${c}/${l}`).toBeGreaterThan(20);
        expect(m).not.toContain('videoErrors.');
        expect(m).not.toContain('{{');
        expect(m).not.toMatch(/[A-Z]{4,}_[A-Z_]+/);
      }
    }
  });

  it('avant envoi : > 100 Mo refusé sans envoyer ; 100 Mo exactement accepté', () => {
    const big = new Blob([new Uint8Array(8)]);
    Object.defineProperty(big, 'size', { value: VIDEO_MAX_BYTES + 1 });
    expect(checkVideoBeforeUpload(big)?.code).toBe('VIDEO_TOO_LARGE');
    const ok = new Blob([new Uint8Array(8)]);
    Object.defineProperty(ok, 'size', { value: VIDEO_MAX_BYTES });
    expect(checkVideoBeforeUpload(ok)).toBeNull();
  });

  it('durée d’un fichier choisi : < 30 s, > 605 s refusés ; illisible : le serveur tranchera', () => {
    expect(checkVideoDuration(12)?.code).toBe('VIDEO_TOO_SHORT');
    expect(checkVideoDuration(606)?.code).toBe('VIDEO_TOO_LONG');
    expect(checkVideoDuration(30)).toBeNull();
    expect(checkVideoDuration(605)).toBeNull();
    expect(checkVideoDuration(null)).toBeNull();
  });

  it('429 : une seule relance automatique après Retry-After, puis l’erreur est renvoyée', async () => {
    const sleep = vi.fn().mockResolvedValue(undefined);
    const busy = toVideoApiError(429, { code: 'UPLOAD_BUSY' }, '5');
    const ok = vi.fn().mockRejectedValueOnce(busy).mockResolvedValueOnce('envoyé');
    await expect(withRetryAfterOnce(ok, sleep)).resolves.toBe('envoyé');
    expect(sleep).toHaveBeenCalledWith(5000);
    expect(ok).toHaveBeenCalledTimes(2);

    const always = vi.fn().mockRejectedValue(busy);
    await expect(withRetryAfterOnce(always, sleep)).rejects.toMatchObject({ code: 'UPLOAD_BUSY' });
    expect(always).toHaveBeenCalledTimes(2); // pas de troisième essai
  });

  it('une erreur autre que 429 n’est jamais relancée automatiquement', async () => {
    const sleep = vi.fn();
    const failing = vi.fn().mockRejectedValue(toVideoApiError(400, { code: 'VIDEO_TOO_SHORT' }));
    await expect(withRetryAfterOnce(failing, sleep)).rejects.toMatchObject({ code: 'VIDEO_TOO_SHORT' });
    expect(failing).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });
});
