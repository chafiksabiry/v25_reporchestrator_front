import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

export type RepTrainingNavSlide = { title: string; globalIndex: number; slideId: string };
export type RepTrainingNavModule = {
  title: string;
  sections: string[];
  slides: RepTrainingNavSlide[];
};

type RepTrainingNavContextValue = {
  trainingModules: RepTrainingNavModule[];
  activeTrainingModuleIndex: number;
  activeTrainingSlideIndex: number;
  setTrainingNav: (patch: {
    trainingModules?: RepTrainingNavModule[];
    activeTrainingModuleIndex?: number;
    activeTrainingSlideIndex?: number;
  }) => void;
  clearTrainingNav: () => void;
};

const RepTrainingNavContext = createContext<RepTrainingNavContextValue | null>(null);

export function RepTrainingNavProvider({ children }: { children: React.ReactNode }) {
  const [trainingModules, setTrainingModules] = useState<RepTrainingNavModule[]>([]);
  const [activeTrainingModuleIndex, setActiveTrainingModuleIndex] = useState(0);
  const [activeTrainingSlideIndex, setActiveTrainingSlideIndex] = useState(0);

  const setTrainingNav = useCallback((patch: Parameters<RepTrainingNavContextValue['setTrainingNav']>[0]) => {
    if (patch.trainingModules !== undefined) setTrainingModules(patch.trainingModules);
    if (patch.activeTrainingModuleIndex !== undefined) {
      setActiveTrainingModuleIndex(patch.activeTrainingModuleIndex);
    }
    if (patch.activeTrainingSlideIndex !== undefined) {
      setActiveTrainingSlideIndex(patch.activeTrainingSlideIndex);
    }
  }, []);

  const clearTrainingNav = useCallback(() => {
    setTrainingModules([]);
    setActiveTrainingModuleIndex(0);
    setActiveTrainingSlideIndex(0);
  }, []);

  const value = useMemo(
    () => ({
      trainingModules,
      activeTrainingModuleIndex,
      activeTrainingSlideIndex,
      setTrainingNav,
      clearTrainingNav
    }),
    [trainingModules, activeTrainingModuleIndex, activeTrainingSlideIndex, setTrainingNav, clearTrainingNav]
  );

  return <RepTrainingNavContext.Provider value={value}>{children}</RepTrainingNavContext.Provider>;
}

export function useRepTrainingNav(): RepTrainingNavContextValue {
  const ctx = useContext(RepTrainingNavContext);
  if (!ctx) {
    return {
      trainingModules: [],
      activeTrainingModuleIndex: 0,
      activeTrainingSlideIndex: 0,
      setTrainingNav: () => {},
      clearTrainingNav: () => {}
    };
  }
  return ctx;
}
