"use client";

import React, { createContext, useContext, useState, useCallback } from 'react';

interface SelectorContextType {
  activeSelector: string | null;
  setActiveSelector: (id: string | null) => void;
}

export const SelectorContext = createContext<SelectorContextType | undefined>(undefined);

export function SelectorProvider({ children }: { children: React.ReactNode }) {
  const [activeSelector, setActiveSelector] = useState<string | null>(null);

  const handleSetActiveSelector = useCallback((id: string | null) => {
    setActiveSelector(id);
  }, []);

  return (
    <SelectorContext.Provider value={{ activeSelector, setActiveSelector: handleSetActiveSelector }}>
      {children}
    </SelectorContext.Provider>
  );
}

export function useSelector() {
  const context = useContext(SelectorContext);
  if (!context) {
    throw new Error('useSelector must be used within a SelectorProvider');
  }
  return context;
}