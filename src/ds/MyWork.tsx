// Grove Studio — A15. What has been assigned to you, on your home screen.
//
// The point of assigning a task is that the other person finds out. Anything
// short of "it is on their screen when they next open the app" is a task
// somebody has to remember to go looking for, which is not assignment, it is
// hoping.
//
// Shown as rows rather than a board: this list is scanned top to bottom, and
// four columns of one card each is a board pretending to be busy.
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { duePhrase, dueRank } from '../lib/due';
import { TASK_COLUMNS, type MyTask, type TaskStatus } from '../lib/models';
import { updateTask } from '../lib/supabase';

type Lens = 'open' | 'done';

export function MyWork({ tasks, onChange }: { tasks: MyTask[]; onChange: () => void }) {
  const [lens, setLens] = useState<Lens>('open');
  const [busy, setBusy] = useState<string | null>(null);

  const open = useMemo(
    () => tasks.filter((t) => t.status !== 'done')
               .sort((a, b) => dueRank(a.due_date) - dueRank(b.due_date)),
    [tasks],
  );
  const done = useMemo(
    () => tasks.filter((t) => t.status === 'done')
               .sort((a, b) => (b.completed_at ?? '').localeCompare(a.completed_at ?? '')),
    [tasks],
  );
  const overdue = open.filter((t) => dueRank(t.due_date) === 0).length;
  const shown = lens === 'open' ? open : done;

  async function move(id: string, status: TaskStatus) {
    setBusy(id);
    try { await updateTask(id, { status }); onChange(); } finally { setBusy(null); }
  }

  if (tasks.length === 0) return null;

  return (
    <section style={{ marginTop: 'var(--space-12)' }}>
      <div className="row" style={{ gap: 'var(--space-3)', flexWrap: 'wrap', alignItems: 'baseline' }}>
        <h2 className="t-h2">Assigned to you</h2>
        {/* The one number allowed to nag, and it is a fact, not a colour. */}
        {overdue > 0 && (
          <span className="t-label" style={{ fontWeight: 650 }}>
            {overdue} {overdue === 1 ? 'is' : 'are'} past its date
          </span>
        )}
        <span className="spacer" />
        <div className="tabs" role="tablist" aria-label="Your tasks">
          <button type="button" role="tab" aria-selected={lens === 'open'} className="tabs__item" onClick={() => setLens('open')}>
            Open · {open.length}
          </button>
          <button type="button" role="tab" aria-selected={lens === 'done'} className="tabs__item" onClick={() => setLens('done')}>
            Done · {done.length}
          </button>
        </div>
      </div>

      <div style={{ marginTop: 'var(--space-6)' }}>
        {shown.length === 0 && (
          <p className="t-body muted">
            {lens === 'open' ? 'Nothing is waiting on you.' : 'Nothing finished yet.'}
          </p>
        )}
        {shown.map((t) => {
          const phrase = duePhrase(t.due_date);
          const late = phrase.startsWith('was due') && t.status !== 'done';
          return (
            <div key={t.id} className={`taskrow ${t.status === 'done' ? 'taskrow--done' : ''}`}>
              <div className="taskrow__main">
                <div className="taskrow__title">{t.title}</div>
                <div className="taskrow__where">
                  <Link to={`/space/${t.project_id}/note/${t.note_id}`} style={{ color: 'inherit' }}>
                    {t.note_title}
                  </Link>
                  {' · '}{t.project_name}{' · '}assigned by {t.assigned_by}
                </div>
              </div>
              {phrase && <span className="taskrow__due" data-overdue={late}>{phrase}</span>}
              <label className="vh" htmlFor={`my-${t.id}`}>Change status</label>
              <select
                id={`my-${t.id}`} className="field field--sm" value={t.status} disabled={busy === t.id}
                onChange={(e) => move(t.id, e.target.value as TaskStatus)}
              >
                {TASK_COLUMNS.map((c) => <option key={c.status} value={c.status}>{c.label}</option>)}
              </select>
            </div>
          );
        })}
      </div>
    </section>
  );
}
