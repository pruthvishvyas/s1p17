import { useState, useCallback } from 'react';
import { useData } from '../useData';
import { useContract } from '../shared/useContract';
import { resolvePath } from '../../utils/contract';
import { bandLookup } from '../../utils/bands';

export function useForecast() {
  const { contract, ready } = useContract();
  return useData(resolvePath(contract, 'monitor', 'forecast'), { enabled: ready });
}

// Risk estimator: calls the Worker (/api); falls back to the same lookup locally (e.g. under `npm run dev`).
export function useRiskEstimator(bandRows) {
  const [state, setState] = useState({ loading: false, error: null, result: null });

  const estimate = useCallback(async score => {
    const n = Number(score);
    if (score === '' || score === null || score === undefined || !Number.isFinite(n) || n < 300 || n > 850) {
      setState({ loading: false, error: 'Enter a credit score between 300 and 850.', result: null });
      return;
    }
    setState({ loading: true, error: null, result: null });
    try {
      const res = await fetch('/api', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ input: n }) });
      const text = await res.text();
      let body = null;
      try { body = JSON.parse(text); } catch (e) { body = null; }
      if (res.ok && body && body.prediction !== undefined && body.prediction !== null) {
        setState({ loading: false, error: null, result: { rate: Number(body.prediction), band: body.band || null, source: 'live' } });
        return;
      }
      if (body && body.error && res.status !== 404 && res.status !== 405) throw new Error(body.error);
      throw new Error('fallback');
    } catch (e) {
      const hit = bandLookup(bandRows, n);
      if (hit) {
        setState({ loading: false, error: null, result: { rate: hit.rate, band: hit.band, source: 'local' } });
      } else {
        setState({ loading: false, error: e && e.message && e.message !== 'fallback' ? e.message : 'Risk data is not available yet.', result: null });
      }
    }
  }, [bandRows]);

  return { ...state, estimate };
}
