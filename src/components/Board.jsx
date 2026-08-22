import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, useData, useToast } from '../state/Store';
import { updateTask, notify } from '../lib/api';
import { Avatar, DocIcon } from './ui';
import { labelChip, firstName } from '../lib/colors';
import { fmtDue, dueUrgency } from '../lib/fmt';
import { STATUS_LABEL, NEXT_STATUS, nextProgress, StatusMenu } from './TaskBits';

const COLS = [
  { key: 'todo', dot: 'var(--faint)' },
  { key: 'doing', dot: 'var(--amber)' },
  { key: 'review', dot: 'var(--o5)' },
  { key: 'done', dot: 'var(--acc)', check: true },
];

export default function Board({ space, tasks, members, notes, onChanged, openAssign, openNewTask }) {
  const nav = useNavigate();
  const { user, displayName } = useAuth();
  const { refreshTasks } = useData();
  const { toast } = useToast();

  const memberByUser = new Map(members.map((m) => [m.userId, m]));
  const noteById = new Map(notes.map((n) => [n.id, n]));

  const move = async (t, target) => {
    const next = target ?? NEXT_STATUS[t.status];
    if (next === t.status) return;
    try {
      await updateTask(t.id, { status: next, progress: nextProgress(next, t.progress) });
      onChanged?.();
      refreshTasks();
      if (next === 'done') {
        const a = memberByUser.get(t.assignee_user);
        toast('Nice — done', a && t.assignee_user !== user.id
          ? `${firstName(a.name)}'s dashboard and the assigner are updated`
          : 'The assigner sees the update on their dashboard', 'ok');
        if (t.assigned_by_user && t.assigned_by_user !== user.id) {
          notify([t.assigned_by_user], {
            actorName: displayName, kind: 'done',
            text: `${displayName} completed “${t.title}”`,
            sub: space.name, projectId: space.id, taskId: t.id,
          });
        }
      }
    } catch (e) {
      toast('Could not move the card', e.message, 'error');
    }
  };

  return (
    <div className="board">
      <div className="board-head">
        <span className="hint">Assign a card and its owner is notified instantly — with the note link and deadline.</span>
        <span className="n">{tasks.length} task{tasks.length === 1 ? '' : 's'}</span>
      </div>
      <div className="board-cols">
        {COLS.map((c) => {
          const cards = tasks.filter((t) => t.status === c.key);
          return (
            <div className="board-col" key={c.key}>
              <div className="col-head">
                <b>{STATUS_LABEL[c.key]}</b>
                {c.check && (
                  <svg width="13" height="13" viewBox="0 0 14 14" style={{ color: 'var(--acc)' }}>
                    <circle cx="7" cy="7" r="6" fill="var(--acc)" />
                    <path d="M4 7.2 L6 9.2 L10 4.8" fill="none" stroke="var(--acc-ink)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
                <span className="n">{cards.length}</span>
              </div>
              {cards.map((t) => {
                const [labelBg, labelInk] = labelChip(t.label);
                const assignee = memberByUser.get(t.assignee_user);
                const note = noteById.get(t.note_id);
                const urgency = dueUrgency(t.due_date, t.status);
                const dueColor = urgency === 'late' ? 'var(--danger)' : urgency === 'soon' ? 'var(--amber)' : 'var(--faint)';
                return (
                  <div className="board-card" key={t.id} onClick={() => openAssign(t)} style={{ cursor: 'pointer' }} title="Click to assign / reassign">
                    <p className="title" style={{ textDecoration: t.status === 'done' ? 'line-through' : 'none' }}>{t.title}</p>
                    <div className="chips">
                      <span className="label-chip" style={{ background: labelBg, color: labelInk }}>{t.label}</span>
                      {t.status !== 'done' && t.due_date && (
                        <span className="due" style={{ color: dueColor }}>{fmtDue(t.due_date)}</span>
                      )}
                    </div>
                    <div className="foot">
                      {note ? (
                        <button className="key-chip" title={note.title} onClick={(e) => { e.stopPropagation(); nav(`/app/s/${space.id}?note=${note.id}`); }}>
                          <DocIcon size={11} />
                          <span>{note.title}</span>
                        </button>
                      ) : <span className="key-chip empty">No source</span>}
                      <div className="card-right" onClick={(e) => e.stopPropagation()}>
                        <StatusMenu status={t.status} onPick={(s) => move(t, s)} />
                        <button className="assignee-btn" title={assignee ? `${assignee.name} — reassign` : 'Assign'} onClick={() => openAssign(t)}>
                          {assignee
                            ? <Avatar name={assignee.name} colourIndex={assignee.colourIndex} size={24} />
                            : <span className="avatar unassigned" style={{ width: 24, height: 24 }}>?</span>}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
              <button className="add" onClick={() => openNewTask(c.key)}>+ Create</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
