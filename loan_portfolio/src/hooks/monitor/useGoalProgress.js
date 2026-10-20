import { useData } from '../useData';
import { useContract } from '../shared/useContract';
import { resolvePath } from '../../utils/contract';

export function useGoalProgress() {
  const { contract, ready } = useContract();
  return useData(resolvePath(contract, 'monitor', 'goal_progress'), { enabled: ready });
}
