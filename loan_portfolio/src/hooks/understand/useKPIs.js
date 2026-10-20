import { useData } from '../useData';
import { useContract } from '../shared/useContract';
import { resolvePath } from '../../utils/contract';

export function useKPIs() {
  const { contract, ready } = useContract();
  return useData(resolvePath(contract, 'understand', 'kpis'), { enabled: ready });
}
