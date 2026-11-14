import { useCallback, useEffect, useRef, useState } from 'react';
import { computeFrameHeight } from '../../../utils/profileSectionCompletion';

/**
 * Donne au cadre de l'éditeur la hauteur exacte restante dans la zone de page défilante
 * (le <main> du shell), pour que la page ne défile pas : seul le panneau interne défile.
 * Se recalcule au redimensionnement et quand le contenu au-dessus change de taille.
 */
export default function useViewportFit(minHeight = 300) {
  const ref = useRef(null);
  const [height, setHeight] = useState(null);

  const fit = useCallback(() => {
    const el = ref.current;
    if (!el || typeof window === 'undefined') return;
    const main = el.closest('main');
    const rect = el.getBoundingClientRect();
    const containerBottom = main ? main.getBoundingClientRect().bottom : window.innerHeight;
    const scrollTop = main ? main.scrollTop : 0;
    const wrapper = main && main.firstElementChild;
    const bottomPadding = wrapper ? parseFloat(getComputedStyle(wrapper).paddingBottom) || 0 : 16;
    const next = computeFrameHeight({ frameTop: rect.top, scrollTop, containerBottom, bottomPadding, minHeight });
    setHeight((prev) => (prev === next ? prev : next));
  }, [minHeight]);

  useEffect(() => {
    fit();
    const raf = requestAnimationFrame(fit);
    window.addEventListener('resize', fit);
    const main = ref.current && ref.current.closest('main');
    let ro;
    if (typeof ResizeObserver !== 'undefined' && main) {
      ro = new ResizeObserver(fit);
      ro.observe(main);
      if (main.firstElementChild) ro.observe(main.firstElementChild);
    }
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', fit);
      if (ro) ro.disconnect();
    };
  }, [fit]);

  return { ref, height };
}
