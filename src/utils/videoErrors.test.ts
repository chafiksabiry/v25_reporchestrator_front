import { describe, expect, it } from 'vitest';
import { toVideoApiError, videoErrorMessage, type VideoErrorCode } from './videoErrors';

describe('erreurs de la vidéo de présentation', () => {
  it('413 VIDEO_TOO_LARGE : message clair FR/EN, à refaire', () => {
    const e = toVideoApiError(413, { code: 'VIDEO_TOO_LARGE', message: 'maximum 150 Mo' });
    expect(e.code).toBe('VIDEO_TOO_LARGE');
    expect(e.retryable).toBe(false);
    expect(videoErrorMessage(e.code, 'fr')).toContain('150 Mo');
    expect(videoErrorMessage(e.code, 'en')).toContain('150 MB');
  });

  it('413 sans corps : traité comme trop volumineux', () => {
    expect(toVideoApiError(413).code).toBe('VIDEO_TOO_LARGE');
  });

  it.each([
    ['NOT_A_VIDEO', 400],
    ['VIDEO_TOO_SHORT', 400],
    ['VIDEO_TOO_LONG', 400],
    ['NO_VIDEO', 400],
  ] as const)('%s : non relançable automatiquement', (code, status) => {
    const e = toVideoApiError(status, { code });
    expect(e.code).toBe(code);
    expect(e.retryable).toBe(false);
  });

  it('durées affichées : 30 secondes et 3 minutes', () => {
    expect(videoErrorMessage('VIDEO_TOO_SHORT', 'fr')).toContain('30 secondes');
    expect(videoErrorMessage('VIDEO_TOO_LONG', 'fr')).toContain('3 minutes');
    expect(videoErrorMessage('VIDEO_TOO_SHORT', 'en')).toContain('30 seconds');
    expect(videoErrorMessage('VIDEO_TOO_LONG', 'en')).toContain('3 minutes');
  });

  it('erreurs techniques : relançables (502/500/UPLOAD_FAILED)', () => {
    expect(toVideoApiError(502, { code: 'ANALYSIS_FAILED' }).retryable).toBe(true);
    expect(toVideoApiError(500, { code: 'INTERNAL_ERROR' }).retryable).toBe(true);
    expect(toVideoApiError(400, { code: 'UPLOAD_FAILED' }).retryable).toBe(true);
    expect(toVideoApiError(503).code).toBe('INTERNAL_ERROR');
  });

  it('401 : session expirée, non relançable', () => {
    const e = toVideoApiError(401);
    expect(e.code).toBe('UNAUTHORIZED');
    expect(e.retryable).toBe(false);
  });

  it('chaque code a un message FR et EN, jamais le code brut', () => {
    const codes: VideoErrorCode[] = ['VIDEO_TOO_LARGE','NOT_A_VIDEO','VIDEO_TOO_SHORT','VIDEO_TOO_LONG','NO_VIDEO','UPLOAD_FAILED','ANALYSIS_FAILED','INTERNAL_ERROR','UNAUTHORIZED','UNKNOWN'];
    for (const c of codes) {
      for (const l of ['fr', 'en']) {
        const m = videoErrorMessage(c, l);
        expect(m.length).toBeGreaterThan(20);
        expect(m).not.toMatch(/[A-Z]{4,}_[A-Z_]+/);
      }
    }
  });
});
