import { useState, useEffect, useRef } from 'react';

function parseJSON(text, path) {
  try {
    return JSON.parse(text);
  } catch (e1) {
    try {
      return JSON.parse(text.replace(/\bNaN\b/g, 'null').replace(/-?\bInfinity\b/g, 'null'));
    } catch (e2) {
      throw new Error('Invalid JSON at ' + path);
    }
  }
}

function validateShape(data, path) {
  if (data === null || data === undefined) throw new Error('Empty response from ' + path);
  if (typeof data !== 'object') throw new Error('Expected object or array from ' + path + ', got ' + typeof data);
  return data;
}

// The ONLY place that fetches data. Every hook uses this.
export function useData(path, options = {}) {
  const { transform, fallback = null, deps = [], enabled = true } = options;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);

  useEffect(() => {
    if (!enabled || !path) {
      setLoading(!!enabled && !path ? false : true);
      return undefined;
    }
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(null);

    fetch(path, { signal: controller.signal, cache: 'no-cache' })
      .then(async res => {
        if (!res.ok) throw new Error('HTTP ' + res.status + ' loading ' + path);
        const text = await res.text();
        if (!text || text.trim() === '') throw new Error('Empty file at ' + path);
        const validated = validateShape(parseJSON(text, path), path);
        return transform ? transform(validated) : validated;
      })
      .then(result => {
        if (!controller.signal.aborted) {
          setData(result);
          setLoading(false);
        }
      })
      .catch(err => {
        if (err && err.name === 'AbortError') return;
        console.error('useData error [' + path + ']:', err && err.message);
        if (!controller.signal.aborted) {
          setData(fallback);
          setError((err && err.message) || 'Unknown error');
          setLoading(false);
        }
      });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, enabled, ...deps]);

  return { data, loading, error };
}
