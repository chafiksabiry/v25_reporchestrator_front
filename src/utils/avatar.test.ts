import { describe, expect, it } from 'vitest';
import { getAvatarInitials, isUsablePhotoUrl } from './avatar';

describe('isUsablePhotoUrl', () => {
  it('accepte les URL http(s) et data:image', () => {
    expect(isUsablePhotoUrl('https://res.cloudinary.com/x/image/upload/a.jpg')).toBe(true);
    expect(isUsablePhotoUrl('http://x/y.png')).toBe(true);
    expect(isUsablePhotoUrl('data:image/png;base64,AAA')).toBe(true);
    expect(isUsablePhotoUrl('blob:https://app.example/1234-abcd')).toBe(true);
  });
  it('refuse vide, espaces, non-chaîne et schémas dangereux', () => {
    expect(isUsablePhotoUrl('')).toBe(false);
    expect(isUsablePhotoUrl('   ')).toBe(false);
    expect(isUsablePhotoUrl(undefined)).toBe(false);
    expect(isUsablePhotoUrl(null)).toBe(false);
    expect(isUsablePhotoUrl({ url: 'https://x' })).toBe(false);
    expect(isUsablePhotoUrl('javascript:alert(1)')).toBe(false);
  });
});

describe('getAvatarInitials', () => {
  it('prend première et dernière initiales', () => {
    expect(getAvatarInitials('Camille Martin')).toBe('CM');
    expect(getAvatarInitials('  jean  pierre  dupont ')).toBe('JD');
    expect(getAvatarInitials('élodie')).toBe('É');
  });
  it('repli « ? »', () => {
    expect(getAvatarInitials('')).toBe('?');
    expect(getAvatarInitials('   ')).toBe('?');
    expect(getAvatarInitials(undefined)).toBe('?');
  });
});
