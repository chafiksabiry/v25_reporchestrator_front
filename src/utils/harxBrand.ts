/** HARX brand colors — vivid, matching logo-pink.png */
export const HARX_BRAND = {
  orange: '#F7941E',
  red: '#ED1C24',
  magenta: '#E6188D',
  magentaDeep: '#C2186F',
  magentaDarker: '#8A1250',
} as const;

/**
 * Navbar gradient. The sidebar logo banner runs orange→magenta (left→right),
 * so the navbar starts on magenta at its left edge to butt seamlessly against
 * the logo strip, then flows back out to vivid orange on the right.
 */
export const HARX_NAVBAR_GRADIENT = `linear-gradient(90deg, ${HARX_BRAND.magenta} 0%, ${HARX_BRAND.red} 55%, ${HARX_BRAND.orange} 100%)`;

/** Vertical gradient — sidebar body below the logo strip (vivid magenta). */
export const HARX_SIDEBAR_BODY_GRADIENT = `linear-gradient(180deg, ${HARX_BRAND.magenta} 0%, ${HARX_BRAND.magentaDeep} 55%, ${HARX_BRAND.magentaDarker} 100%)`;

/** Soft drop shadow used under the navbar / logo strip for depth. */
export const HARX_BAR_SHADOW = '0 10px 24px -10px rgba(138, 18, 80, 0.6)';

/** Subtle text shadow to keep white labels crisp over the gradient. */
export const HARX_TEXT_SHADOW = '0 1px 2px rgba(122, 14, 80, 0.4)';
