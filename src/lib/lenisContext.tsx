import React, { createContext, useContext, useEffect, useState } from 'react';
import Lenis from 'lenis';

const LenisContext = createContext<Lenis | null>(null);

export const LenisProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lenisInstance, setLenisInstance] = useState<Lenis | null>(null);

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      syncTouch: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.8,
      autoRaf: true,
      anchors: false,
      respectReducedMotion: true,
    });

    setLenisInstance(lenis);

    return () => {
      lenis.destroy();
      setLenisInstance(null);
    };
  }, []);

  return (
    <LenisContext.Provider value={lenisInstance}>
      {children}
    </LenisContext.Provider>
  );
};

export function useLenisInstance(): Lenis | null {
  return useContext(LenisContext);
}
