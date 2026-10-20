import { createContext, useState, useCallback } from 'react';

export const ExplorerContext = createContext({
  filters: {},
  setFilter: () => {},
  clearFilters: () => {},
  activeFilters: 0
});

export function ExplorerProvider({ children }) {
  const [filters, setFilters] = useState({});

  const setFilter = useCallback((dimension, value) => {
    setFilters(prev => {
      const next = { ...prev };
      if (value === null || value === undefined || value === '' || prev[dimension] === value) {
        delete next[dimension];
      } else {
        next[dimension] = value;
      }
      return next;
    });
  }, []);

  const clearFilters = useCallback(() => setFilters({}), []);
  const activeFilters = Object.keys(filters).length;

  return (
    <ExplorerContext.Provider value={{ filters, setFilter, clearFilters, activeFilters }}>
      {children}
    </ExplorerContext.Provider>
  );
}
