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

/** Call-center staff (employed agents) — slate ops console, not marketplace pink. */
export const CC_STAFF_BRAND = {
  ink: '#0f172a',
  inkSoft: '#1e293b',
  emerald: '#059669',
  emeraldDeep: '#047857',
  teal: '#0f766e',
} as const;

export const CC_STAFF_NAVBAR_BG = `linear-gradient(135deg, ${CC_STAFF_BRAND.ink} 0%, ${CC_STAFF_BRAND.inkSoft} 55%, ${CC_STAFF_BRAND.teal} 160%)`;
export const CC_STAFF_SIDEBAR_BG = `linear-gradient(180deg, ${CC_STAFF_BRAND.ink} 0%, ${CC_STAFF_BRAND.inkSoft} 55%, #134e4a 140%)`;
export const CC_STAFF_BAR_SHADOW = '0 10px 24px -10px rgba(15, 23, 42, 0.55)';
export const CC_STAFF_TEXT_SHADOW = '0 1px 2px rgba(15, 23, 42, 0.45)';
export const CC_STAFF_HOVER_TEXT = CC_STAFF_BRAND.emeraldDeep;

export function getRepShellChrome(isCcStaff: boolean) {
  if (isCcStaff) {
    return {
      navbarBg: CC_STAFF_NAVBAR_BG,
      sidebarBg: CC_STAFF_SIDEBAR_BG,
      barShadow: CC_STAFF_BAR_SHADOW,
      textShadow: CC_STAFF_TEXT_SHADOW,
      hoverAccent: CC_STAFF_HOVER_TEXT,
    };
  }
  return {
    navbarBg: HARX_NAVBAR_BG,
    sidebarBg: HARX_SIDEBAR_BG,
    barShadow: HARX_BAR_SHADOW,
    textShadow: HARX_TEXT_SHADOW,
    hoverAccent: HARX_BRAND.magenta,
  };
}
