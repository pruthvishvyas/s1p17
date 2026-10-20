import { useState, useEffect } from 'react';
import { useData } from '../useData';
import { useContract } from '../shared/useContract';
import { resolvePath } from '../../utils/contract';

const KEY = 'goal_overrides';

function readOverrides() {
  try {
    const o = JSON.parse(localStorage.getItem(KEY) || '{}');
    return o && typeof o === 'object' ? o : {};
  } catch (e) {
    return {};
  }
}

export function saveOverrides(o) {
  try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) { /* ignore */ }
  try { window.dispatchEvent(new Event('goal-overrides-changed')); } catch (e) { /* ignore */ }
}

export function useGoalOverrides() {
  const [o, setO] = useState(readOverrides);
  useEffect(() => {
    const h = () => setO(readOverrides());
    window.addEventListener('goal-overrides-changed', h);
    return () => window.removeEventListener('goal-overrides-changed', h);
  }, []);
  return o;
}

export function useGoals() {
  const { contract, ready } = useContract();
  return useData(resolvePath(contract, 'decide', 'goals'), { enabled: ready });
}
