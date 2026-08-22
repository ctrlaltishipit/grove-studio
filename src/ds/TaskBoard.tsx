// Grove Studio — A15. The Kanban board that lives inside a shared note.
//
// A note is where a team works out what it thinks; the board underneath it is
// the part somebody has to go and do. Keeping them on one screen is the whole
// point — a task list in another tool is a task list nobody opens.
//
// Two design rules are load-bearing here:
//
//   * Moving a task is a control, not a drag. "Move to…" works from a
//     keyboard, works on a phone, and works for someone who cannot see the
//     board. Drag-and-drop can be added on top later; it cannot be the only
//     way in. (§8, and the plan's A10.)
//   * Status carries no colour. Overdue is said in words. A board of ten
//     amber cards is ten alarms and no information.
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Chip } from './Chip';
import { duePhrase, todayIso } from '../lib/due';
import { TASK_COLUMNS, type NoteTask, type SpaceMember, type TaskStatus } from '../lib/models';
import { createTask, deleteTask, listNoteTasks, updateTask } from '../lib/supabase';

interface Props {
  noteId: string;
  members: SpaceMember[];
  /** Tasks belong on shared notes only — the database refuses otherwise, and
   *  the UI says why rather than offering a control that will fail. */
  shared: boolean;
  onChange?: () => void;
}

export function TaskBoard({ noteId, members, shared, onChange }: Props) {
  const [tasks, setTasks] = useState<NoteTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [assignee, setAssignee] = useState('');
  const [due, setDue] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try { setTasks(await listNoteTasks(noteId)); setError(null); }
    catch { setError('Couldn’t load the tasks on this note.'); }
    finally { setLoading(false); }
  }, [noteId]);

  useEffect(() => { void load(); }, [load]);

  // The board is shared, so it moves when other people move it.
  useEffect(() => {
    if (!shared) return undefined;
    const t = setInterval(() => { void load(); }, 4000);
    return () => clearInterval(t);
  }, [shared, load]);

  async function add(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || busy) return;
    setBusy(true);
    try {
      await createTask({ noteId, title: title.trim(), assigneeId: assignee || null, dueDate: due || null });
      setTitle(''); setAssignee(''); setDue('');
      await load(); onChange?.();
    } catch { setError('That task didn’t save. Nothing was assigned.'); }
    finally { setBusy(false); }
  }

  async function patch(id: string, p: Parameters<typeof updateTask>[1]) {
    // Optimistic, because a board that waits half a second per click feels
    // broken. load() reconciles, and an error puts the truth back.
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...localise(t, p, members) } : t)));
    try { await updateTask(id, p); await load(); onChange?.(); }
    catch { setError('That change didn’t stick.'); await load(); }
  }

  async function remove(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    try { await deleteTask(id); onChange?.(); }
    catch { setError('That task wasn’t deleted.'); await load(); }
  }

  if (!shared) {
    return (
      <p className="t-label muted">
        Tasks live on shared notes. Share this note and the board appears, so everyone
        assigned can see what they were given.
      </p>
    );
  }

  return (
    <div>
      <form className="taskadd" onSubmit={add}>
        <input
          className="input taskadd__title"
          placeholder="What needs doing?"
          value={title}
          maxLength={200}
          onChange={(e) => setTitle(e.target.value)}
        />
        <label className="vh" htmlFor="task-who">Assign to</label>
        <select id="task-who" className="field" value={assignee} onChange={(e) => setAssignee(e.target.value)}>
          <option value="">Unassigned</option>
          {members.map((m) => <option key={m.member_id} value={m.member_id}>{m.display_name}</option>)}
        </select>
        <label className="vh" htmlFor="task-due">Due date</label>
        <input
          id="task-due" type="date" className="field" value={due}
          min={todayIso()} onChange={(e) => setDue(e.target.value)}
        />
        <button type="submit" className="btn btn--primary btn--sm" disabled={!title.trim() || busy}>
          Add task
        </button>
      </form>

      {error && <p className="t-label" style={{ marginTop: 'var(--space-3)', color: 'var(--danger)' }}>{error}</p>}

      <div className="board" style={{ marginTop: 'var(--space-4)' }}>
        {TASK_COLUMNS.map((col) => {
          const inCol = tasks.filter((t) => t.status === col.status);
          return (
            <section key={col.status} className="board__col" aria-label={col.label}>
              <div className="board__head">
                <span className="board__label">{col.label}</span>
                <span className="board__count tabular">{inCol.length}</span>
              </div>
              {loading && <p className="board__empty">Loading.</p>}
              {!loading && inCol.length === 0 && <p className="board__empty">Nothing here.</p>}
              {inCol.map((t) => (
                <TaskCard
                  key={t.id}
                  task={t}
                  members={members}
                  onPatch={(p) => patch(t.id, p)}
                  onDelete={() => remove(t.id)}
                />
              ))}
            </section>
          );
        })}
      </div>
    </div>
  );
}

/** Mirror an optimistic patch onto the local row so the card does not flicker
 *  back to its old assignee for the length of a round trip. */
function localise(_t: NoteTask, p: Parameters<typeof updateTask>[1], members: SpaceMember[]): Partial<NoteTask> {
  const out: Partial<NoteTask> = {};
  if (p.status) out.status = p.status;
  if (p.title) out.title = p.title;
  if (p.clearDue) out.due_date = null;
  else if (p.dueDate) out.due_date = p.dueDate;
  if (p.clearAssignee) { out.assignee_id = null; out.assignee_name = null; out.assignee_colour = null; }
  else if (p.assigneeId) {
    const m = members.find((x) => x.member_id === p.assigneeId);
    out.assignee_id = p.assigneeId;
    out.assignee_name = m?.display_name ?? null;
    out.assignee_colour = m?.colour_index ?? null;
  }
  return out;
}

function TaskCard({ task, members, onPatch, onDelete }: {
  task: NoteTask;
  members: SpaceMember[];
  onPatch: (p: Parameters<typeof updateTask>[1]) => void;
  onDelete: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const phrase = duePhrase(task.due_date);
  const overdue = phrase.startsWith('was due') && task.status !== 'done';

  return (
    <article className={`taskcard ${task.status === 'done' ? 'taskcard--done' : ''}`}>
      <div className="taskcard__title">{task.title}</div>

      <div className="taskcard__meta">
        {task.assignee_id ? (
          <span className="taskcard__who">
            <Chip name={task.assignee_name ?? '?'} colourIndex={task.assignee_colour ?? 0} small />
            {task.assignee_name}
          </span>
        ) : (
          <span className="taskcard__unassigned">Nobody yet</span>
        )}
        {phrase && <span className="taskcard__due" data-overdue={overdue}>{phrase}</span>}
      </div>

      <div className="taskcard__bar">
        <label className="vh" htmlFor={`mv-${task.id}`}>Move this task</label>
        <select
          id={`mv-${task.id}`} className="field field--sm" value={task.status}
          onChange={(e) => onPatch({ status: e.target.value as TaskStatus })}
        >
          {TASK_COLUMNS.map((c) => <option key={c.status} value={c.status}>{c.label}</option>)}
        </select>

        <label className="vh" htmlFor={`as-${task.id}`}>Reassign this task</label>
        <select
          id={`as-${task.id}`} className="field field--sm" value={task.assignee_id ?? ''}
          onChange={(e) => onPatch(e.target.value ? { assigneeId: e.target.value } : { clearAssignee: true })}
        >
          <option value="">Unassigned</option>
          {members.map((m) => <option key={m.member_id} value={m.member_id}>{m.display_name}</option>)}
        </select>

        <span className="spacer" />
        {confirming ? (
          <>
            <button type="button" className="btn btn--destructive btn--sm" onClick={onDelete}>Delete</button>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setConfirming(false)}>Keep</button>
          </>
        ) : (
          <button
            type="button" className="btn btn--ghost btn--sm"
            aria-label={`Delete task: ${task.title}`} onClick={() => setConfirming(true)}
          >
            Delete
          </button>
        )}
      </div>
    </article>
  );
}
