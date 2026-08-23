import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth, useData, useStudio } from '../state/Store';
import { fetchProfiles, fetchNoteTitles, listMembers } from '../lib/api';
import { greeting, todayLine, relTime } from '../lib/fmt';
import { firstName, spaceTile } from '../lib/colors';
import { Spinner, AvatarStack, LockIcon } from '../components/ui';
import NotificationsBell from '../components/NotificationsBell';
import { TaskRow, CheckinBanner, pickCheckinTask, NEXT_STATUS } from '../components/TaskBits';
import { SelectToggle } from '../components/NotesList';
import { DEMO_MEMBERS, DEMO_NOTES, DEMO_SPACE_ID } from '../lib/demoData';
import { useDemoLoop, setDemoTaskStatus, markDemoNotifsRead } from '../lib/demoLoop';
import { loadPendingJoin, clearPendingJoin } from '../lib/local';

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
    // The landing page and sign-in stash the code too, so it survives the
    // Google OAuth round-trip (which returns to /app without the query).
    const j = params.get('join') || loadPendingJoin();
    if (j) {
      clearPendingJoin();
      const code = /^[A-Za-z0-9]{6}$/.test(j) ? j.toUpperCase() : undefined;
      openModal('join', code ? { code } : {});
      if (params.get('join')) {
        params.delete('join');
        setParams(params, { replace: true });
      }
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

  // The sample space's tasks assigned to "you" come from the shared demo
  // loop — the same store the sample board writes — so an assignment made
  // there lands here live, with its notification and check-ins in tow.
  const loop = useDemoLoop();
  const demoTasks = useMemo(() => loop.tasks.filter((t) => t.assignee_user === 'demo-you'), [loop.tasks]);
  const cycleDemoTask = (task) => setDemoTaskStatus(task.id, NEXT_STATUS[task.status]);
  const demoMember = (id) => DEMO_MEMBERS.find((m) => m.userId === id);
  const demoNoteTitle = (id) => DEMO_NOTES.find((n) => n.id === id)?.title;
  const shownDemo = useMemo(() => demoTasks.filter((t) =>
    filter === 'All' ? true : filter === 'Open' ? t.status !== 'done' : t.status === 'done'),
  [demoTasks, filter]);
  const demoUnread = loop.notifs.filter((n) => !n.read);

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

        {demoUnread.length > 0 && (
          <div className="checkin">
            <span className="clock">
              <svg width="15" height="15" viewBox="0 0 16 16">
                <path d="M8 2 a4.2 4.2 0 0 1 4.2 4.2 c0 3 1.3 3.9 1.3 3.9 H2.5 s1.3 -.9 1.3 -3.9 A4.2 4.2 0 0 1 8 2 Z" fill="none" stroke="var(--acc-ink)" strokeWidth="1.5" strokeLinejoin="round" />
                <path d="M6.6 12.8 a1.5 1.5 0 0 0 2.8 0" fill="none" stroke="var(--acc-ink)" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </span>
            <div className="body">
              {demoUnread.slice(0, 3).map((n) => (
                <React.Fragment key={n.id}><b>{n.text}</b><span>{n.sub}</span></React.Fragment>
              ))}
            </div>
            <div className="acts">
              <button className="btn btn-sm" style={{ height: 32 }} onClick={markDemoNotifsRead}>Got it</button>
            </div>
          </div>
        )}

        <div className="section">
          <div className="section-head">
            <h2>Assigned to you</h2>
            <span className="n">{shownTasks.length + shownDemo.length}</span>
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
              {shownDemo.map((t) => (
                <TaskRow key={t.id} task={t}
                  spaceName={spaceName(t.project_id)}
                  noteTitle={demoNoteTitle(t.note_id)}
                  byName={demoMember(t.assigned_by_user)?.name}
                  byColour={demoMember(t.assigned_by_user)?.colourIndex}
                  onCycle={cycleDemoTask}
                />
              ))}
              {!shownTasks.length && !shownDemo.length && (
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
              const tag = s.sample || s.id === DEMO_SPACE_ID ? '★ SAMPLE' : isPrivate ? 'PRIVATE' : 'SHARED';
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
                    <span className="tag" style={tag === '★ SAMPLE' ? { background: 'var(--acc-soft)', color: 'var(--acc-deep)' } : { background: 'var(--sunken)', color: 'var(--muted)' }}>{tag}</span>
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
