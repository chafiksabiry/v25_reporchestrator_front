/** Helpers purs pour l'affichage d'une photo de profil avec repli propre. */

/** URL exploitable pour un <img> : http(s), data:image ou blob: (aperçu local) uniquement (pas de javascript:, pas de chaîne vide). */
export function isUsablePhotoUrl(url: unknown): url is string {
  if (typeof url !== 'string') return false;
  const u = url.trim();
  if (!u) return false;
  return /^https?:\/\//i.test(u) || /^data:image\//i.test(u) || /^blob:/i.test(u);
}

/** Initiales (2 max) d'un nom ; « ? » si rien d'exploitable. */
export function getAvatarInitials(name: unknown): string {
  if (typeof name !== 'string') return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = Array.from(parts[0])[0] ?? '';
  const last = parts.length > 1 ? Array.from(parts[parts.length - 1])[0] ?? '' : '';
  return (first + last).toUpperCase() || '?';
}
