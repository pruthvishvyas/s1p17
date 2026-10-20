import { useData } from '../useData';
import { useContract } from './useContract';
import { metaPath } from '../../utils/contract';

export function useRunLog() {
  const { contract, ready } = useContract();
  const res = useData(metaPath(contract, 'run_log.json'), { enabled: ready });
  const list = Array.isArray(res.data) ? res.data : [];
  return { ...res, last: list.length ? list[list.length - 1] : null, runs: list };
}
