/** HARX brand colors — vivid, matching logo-pink.png */
export const HARX_BRAND = {
  orange: '#F7941E',
  red: '#ED1C24',
  magenta: '#E6188D',
  magentaDeep: '#C2186F',
  magentaDarker: '#8A1250',
} as const;

/**
 * Diagonal red→magenta gradient matching the "Import my CV" CTA button.
 * Used for accents (active menu items, badges) over the bars.
 */
export const HARX_BUTTON_GRADIENT = 'linear-gradient(135deg, #F9484A 0%, #E6188D 100%)';

/** Base red used as the gradients' anchor color. */
const RED = '#ED1C24';

/**
 * Navbar background — vivid diagonal HARX gradient: red → magenta.
 * (red on the left flowing into magenta on the right.)
 */
export const HARX_NAVBAR_BG = `linear-gradient(135deg, ${RED} 0%, ${HARX_BRAND.magenta} 100%)`;

/** Sidebar background — vivid vertical flow: red → magenta. */
export const HARX_SIDEBAR_BG = `linear-gradient(180deg, ${RED} 0%, ${HARX_BRAND.magenta} 100%)`;

/** Sidebar body continues the same vivid vertical flow below the logo strip. */
export const HARX_SIDEBAR_BODY_GRADIENT = `linear-gradient(180deg, ${RED} 0%, ${HARX_BRAND.magenta} 60%, ${HARX_BRAND.magentaDeep} 100%)`;

/** Soft drop shadow used under the navbar / logo strip for depth. */
export const HARX_BAR_SHADOW = '0 10px 24px -10px rgba(230, 24, 141, 0.55)';

/** Subtle text shadow to keep white labels crisp over the gradient. */
export const HARX_TEXT_SHADOW = '0 1px 2px rgba(122, 14, 80, 0.4)';
