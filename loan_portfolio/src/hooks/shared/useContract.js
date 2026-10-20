import { useState, useEffect } from 'react';
import { DEFAULT_CONTRACT } from '../../utils/contract';

let cache = null;
let promise = null;

function loadContract() {
  if (!promise) {
    promise = fetch('/data/meta/contract.json', { cache: 'no-cache' })
      .then(r => (r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status))))
      .then(c => { cache = (c && typeof c === 'object') ? c : DEFAULT_CONTRACT; return cache; })
      .catch(e => { console.warn('contract.json unavailable, using defaults:', e.message); cache = DEFAULT_CONTRACT; return cache; });
  }
  return promise;
}

export function useContract() {
  const [contract, setContract] = useState(cache);
  useEffect(() => {
    if (cache) { setContract(cache); return undefined; }
    let live = true;
    loadContract().then(c => { if (live) setContract(c); });
    return () => { live = false; };
  }, []);
  return { contract: contract || DEFAULT_CONTRACT, ready: !!contract };
}
