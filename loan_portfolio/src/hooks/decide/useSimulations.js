import { useData } from '../useData';
import { useContract } from '../shared/useContract';
import { simulationFiles } from '../../utils/contract';

export function useSimulationList() {
  const { contract, ready } = useContract();
  return { urls: simulationFiles(contract), ready };
}

export function useSimulation(url) {
  return useData(url, { enabled: !!url });
}
