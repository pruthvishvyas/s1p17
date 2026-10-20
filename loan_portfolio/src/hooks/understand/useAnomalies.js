import { useData } from '../useData';
import { useContract } from '../shared/useContract';
import { resolvePath } from '../../utils/contract';

export function useAnomalies() {
  const { contract, ready } = useContract();
  return useData(resolvePath(contract, 'understand', 'anomalies'), { enabled: ready });
}
