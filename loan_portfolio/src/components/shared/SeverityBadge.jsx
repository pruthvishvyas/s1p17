const MAP = {
  HIGH: { icon: '🔴', cls: 'high', text: 'High' },
  MEDIUM: { icon: '🟡', cls: 'medium', text: 'Medium' },
  LOW: { icon: '🟢', cls: 'low', text: 'Low' }
};

export function SeverityBadge({ severity }) {
  const m = MAP[String(severity || '').toUpperCase()] || MAP.LOW;
  return <span className={'badge badge-' + m.cls}>{m.icon} {m.text}</span>;
}
