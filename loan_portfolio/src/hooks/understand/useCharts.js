import { useData } from '../useData';
import { useContract } from '../shared/useContract';
import { resolvePath, chartUrl } from '../../utils/contract';

export function useChartIndex() {
  const { contract, ready } = useContract();
  return useData(resolvePath(contract, 'understand', 'charts'), { enabled: ready });
}

export function useChart(id) {
  const { contract, ready } = useContract();
  return useData(id ? chartUrl(contract, id) : null, { enabled: ready && !!id });
}
