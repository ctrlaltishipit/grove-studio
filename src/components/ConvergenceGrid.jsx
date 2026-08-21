// Themes down, observers across. Makes corroboration legible in two seconds.
// It shows WHETHER an observer contributed to a theme — never WHAT they wrote.
export default function ConvergenceGrid({ findings, roster, contributorsFor }) {
  if (!findings.length || !roster.length) return null;

  return (
    <div className="card">
      <div className="rq__label" style={{ marginBottom: 'var(--space-3)' }}>Convergence grid</div>
      <div className="grid-wrap">
        <table className="cgrid">
          <thead>
            <tr>
              <th className="theme-cell">Theme</th>
              {roster.map((p) => (
                <th key={p.participant_id} className="cell" scope="col">
                  <span title={p.display_name}>{(p.display_name ?? '').split(/\s+/)[0]}</span>
                </th>
              ))}
              <th className="cell" scope="col">Count</th>
            </tr>
          </thead>
          <tbody>
            {findings.map((f) => {
              const ids = new Set(contributorsFor(f).map((p) => p.participant_id));
              return (
                <tr key={f.id}>
                  <td className="theme-cell">{f.theme}</td>
                  {roster.map((p) => (
                    <td key={p.participant_id} className="cell">
                      <span className={ids.has(p.participant_id) ? 'dot' : 'dot dot--off'} />
                      <span className="sr-only">
                        {ids.has(p.participant_id) ? 'contributed' : 'did not contribute'}
                      </span>
                    </td>
                  ))}
                  <td className="cell t-num" style={{ fontWeight: 700 }}>{f.observer_count}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="t-small t-faint" style={{ marginTop: 'var(--space-3)' }}>
        A filled dot means that observer wrote something that supports the theme. It does not
        show what they wrote.
      </p>
    </div>
  );
}
