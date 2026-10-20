import { useMemo, useContext, useCallback } from 'react';
import { TerminologyContext } from '../../context/TerminologyContext';
import { useContract } from '../../hooks/shared/useContract';
import { useData } from '../../hooks/useData';
import { metaPath } from '../../utils/contract';

export function TerminologyProvider({ children }) {
  const { contract, ready } = useContract();
  const { data } = useData(metaPath(contract, 'terminology.json'), { enabled: ready });
  const value = useMemo(() => {
    const base = (contract && contract.terminology) || {};
    const extra = data && typeof data === 'object' && !Array.isArray(data) ? data : {};
    return { ...base, ...extra };
  }, [contract, data]);
  return <TerminologyContext.Provider value={value}>{children}</TerminologyContext.Provider>;
}

export function useTerminology() {
  return useContext(TerminologyContext);
}

export function useTerm() {
  const t = useContext(TerminologyContext);
  return useCallback(key => (t && t[key]) || key, [t]);
}
