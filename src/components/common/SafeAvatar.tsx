import React, { useEffect, useState } from 'react';
import { getAvatarInitials, isUsablePhotoUrl } from '../../utils/avatar';

interface Props {
  url?: unknown;
  name?: unknown;
  alt?: string;
  /** Texte du repli imposé (sinon initiales calculées depuis `name`). */
  initials?: string;
  /** Classes de l'<img> (taille, arrondi, object-cover…). */
  imgClassName?: string;
  /** Classes du repli (initiales) : taille, couleurs, arrondi. */
  fallbackClassName?: string;
}

/**
 * Photo de profil avec repli propre : initiales si l'URL est absente, invalide
 * ou si l'image ne se charge pas (lien cassé, 404, hors-ligne).
 */
export const SafeAvatar: React.FC<Props> = ({ url, name, initials, alt = '', imgClassName = '', fallbackClassName = '' }) => {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [url]);

  if (isUsablePhotoUrl(url) && !failed) {
    return <img src={url} alt={alt} className={imgClassName} onError={() => setFailed(true)} loading="lazy" referrerPolicy="no-referrer" />;
  }
  return (
    <div className={fallbackClassName} role="img" aria-label={alt || String(name || '')}>
      {initials ?? getAvatarInitials(name)}
    </div>
  );
};

export default SafeAvatar;
