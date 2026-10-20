export function EmptyState({ message, action }) {
  return (
    <div className="empty-state">
      <span className="empty-icon">📊</span>
      <p className="empty-message">{message}</p>
      {action && <p className="empty-action">{action}</p>}
    </div>
  );
}

export const FIX_ACTION = 'Run main.py, then python export_for_frontend.py, then python generate_react_frontend.py and redeploy.';
