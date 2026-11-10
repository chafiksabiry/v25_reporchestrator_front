import { describe, expect, it } from 'vitest';
import { buildInviteLink, inviteLang } from './inviteLink';

describe("liens d'invitation", () => {
  it('REP : page d’inscription REP dans la langue, avec suivi et parrain', () => {
    expect(buildInviteLink({ origin: 'https://harx.ai', language: 'fr-FR', audience: 'rep', ref: 'abc123' }))
      .toBe('https://harx.ai/fr/auth/register-rep?utm_source=share&utm_medium=invite&utm_campaign=rep_invite&ref=abc123');
  });
  it('entreprise : page d’inscription entreprise, sans parrain si absent', () => {
    expect(buildInviteLink({ origin: 'https://harx.ai/', language: 'es', audience: 'company' }))
      .toBe('https://harx.ai/es/auth/register-company?utm_source=share&utm_medium=invite&utm_campaign=company_invite');
  });
  it('langue non prise en charge : anglais', () => {
    expect(inviteLang('de')).toBe('en');
    expect(inviteLang(undefined)).toBe('en');
    expect(inviteLang('AR')).toBe('ar');
  });
});
