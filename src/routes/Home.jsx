import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth, useData, useStudio } from '../state/Store';
import { fetchProfiles, fetchNoteTitles, listMembers } from '../lib/api';
import { greeting, todayLine, relTime } from '../lib/fmt';
import { firstName, spaceTile } from '../lib/colors';
import { Spinner, AvatarStack, LockIcon } from '../components/ui';
import NotificationsBell from '../components/NotificationsBell';
import { TaskRow, CheckinBanner, pickCheckinTask } from '../components/TaskBits';
import { SelectToggle } from '../components/NotesList';

const FILTERS = ['All', 'Open', 'Done'];

export default function Home() {
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const { displayName } = useAuth();
  const { spaces, myTasks, tasksReady, openModal, refreshAll } = useData();
  const studio = useStudio();
  const [filter, setFilter] = useState('All');
  const [profiles, setProfiles] = useState(new Map());
  const [noteTitles, setNoteTitles] = useState(new Map());
  const [membersBySpace, setMembersBySpace] = useState(new Map());

  // Fresh numbers whenever the dashboard comes into view.
  useEffect(() => { refreshAll(); }, [refreshAll]);

  // Landing's "Join with a code" lands here with ?join=1; an emailed invite
  // link lands with ?join=CODE (six chars) and prefills the modal.
  useEffect(() => {
    const j = params.get('join');
    if (j) {
      const code = /^[A-Za-z0-9]{6}$/.test(j) ? j.toUpperCase() : undefined;
      openModal('join', code ? { code } : {});
      params.delete('join');
      setParams(params, { replace: true });
    }
  }, [params, setParams, openModal]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [p, n] = await Promise.all([
        fetchProfiles(myTasks.map((t) => t.assigned_by_user)),
        fetchNoteTitles(myTasks.map((t) => t.note_id)),
      ]);
      if (alive) { setProfiles(p); setNoteTitles(n); }
    })();
    return () => { alive = false; };
  }, [myTasks]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const targets = (spaces ?? []).slice(0, 12);
      const entries = await Promise.all(targets.map(async (s) => {
        try { return [s.id, await listMembers(s.id)]; } catch { return [s.id, []]; }
      }));
      if (alive) setMembersBySpace(new Map(entries));
    })();
    return () => { alive = false; };
  }, [spaces]);

  const spaceName = (id) => (spaces ?? []).find((s) => s.id === id)?.name;

  const shownTasks = useMemo(() => myTasks.filter((t) =>
    filter === 'All' ? true : filter === 'Open' ? t.status !== 'done' : t.status === 'done'),
  [myTasks, filter]);

  const openCount = myTasks.filter((t) => t.status !== 'done').length;
  const checkinTask = tasksReady ? pickCheckinTask(myTasks) : null;

  if (spaces === null) {
    return <div className="page-scroll"><div className="center-fill"><Spinner /></div></div>;
  }

  return (
    <div className="page-scroll">
      <div className="dash">
        <div className="dash-head">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <h1>{greeting()}, {firstName(displayName)}</h1>
            <div className="sub">
              {todayLine()}
              {tasksReady ? ` · ${openCount} open task${openCount === 1 ? '' : 's'} assigned to you` : ''}
            </div>
          </div>
          <div className="dash-actions">
            <NotificationsBell />
            <button className="btn" onClick={() => openModal('share-spaces')}>Share</button>
            <button className="btn" onClick={() => openModal('join')}>Join with a code</button>
            <button className="btn btn-primary" onClick={() => openModal('new')}>+ New space</button>
          </div>
        </div>

        {checkinTask && (
          <CheckinBanner
            task={checkinTask}
            spaceName={spaceName(checkinTask.project_id)}
            byName={profiles.get(checkinTask.assigned_by_user)?.display_name}
          />
        )}

        <div className="section">
          <div className="section-head">
            <h2>Assigned to you</h2>
            <span className="n">{shownTasks.length}</span>
            <div className="filters">
              {FILTERS.map((f) => (
                <button key={f} className={'filter-pill' + (filter === f ? ' on' : '')} onClick={() => setFilter(f)}>{f}</button>
              ))}
            </div>
          </div>
          {tasksReady ? (
            <div className="task-panel">
              {shownTasks.map((t) => {
                const by = profiles.get(t.assigned_by_user);
                return (
                  <TaskRow key={t.id} task={t}
                    spaceName={spaceName(t.project_id)}
                    noteTitle={noteTitles.get(t.note_id)}
                    byName={by?.display_name}
                    byColour={t.assigned_by_user}
                  />
                );
              })}
              {!shownTasks.length && (
                <div className="empty-note">
                  Nothing here — tasks assigned to you land in this list the moment someone assigns them.
                </div>
              )}
            </div>
          ) : (
            <div className="setup-callout">
              Boards, assignments and notifications need one more backend step: paste
              <code> sql/06_grovestudio.sql</code> into the Supabase SQL editor and reload. Everything
              else — spaces, notes, live co-writing — is already on.
            </div>
          )}
        </div>

        <div className="section">
          <div className="section-head"><h2>Your spaces</h2></div>
          <div className="space-grid">
            {spaces.map((s) => {
              const isPrivate = s.kind === 'private';
              const members = membersBySpace.get(s.id) ?? [];
              const tag = isPrivate ? 'PRIVATE' : 'SHARED';
              const picked = studio.selSpaces.has(s.id);
              return (
                <div key={s.id} role="button" tabIndex={0}
                  className={'space-card' + (picked ? ' sel-ring' : '')}
                  onClick={() => nav(`/app/s/${s.id}`)}
                  onKeyDown={(e) => { if (e.key === 'Enter') nav(`/app/s/${s.id}`); }}>
                  <div className="top">
                    {studio.expanded && (
                      <SelectToggle picked={picked} onToggle={() => studio.toggleSpace(s.id)} label={`Studio scope: ${s.name}`} />
                    )}
                    <span className="tile" style={{ background: spaceTile(s.id) }}>
                      {isPrivate ? <LockIcon color="var(--o-ink)" /> : s.name.trim()[0]?.toUpperCase()}
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <div className="name">{s.name}</div>
                      <div className="meta">
                        {s.sharedNotes + s.myPrivateNotes} note{s.sharedNotes + s.myPrivateNotes === 1 ? '' : 's'}
                        {!isPrivate && ` · ${s.memberCount} member${s.memberCount === 1 ? '' : 's'}`}
                      </div>
                    </div>
                    <span className="tag" style={{ background: 'var(--sunken)', color: 'var(--muted)' }}>{tag}</span>
                  </div>
                  {s.description && <p className="desc">{s.description}</p>}
                  <div className="foot">
                    {!isPrivate && <AvatarStack people={members} size={22} max={5} />}
                    <span className="updated">{relTime(s.lastActivity)}</span>
                  </div>
                </div>
              );
            })}
            <button className="space-card new" onClick={() => openModal('new')}>+ New space</button>
          </div>
        </div>
      </div>
    </div>
  );
}
