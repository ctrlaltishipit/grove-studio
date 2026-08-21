export default function EmptyState({ title, children }) {
  return (
    <div className="empty">
      <p style={{ fontWeight: 600, color: 'var(--ink)' }}>{title}</p>
      {children ? <p className="t-small" style={{ marginTop: 'var(--space-2)' }}>{children}</p> : null}
    </div>
  );
}
