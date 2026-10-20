import { createContext, useContext, useState, useEffect, useCallback } from 'react';

export const OUTCOMES = {
  UNDERSTAND: { label: 'Understand', question: 'What is happening in my business?' },
  DECIDE: { label: 'Decide', question: 'What should I do about it?' },
  MONITOR: { label: 'Monitor', question: 'Am I on track?' },
  EXPLORE: { label: 'Explore', question: 'Dig deeper into the numbers' },
  HELP: { label: 'Help', question: 'How to use this dashboard' }
};

export const TABS = [
  { id: 'overview', outcome: 'UNDERSTAND', label: 'Your Numbers', icon: '📈', subtitle: 'Key figures and charts for the whole portfolio' },
  { id: 'segments', outcome: 'UNDERSTAND', label: 'Risk Segments', icon: '🧩', subtitle: 'Your borrowers grouped by how risky they are' },
  { id: 'anomalies', outcome: 'UNDERSTAND', label: 'Unusual Loans', icon: '🔎', subtitle: 'Loans that do not look like the rest of your book' },
  { id: 'insights', outcome: 'DECIDE', label: 'Insights', icon: '💡', subtitle: 'What the data says, ranked by urgency' },
  { id: 'recommendations', outcome: 'DECIDE', label: 'Recommendations', icon: '✅', subtitle: 'What to do, how many loans, and by when' },
  { id: 'simulator', outcome: 'DECIDE', label: 'What-If Simulator', icon: '🎛️', subtitle: 'Test a policy change before you make it' },
  { id: 'goals', outcome: 'DECIDE', label: 'Goal Tracker', icon: '🎯', subtitle: 'Set your targets and alert limits' },
  { id: 'forecast', outcome: 'MONITOR', label: 'Forecaster', icon: '🔮', subtitle: 'Where new lending is heading and risk by credit score' },
  { id: 'progress', outcome: 'MONITOR', label: 'Goal Progress', icon: '🧭', subtitle: 'How you are doing against your targets' },
  { id: 'alerts', outcome: 'MONITOR', label: 'Alert Center', icon: '🔔', subtitle: 'Things that need your attention right now' },
  { id: 'explorer', outcome: 'EXPLORE', label: 'Interactive Explorer', icon: '🧭', subtitle: 'Click, filter and drill into your data' },
  { id: 'manual', outcome: 'HELP', label: 'User Manual', icon: '📖', subtitle: 'Plain-English guide to every tab' }
];

const OutcomeContext = createContext({ active: 'overview', setActive: () => {}, tab: TABS[0] });

function fromHash() {
  try {
    const h = String(window.location.hash || '').replace('#', '');
    return TABS.some(t => t.id === h) ? h : TABS[0].id;
  } catch (e) {
    return TABS[0].id;
  }
}

export function OutcomeProvider({ children }) {
  const [active, setActiveState] = useState(fromHash);
  const setActive = useCallback(id => {
    setActiveState(id);
    try { window.location.hash = id; } catch (e) { /* ignore */ }
    try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e) { /* ignore */ }
  }, []);
  useEffect(() => {
    const h = () => setActiveState(fromHash());
    window.addEventListener('hashchange', h);
    return () => window.removeEventListener('hashchange', h);
  }, []);
  const tab = TABS.find(t => t.id === active) || TABS[0];
  return <OutcomeContext.Provider value={{ active, setActive, tab }}>{children}</OutcomeContext.Provider>;
}

export function useOutcome() {
  return useContext(OutcomeContext);
}
