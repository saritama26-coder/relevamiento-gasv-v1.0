import React, { createContext, useContext, useMemo } from 'react';
import { LISTAS_DEFAULT } from '../constants/catalogos';
import { CatalogosMap } from '../types';

interface CatalogContextType {
  listas: CatalogosMap;
  agregar: (items: { listId: string; valor: string }[]) => void;
}

const CatalogContext = createContext<CatalogContextType>({
  listas: LISTAS_DEFAULT,
  agregar: () => {},
});

export const useCatalogos = () => useContext(CatalogContext);

export function CatalogProvider({
  personalizados,
  agregar,
  children,
}: {
  personalizados: CatalogosMap;
  agregar: (items: { listId: string; valor: string }[]) => void;
  children: React.ReactNode;
}) {
  const mergedListas = useMemo(() => {
    const res: CatalogosMap = {};
    const allKeys = new Set([...Object.keys(LISTAS_DEFAULT), ...Object.keys(personalizados || {})]);

    allKeys.forEach((key) => {
      const base = LISTAS_DEFAULT[key] || [];
      const custom = (personalizados?.[key] || []).filter(
        (val) => !base.some((b) => b.toLowerCase() === val.toLowerCase())
      );
      res[key] = [...base, ...custom];
    });

    return res;
  }, [personalizados]);

  return (
    <CatalogContext.Provider value={{ listas: mergedListas, agregar }}>
      {children}
    </CatalogContext.Provider>
  );
}
