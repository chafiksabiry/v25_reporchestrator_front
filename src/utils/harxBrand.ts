/** HARX brand colors — vivid, matching logo-pink.png */
export const HARX_BRAND = {
  orange: '#F7941E',
  red: '#ED1C24',
  magenta: '#E6188D',
  magentaDeep: '#C2186F',
  magentaDarker: '#8A1250',
} as const;

/**
 * Diagonal red→pink gradient matching the "Import my CV" CTA button.
 * Used as one unified background across navbar + sidebar.
 */
export const HARX_NAVBAR_GRADIENT = 'linear-gradient(135deg, #F9484A 0%, #E6188D 100%)';

/** Sidebar body continues the same vertical flow below the logo strip. */
export const HARX_SIDEBAR_BODY_GRADIENT = `linear-gradient(180deg, ${HARX_BRAND.red} 0%, ${HARX_BRAND.magenta} 45%, ${HARX_BRAND.magentaDeep} 75%, ${HARX_BRAND.magentaDarker} 100%)`;

/** Soft drop shadow used under the navbar / logo strip for depth. */
export const HARX_BAR_SHADOW = '0 10px 24px -10px rgba(138, 18, 80, 0.6)';

/** Subtle text shadow to keep white labels crisp over the gradient. */
export const HARX_TEXT_SHADOW = '0 1px 2px rgba(122, 14, 80, 0.4)';
