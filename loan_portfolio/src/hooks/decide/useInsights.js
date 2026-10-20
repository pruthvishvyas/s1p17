import { useData } from '../useData';
import { useContract } from '../shared/useContract';
import { resolvePath } from '../../utils/contract';

export function useInsights() {
  const { contract, ready } = useContract();
  return useData(resolvePath(contract, 'decide', 'insights'), { enabled: ready });
}
