// Dev-only preview of the A16 workspace. Not routed in production.
// The three panes with fixture data, so the layout can be reviewed at any
// width without an account, a space, or a network.
import { AppShell } from '../../ds/AppShell';
import { Chip } from '../../ds/Chip';
import { StudioPanel } from '../../ds/StudioPanel';

const NOTES = [
  { id: '1', title: 'Insurance step', who: 'Priya R.', c: 0, when: '2 min ago', on: true },
  { id: '2', title: 'Wait times came up twice', who: 'Nikhil S.', c: 2, when: '18 min ago', on: false },
  { id: '3', title: 'She re-read the copy', who: 'Arjun M.', c: 1, when: '1h ago', on: false },
];

export function DevWorkspace() {
  return (
    <AppShell
      spaces={[{ id: 'a', name: 'Clinic booking', shared_notes: 8 }, { id: 'b', name: 'Project 1', shared_notes: 1 }]}
      activeSpaceId="a"
    >
      <div className="pagehead">
        <div className="pagehead__title">
          <h1 className="t-h1">Clinic booking</h1>
          <div className="row" style={{ marginTop: 'var(--space-3)', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            <Chip name="Priya R." colourIndex={0} small self />
            <Chip name="Arjun M." colourIndex={1} small />
            <Chip name="Nikhil S." colourIndex={2} small />
            <span className="t-label muted" style={{ marginLeft: 'var(--space-1)' }}>3 members</span>
          </div>
        </div>
        <span className="codechip">
          <span className="t-tracked muted">Code</span>
          <span className="codechip__value">GRVDEM</span>
        </span>
      </div>

      <div className="wsp" style={{ marginTop: 'var(--space-8)' }}>
        <section className="pane pane--flush" aria-label="Notes">
          <div className="tabs" role="tablist" style={{ display: 'flex', width: '100%' }}>
            <button type="button" role="tab" aria-selected className="tabs__item" style={{ flex: 1 }}>Shared · 8</button>
            <button type="button" role="tab" aria-selected={false} className="tabs__item" style={{ flex: 1 }}>Private · 2</button>
          </div>
          <button type="button" className="btn btn--secondary btn--block btn--sm" style={{ marginTop: 'var(--space-3)' }}>
            New shared note
          </button>
          <div className="pane__scroll" style={{ marginTop: 'var(--space-3)' }}>
            {NOTES.map((n) => (
              <span key={n.id} className="noterow" aria-current={n.on}>
                <span className="noterow__title">{n.title}</span>
                <span className="noterow__meta">
                  <span className="noterow__dot" style={{ background: `var(--observer-${n.c + 1})` }} />
                  {n.who}<span className="spacer" /><span className="tabular">{n.when}</span>
                </span>
              </span>
            ))}
          </div>
        </section>

        <section className="pane" aria-label="Note">
          <div className="editor">
            <div className="editor__bar">
              <span className="badge" data-corrob="3" style={{ height: 28, fontSize: 13, padding: '0 12px' }}>Shared</span>
              <span className="spacer" />
              <span className="t-micro muted">Saved 2 min ago</span>
              <button type="button" className="btn btn--ghost btn--sm">Delete</button>
            </div>
            <input className="editor__title" defaultValue="Insurance step" />
            <textarea
              className="editor__body"
              style={{ marginTop: 'var(--space-4)' }}
              defaultValue={'She stopped at the insurance field and read it twice before backing out.\n\nSecond time through she went straight past it — so it is the first encounter that costs us, not the field itself.'}
            />
            <section style={{ marginTop: 'var(--space-12)' }}>
              <div className="row" style={{ gap: 'var(--space-3)', alignItems: 'baseline' }}>
                <h2 className="t-h3">Tasks</h2>
                <span className="t-label muted">Assign one and it lands on that person&rsquo;s home screen.</span>
              </div>
              <div className="taskadd" style={{ marginTop: 'var(--space-4)' }}>
                <input className="input taskadd__title" placeholder="What needs doing?" />
                <select className="field"><option>Unassigned</option><option>Priya R.</option></select>
                <input type="date" className="field" />
                <button type="button" className="btn btn--primary btn--sm">Add task</button>
              </div>
              <div className="board" style={{ marginTop: 'var(--space-4)' }}>
                {[['To do', 1], ['In progress', 1], ['Blocked', 0], ['Done', 0]].map(([label, n]) => (
                  <section key={label as string} className="board__col">
                    <div className="board__head">
                      <span className="board__label">{label}</span>
                      <span className="board__count tabular">{n}</span>
                    </div>
                    {n === 0 ? <p className="board__empty">Nothing here.</p> : (
                      <article className="taskcard">
                        <div className="taskcard__title">Check the insurance copy with legal</div>
                        <div className="taskcard__meta">
                          <span className="taskcard__who"><Chip name="Priya R." colourIndex={0} small /> Priya R.</span>
                          <span className="taskcard__due" data-overdue={label === 'To do'}>
                            {label === 'To do' ? 'was due Tuesday' : 'due Friday'}
                          </span>
                        </div>
                      </article>
                    )}
                  </section>
                ))}
              </div>
            </section>
          </div>
        </section>

        <StudioPanel
          artefacts={[
            { id: 'f', name: 'Findings', colour: 0, ready: true, note: 'Group 8 shared notes by what they agree on' },
            { id: 'm', name: 'Mind map', colour: 1, ready: false, note: 'Not built yet' },
            { id: 's', name: 'Slide deck', colour: 2, ready: false, note: 'Not built yet' },
            { id: 'a', name: 'Audio overview', colour: 3, ready: false, note: 'Not built yet' },
          ]}
          footer={
            <p className="t-micro muted" style={{ marginTop: 'var(--space-3)', lineHeight: 1.5 }}>
              Artefacts are made from the shared notes only. Nothing private is read.
            </p>
          }
        />
      </div>
    </AppShell>
  );
}
