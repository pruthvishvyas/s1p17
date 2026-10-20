import { useState, useMemo } from 'react';
import { ManualSection } from './ManualSection';
import { GlossaryTable } from './GlossaryTable';
import { useTerminology } from '../shared/TerminologyProvider';
import { useContract } from '../../hooks/shared/useContract';
import { GLOSSARY } from '../../utils/terminology';
import { plural } from '../../utils/formatters';

export function UserManual() {
  const t = useTerminology();
  const { contract } = useContract();
  const [query, setQuery] = useState('');
  const name = (contract && contract.project && contract.project.name) || 'Your dashboard';
  const loans = plural(t.transaction || 'loan').toLowerCase();

  const sections = useMemo(() => [
    {
      id: 'start', title: 'How to use this dashboard',
      intro: 'This dashboard answers three questions, one section at a time. Use the menu on the left.',
      blocks: [
        { h: 'Understand', lines: ['What is happening in my business right now? Look at your numbers, risk groups and unusual ' + loans + '.'] },
        { h: 'Decide', lines: ['What should I do about it? Read the insights, follow the recommendations, test changes in the What-If Simulator and set your targets.'] },
        { h: 'Monitor', lines: ['Am I on track? Check the forecast, your progress against targets and any alerts.'] },
        { h: 'Explore', lines: ['The Interactive Explorer lets you click, filter and drill into the numbers yourself.'] }
      ]
    },
    {
      id: 'numbers', title: 'Your Numbers', badge: 'UNDERSTAND',
      blocks: [
        { h: 'What you see', lines: ['Key figures grouped as Portfolio, Risk, Profitability and Early-Warning Model, then charts that answer a plain question each.'] },
        { h: 'What it means', lines: ['"' + (t.revenue || 'Income') + '" is interest plus fees earned. "Went 90+ days late" is the share of ' + loans + ' that have ever been three months behind. "Non-performing balance" is the money still owed on badly overdue ' + loans + '.'] },
        { h: 'Reading a bar chart', lines: ['Each bar is one group. A taller bar means more. Compare bars side by side.'] },
        { h: 'Reading a line chart', lines: ['The line follows one measure over time. Look for a steady climb (getting worse) or fall (getting better).'] },
        { h: 'What to do', lines: ['If the late-payment share or the non-performing balance is climbing, go to Decide.'] }
      ]
    },
    {
      id: 'segments', title: 'Risk Segments', badge: 'UNDERSTAND',
      blocks: [
        { h: 'What you see', lines: ['Your ' + loans + ' sorted automatically into Low, Medium and High risk groups.'] },
        { h: 'What to do', lines: ['Click a group to see its numbers. Compare how often each group goes late and how much profit it makes.'] }
      ]
    },
    {
      id: 'unusual', title: 'Unusual Loans', badge: 'UNDERSTAND',
      blocks: [
        { h: 'What you see', lines: ['A list of ' + loans + ' whose combination of risk and price is unlike the rest of your book.'] },
        { h: 'What to do', lines: ['Check how those ' + loans + ' were approved. Search or sort the table to find the most unusual ones.'] }
      ]
    },
    {
      id: 'insights', title: 'Insights and Recommendations', badge: 'DECIDE',
      blocks: [
        { h: 'Severity explained', lines: ['🔴 High - needs attention this week.', '🟡 Medium - review this month.', '🟢 Low - good to know.'] },
        { h: 'Each recommendation tells you', lines: ['What to do (the action), why (the evidence), the impact (what changes), and when to act.'] }
      ]
    },
    {
      id: 'simulator', title: 'What-If Simulator', badge: 'DECIDE',
      blocks: [
        { h: 'How it works', lines: ['Pick a policy (minimum credit score, debt-to-income cap or interest rate change) and move the slider. The cards show what your portfolio would have looked like under that rule, compared with today.'] },
        { h: 'Good to know', lines: ['These are back-tests on your own history, not promises about the future.'] }
      ]
    },
    {
      id: 'goals', title: 'Goal Tracker', badge: 'DECIDE',
      blocks: [{ h: 'How it works', lines: ['Type your own targets and alert limits. They are saved in this browser and used in Goal Progress.'] }]
    },
    {
      id: 'monitor', title: 'Forecaster, Goal Progress and Alerts', badge: 'MONITOR',
      blocks: [
        { h: 'Forecaster', lines: ['Shows where new lending is heading, with a shaded likely range, and a quick risk check by credit score.'] },
        { h: 'Goal Progress', lines: ['Compares today\'s actual numbers with your targets: on track or off track.'] },
        { h: 'Alert Center', lines: ['Lists anything outside your limits, with what to do next. The bell at the top shows how many alerts are active.'] }
      ]
    },
    {
      id: 'explorer', title: 'Interactive Explorer', badge: 'EXPLORE',
      blocks: [
        { h: 'Cross-filtering', lines: ['Click a bar and every other chart and number on the page updates to match. Click it again to remove the filter.'] },
        { h: 'Drill-down', lines: ['Clicking a bar or a table row opens a panel on the right with the details for that group.'] },
        { h: 'Copy summary', lines: ['Copies the current filtered numbers so you can paste them into an email or report.'] }
      ]
    }
  ], [t, loans]);

  const q = query.trim().toLowerCase();
  const shown = q ? sections.filter(s => JSON.stringify(s).toLowerCase().includes(q)) : sections;
  const termEntries = [[t.revenue || 'Revenue', 'Money earned from interest and fees.'], [t.customer || 'Customer', 'A person or business that has a loan with you.'],
    [t.product || 'Product', 'A type of lending you offer, such as auto or personal loans.'], [t.transaction || 'Transaction', 'A single loan from approval to repayment.']];
  const glossary = termEntries.concat(GLOSSARY);

  return (
    <div className="manual">
      <div className="manual-toolbar card">
        <div>
          <h2>{name} - Your Analytics Guide</h2>
          <p className="muted">Plain-English help for every tab.</p>
        </div>
        <div className="manual-actions">
          <input className="input" placeholder="Search the manual…" value={query} onChange={e => setQuery(e.target.value)} />
          <button className="btn" onClick={() => window.print()}>🖨 Print</button>
        </div>
      </div>
      {shown.map(s => <ManualSection key={s.id} section={s} query={query} />)}
      <GlossaryTable entries={glossary} query={query} />
      {q && shown.length === 0 && <p className="muted">No sections match your search.</p>}
    </div>
  );
}
