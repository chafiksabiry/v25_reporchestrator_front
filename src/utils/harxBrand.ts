/** HARX brand colors extracted from logo-pink.png */
export const HARX_BRAND = {
  orange: '#F7941E',
  red: '#ED1C24',
  magenta: '#9B1A6E',
  magentaDark: '#6B0F4A',
  magentaDeeper: '#4A0A32',
} as const;

/** Horizontal gradient — matches the logo banner (navbar). */
export const HARX_NAVBAR_GRADIENT = `linear-gradient(90deg, ${HARX_BRAND.orange} 0%, ${HARX_BRAND.red} 48%, ${HARX_BRAND.magenta} 100%)`;

/** Vertical gradient — sidebar body below the logo strip. */
export const HARX_SIDEBAR_BODY_GRADIENT = `linear-gradient(180deg, ${HARX_BRAND.magenta} 0%, ${HARX_BRAND.magentaDark} 55%, ${HARX_BRAND.magentaDeeper} 100%)`;

/** Soft drop shadow used under the navbar / logo strip for depth. */
export const HARX_BAR_SHADOW = '0 8px 24px -8px rgba(74, 10, 50, 0.55)';

/** Subtle text shadow to keep white labels crisp over the gradient. */
export const HARX_TEXT_SHADOW = '0 1px 2px rgba(74, 10, 50, 0.45)';
