import { useData } from '../useData';
import { useContract } from '../shared/useContract';
import { resolvePath } from '../../utils/contract';

export function useSegments() {
  const { contract, ready } = useContract();
  return useData(resolvePath(contract, 'understand', 'segments'), { enabled: ready });
}
