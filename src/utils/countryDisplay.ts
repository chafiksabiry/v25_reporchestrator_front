/**
 * Affichage du pays / fuseau horaire d'un profil REP.
 *
 * `personalInfo.country` (et `availability.timeZone`) référencent un document Timezone
 * { _id, countryName, countryCode, zoneName, gmtOffset }. Selon l'API, la valeur arrive :
 *  - peuplée (objet) ;
 *  - sous forme d'identifiant brut (ObjectId, 24 caractères hexadécimaux) ;
 *  - sous forme de code pays ISO (2 ou 3 lettres) ;
 *  - ou sous forme de nom.
 * Règle : on n'affiche JAMAIS un identifiant brut. Si rien n'est résolu, on renvoie ''
 * et l'appelant affiche « Non renseigné » (ou masque le champ).
 */

export interface GeoRef {
  _id?: string;
  countryName?: string;
  countryCode?: string;
  zoneName?: string;
  gmtOffset?: number;
}

const OBJECT_ID = /^[a-f0-9]{24}$/i;
const ISO_ALPHA = /^[A-Za-z]{2,3}$/;

/** Vrai si la chaîne est un identifiant brut (ObjectId) à ne jamais montrer. */
export const isRawId = (value: unknown): boolean =>
  typeof value === 'string' && OBJECT_ID.test(value.trim());

const cleanString = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  const v = value.trim();
  return v && !isRawId(v) ? v : '';
};

const uiLang = (lang?: string): string => ((lang || 'en').slice(0, 2).toLowerCase() === 'fr' ? 'fr' : 'en');

/** Nom du pays d'après un code ISO alpha-2 (langue de l'interface), '' si inconnu. */
export const countryNameFromIso = (code: unknown, lang?: string): string => {
  if (typeof code !== 'string' || !/^[A-Za-z]{2}$/.test(code.trim())) return '';
  const upper = code.trim().toUpperCase();
  try {
    const name = new Intl.DisplayNames([uiLang(lang)], { type: 'region' }).of(upper);
    return name && name !== upper ? name : '';
  } catch {
    return '';
  }
};

const findById = (id: string, list: GeoRef[]): GeoRef | undefined =>
  list.find((c) => c && String(c._id || '') === id.trim());

const findByCode = (code: string, list: GeoRef[]): GeoRef | undefined =>
  list.find((c) => c && String(c.countryCode || '').toLowerCase() === code.trim().toLowerCase());

/**
 * Retrouve le document pays/fuseau (avec countryCode) si possible, sinon null.
 * `list` = la liste déjà chargée pour le sélecteur de pays (getTimezones).
 */
export const resolveGeoRef = (value: unknown, list: GeoRef[] = []): GeoRef | null => {
  if (!value) return null;
  if (typeof value === 'object') {
    const obj = value as GeoRef;
    if (cleanString(obj.countryName) || cleanString(obj.countryCode)) return obj;
    if (obj._id) return findById(String(obj._id), list) || null;
    return null;
  }
  if (typeof value === 'string') {
    const v = value.trim();
    if (!v) return null;
    if (isRawId(v)) return findById(v, list) || null;
    if (ISO_ALPHA.test(v)) return findByCode(v, list) || { countryCode: v.toUpperCase() };
    return { countryName: v };
  }
  return null;
};

/** Nom du pays à afficher, '' si introuvable (jamais l'identifiant brut). */
export const resolveCountryName = (value: unknown, list: GeoRef[] = [], lang?: string): string => {
  const ref = resolveGeoRef(value, list);
  if (!ref) return '';
  const name = cleanString(ref.countryName);
  if (name) return name;
  return countryNameFromIso(ref.countryCode, lang);
};

/** « Nom (CC) » si le code est connu, sinon « Nom », sinon ''. */
export const formatCountryLabel = (value: unknown, list: GeoRef[] = [], lang?: string): string => {
  const ref = resolveGeoRef(value, list);
  const name = resolveCountryName(value, list, lang);
  if (!name) return '';
  const code = cleanString(ref?.countryCode);
  return code ? `${name} (${code})` : name;
};

/** Code pays d'un pays (objet, id ou code), '' si inconnu. */
export const resolveCountryCode = (value: unknown, list: GeoRef[] = []): string =>
  cleanString(resolveGeoRef(value, list)?.countryCode);

/** « Pays - Fuseau » pour un fuseau (objet ou id), '' si introuvable. */
export const resolveTimezoneLabel = (value: unknown, list: GeoRef[] = [], lang?: string): string => {
  if (!value) return '';
  const ref =
    typeof value === 'object'
      ? (value as GeoRef)
      : typeof value === 'string' && isRawId(value)
        ? findById(value, list)
        : undefined;
  if (!ref) return '';
  const zone = cleanString(ref.zoneName);
  if (!zone) return '';
  const country = resolveCountryName(ref, list, lang);
  return country ? `${country} - ${zone}` : zone;
};
