import { describe, expect, it } from 'vitest';
import {
  countryNameFromIso,
  formatCountryLabel,
  isRawId,
  resolveCountryCode,
  resolveCountryName,
  resolveTimezoneLabel,
} from './countryDisplay';

const ID_FR = '6989ccbda30fa8d236791fc1';
const ID_UNKNOWN = '000000000000000000000abc';
const list = [
  { _id: ID_FR, countryName: 'France', countryCode: 'FR', zoneName: 'Europe/Paris', gmtOffset: 3600 },
  { _id: '111111111111111111111111', countryName: 'Morocco', countryCode: 'MA', zoneName: 'Africa/Casablanca', gmtOffset: 3600 },
];

describe('résolution du pays', () => {
  it('objet peuplé : nom du pays', () => {
    expect(resolveCountryName({ countryName: 'France', countryCode: 'FR' }, [], 'fr')).toBe('France');
    expect(formatCountryLabel({ countryName: 'France', countryCode: 'FR' })).toBe('France (FR)');
  });

  it('code ISO : nom dans la langue de l’interface', () => {
    expect(countryNameFromIso('FR', 'fr')).toBe('France');
    expect(countryNameFromIso('us', 'fr')).toBe('États-Unis');
    expect(countryNameFromIso('US', 'en')).toBe('United States');
    expect(resolveCountryName('MA', [], 'en')).toBe('Morocco');
  });

  it('ObjectId connu : retrouvé par _id dans la liste déjà chargée', () => {
    expect(resolveCountryName(ID_FR, list, 'fr')).toBe('France');
    expect(formatCountryLabel(ID_FR, list, 'fr')).toBe('France (FR)');
    expect(resolveCountryCode(ID_FR, list)).toBe('FR');
  });

  it('ObjectId inconnu : jamais l’identifiant brut', () => {
    expect(resolveCountryName(ID_UNKNOWN, list, 'fr')).toBe('');
    expect(resolveCountryName(ID_FR, [], 'fr')).toBe('');
    expect(formatCountryLabel(ID_FR, [], 'fr')).toBe('');
    expect(resolveCountryName({ _id: ID_FR }, [], 'fr')).toBe('');
  });

  it('objet dont le nom est lui-même un identifiant : ignoré', () => {
    expect(resolveCountryName({ countryName: ID_FR }, [], 'fr')).toBe('');
  });

  it('vide / null / indéfini : chaîne vide', () => {
    expect(resolveCountryName(null, list)).toBe('');
    expect(resolveCountryName(undefined, list)).toBe('');
    expect(resolveCountryName('', list)).toBe('');
    expect(resolveCountryName('   ', list)).toBe('');
    expect(resolveCountryName({}, list)).toBe('');
  });

  it('nom en clair : conservé ; isRawId', () => {
    expect(resolveCountryName('France', list)).toBe('France');
    expect(isRawId(ID_FR)).toBe(true);
    expect(isRawId('France')).toBe(false);
  });
});

describe('fuseau horaire', () => {
  it('objet ou identifiant → « Pays - Fuseau »', () => {
    expect(resolveTimezoneLabel(list[0], list, 'fr')).toBe('France - Europe/Paris');
    expect(resolveTimezoneLabel(ID_FR, list, 'fr')).toBe('France - Europe/Paris');
  });
  it('introuvable ou vide : chaîne vide, jamais l’identifiant', () => {
    expect(resolveTimezoneLabel(ID_UNKNOWN, list)).toBe('');
    expect(resolveTimezoneLabel(null, list)).toBe('');
    expect(resolveTimezoneLabel(ID_FR, [])).toBe('');
  });
});
