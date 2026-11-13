import { describe, expect, it } from 'vitest';
import {
  PROFILE_RECORDING_MAX_SECONDS,
  RECORDER_BITRATES,
  VIDEO_MAX_BYTES,
  estimatedMegabytes,
  recorderOptions,
} from './videoLimits';
import { INTRO_VIDEO_MAX_SECONDS } from './introVideo';

describe('limites des vidéos', () => {
  it('débits plafonnés : 1,5 Mbit/s vidéo + 96 kbit/s audio', () => {
    expect(RECORDER_BITRATES).toEqual({ videoBitsPerSecond: 1_500_000, audioBitsPerSecond: 96_000 });
    expect(recorderOptions('video/webm')).toEqual({ mimeType: 'video/webm', videoBitsPerSecond: 1_500_000, audioBitsPerSecond: 96_000 });
    expect(recorderOptions()).not.toHaveProperty('mimeType');
  });

  it('3 min ≈ 35 Mo, 5 min ≈ 56 Mo (sous 100 Mo) ; 10 min dépasserait 100 Mo', () => {
    expect(Math.round(estimatedMegabytes(180))).toBe(34);
    expect(Math.round(estimatedMegabytes(300))).toBe(57);
    expect(estimatedMegabytes(PROFILE_RECORDING_MAX_SECONDS) * 1024 * 1024).toBeLessThan(VIDEO_MAX_BYTES);
    expect(estimatedMegabytes(INTRO_VIDEO_MAX_SECONDS) * 1024 * 1024).toBeLessThan(VIDEO_MAX_BYTES);
    expect(estimatedMegabytes(600) * 1024 * 1024).toBeGreaterThan(VIDEO_MAX_BYTES);
  });

  it('plafond de l’enregistreur du profil : 300 s', () => {
    expect(PROFILE_RECORDING_MAX_SECONDS).toBe(300);
  });
});
