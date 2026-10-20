import { useState, useEffect } from 'react';
import { TerminologyProvider } from './components/shared/TerminologyProvider';
import { OutcomeProvider } from './context/OutcomeContext';
import { ExplorerProvider } from './context/ExplorerContext';
import { useContract } from './hooks/shared/useContract';
import { Sidebar } from './components/shared/Sidebar';
import { Header } from './components/shared/Header';
import { ErrorBoundary } from './components/shared/ErrorBoundary';
import Dashboard from './pages/Dashboard';

function Shell() {
  const [open, setOpen] = useState(false);
  const { contract } = useContract();
  useEffect(() => {
    document.title = (contract && contract.project && contract.project.name) || 'Analytics';
  }, [contract]);
  return (
    <div className={'app-shell' + (open ? ' nav-open' : '')}>
      <Sidebar onNavigate={() => setOpen(false)} />
      {open && <div className="nav-scrim" onClick={() => setOpen(false)} />}
      <div className="app-main">
        <Header onMenu={() => setOpen(o => !o)} />
        <main className="app-content">
          <ErrorBoundary label="dashboard">
            <Dashboard />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ExplorerProvider>
      <TerminologyProvider>
        <OutcomeProvider>
          <Shell />
        </OutcomeProvider>
      </TerminologyProvider>
    </ExplorerProvider>
  );
}
