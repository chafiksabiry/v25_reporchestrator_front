/** HARX brand colors — vivid, matching logo-pink.png */
export const HARX_BRAND = {
  orange: '#F7941E',
  red: '#ED1C24',
  magenta: '#E6188D',
  magentaDeep: '#C2186F',
  magentaDarker: '#8A1250',
} as const;

/**
 * Top→bottom vertical gradient used across navbar + sidebar so the whole
 * frame flows as one continuous brand gradient (orange at the top, magenta
 * at the bottom), matching the logo colors.
 */
export const HARX_NAVBAR_GRADIENT = `linear-gradient(180deg, ${HARX_BRAND.orange} 0%, ${HARX_BRAND.red} 60%, ${HARX_BRAND.magenta} 100%)`;

/** Sidebar body continues the same vertical flow below the logo strip. */
export const HARX_SIDEBAR_BODY_GRADIENT = `linear-gradient(180deg, ${HARX_BRAND.red} 0%, ${HARX_BRAND.magenta} 45%, ${HARX_BRAND.magentaDeep} 75%, ${HARX_BRAND.magentaDarker} 100%)`;

/** Soft drop shadow used under the navbar / logo strip for depth. */
export const HARX_BAR_SHADOW = '0 10px 24px -10px rgba(138, 18, 80, 0.6)';

/** Subtle text shadow to keep white labels crisp over the gradient. */
export const HARX_TEXT_SHADOW = '0 1px 2px rgba(122, 14, 80, 0.4)';
