function highlight(text, q) {
  if (!q) return text;
  const i = String(text).toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return text;
  return (
    <>
      {text.slice(0, i)}<mark>{text.slice(i, i + q.length)}</mark>{text.slice(i + q.length)}
    </>
  );
}

export function ManualSection({ section, query }) {
  return (
    <section className="manual-section card" id={'manual-' + section.id}>
      <div className="card-head">
        <h3>{highlight(section.title, query)}</h3>
        {section.badge && <span className={'outcome-pill outcome-' + section.badge.toLowerCase()}>{section.badge}</span>}
      </div>
      {section.intro && <p>{highlight(section.intro, query)}</p>}
      {(section.blocks || []).map((b, i) => (
        <div key={i} className="manual-block">
          <h4>{highlight(b.h, query)}</h4>
          {b.lines.map((l, j) => <p key={j}>{highlight(l, query)}</p>)}
        </div>
      ))}
    </section>
  );
}
