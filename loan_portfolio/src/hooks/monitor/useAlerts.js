import { useData } from '../useData';
import { useContract } from '../shared/useContract';
import { resolvePath } from '../../utils/contract';

export function useAlerts() {
  const { contract, ready } = useContract();
  return useData(resolvePath(contract, 'monitor', 'alerts'), { enabled: ready });
}
