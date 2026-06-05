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
