export function GlossaryTable({ entries, query }) {
  const q = String(query || '').trim().toLowerCase();
  const rows = q ? entries.filter(e => (e[0] + ' ' + e[1]).toLowerCase().includes(q)) : entries;
  return (
    <section className="manual-section card" id="manual-glossary">
      <div className="card-head"><h3>Glossary</h3></div>
      {rows.length === 0 ? <p className="muted">No glossary terms match.</p> : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Term</th><th>What it means</th></tr></thead>
            <tbody>{rows.map(e => <tr key={e[0]}><td><strong>{e[0]}</strong></td><td>{e[1]}</td></tr>)}</tbody>
          </table>
        </div>
      )}
    </section>
  );
}
