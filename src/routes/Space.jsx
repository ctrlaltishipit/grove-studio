import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth, useData, useStudio, useToast } from '../state/Store';
import { createNote, deleteNote } from '../lib/api';
import { startSpaceLive } from '../lib/live';
import { spaceTile, hashCode } from '../lib/colors';
import { Spinner, AvatarStack, LockIcon } from '../components/ui';
import NotesList from '../components/NotesList';
import NoteEditor from '../components/NoteEditor';
import Board from '../components/Board';
import { ShareSpaceModal, AssignModal, NewTaskModal } from '../components/SpaceModals';
import DemoSpace from '../components/DemoSpace';
import { DEMO_SPACE_ID } from '../lib/demoData';

export default function Space() {
  const { spaceId } = useParams();
  // The built-in sample space is a self-contained, read-only showcase.
  if (spaceId === DEMO_SPACE_ID) return <DemoSpace />;
  return <LiveSpace />;
}

function LiveSpace() {
  const { spaceId } = useParams();
  const [params, setParams] = useSearchParams();
  const nav = useNavigate();
  const { user, displayName, avatarUrl } = useAuth();
  const { spaces, tasksReady, openModal, refreshTasks } = useData();
  const { toast } = useToast();
  const studio = useStudio();

  const [members, setMembers] = useState([]);
  const [notes, setNotes] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [presence, setPresence] = useState([]);
  const [remoteEdit, setRemoteEdit] = useState(null);
  const [remoteComment, setRemoteComment] = useState(null);
  const [modal, setModal] = useState(null); // { name, ...props }
  const liveRef = useRef(null);

  const space = (spaces ?? []).find((s) => s.id === spaceId) ?? null;
  const isShared = space?.kind === 'shared';
  const tab = params.get('tab') === 'board' && isShared ? 'board' : 'notes';
  const noteId = params.get('note');

  const me = useMemo(() => ({
    userId: user.id,
    name: displayName,
    colourIndex: members.find((m) => m.userId === user.id)?.colourIndex ?? hashCode(user.id) % 5,
  }), [user.id, displayName, members]);

  // One live session per open space — and a clean slate per space, so no
  // stale cross-space rows ever render while the new space loads.
  useEffect(() => {
    if (!space) return undefined;
    setNotes(null); setTasks([]); setMembers([]); setPresence([]);
    setRemoteEdit(null); setRemoteComment(null); setModal(null);
    const live = startSpaceLive({
      projectId: space.id,
      me: { userId: user.id, name: displayName, colourIndex: hashCode(user.id) % 5 },
      onNotes: setNotes,
      onTasks: setTasks,
      onMembers: setMembers,
      onPresence: setPresence,
      onNoteEdit: setRemoteEdit,
      onComment: setRemoteComment,
      onError: (e) => console.warn('live', e),
    });
    liveRef.current = live;
    return () => { liveRef.current = null; live.stop(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [space?.id, user.id]);

  // The studio grounds itself in whatever screen you're on.
  useEffect(() => {
    if (!space) return undefined;
    studio.setContext({ spaceId: space.id, spaceName: space.name, kind: space.kind });
    studio.clearSelection();
    return () => { studio.setContext(null); studio.clearSelection(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [space?.id]);

  const myMemberId = members.find((m) => m.userId === user.id)?.memberId;
  const openNote = (notes ?? []).find((n) => n.id === noteId) ?? null;

  const setTab = (t) => {
    const next = new URLSearchParams(params);
    next.set('tab', t);
    next.delete('note');
    setParams(next);
  };
  const openNoteById = (id) => {
    const next = new URLSearchParams(params);
    next.set('tab', 'notes');
    if (id) next.set('note', id); else next.delete('note');
    setParams(next);
  };

  const refresh = useCallback(() => liveRef.current?.refresh(), []);

  const newNote = async () => {
    if (!myMemberId) return;
    try {
      const n = await createNote(space.id, myMemberId, {
        title: 'Untitled note',
        visibility: isShared ? 'shared' : 'private',
      });
      refresh();
      liveRef.current?.nudge();
      openNoteById(n.id);
      toast(isShared ? 'New shared note created' : 'New private note created',
        isShared ? 'Teammates see it appear in their list right now' : 'Visible only to you', 'ok');
    } catch (e) {
      toast('Could not create the note', e.message, 'error');
    }
  };

  const removeNote = async (n) => {
    if (!window.confirm(`Delete “${n.title}”? This can't be undone.`)) return;
    try {
      const ok = await deleteNote(n.id);
      if (!ok) { toast('Not deleted', 'Only the author can delete a note.', 'warn'); return; }
      if (noteId === n.id) openNoteById(null);
      refresh();
      liveRef.current?.nudge();
      toast('Note deleted', null, 'warn');
    } catch (e) {
      toast('Could not delete', e.message, 'error');
    }
  };

  if (spaces === null) {
    return <div className="page-scroll"><div className="center-fill"><Spinner /></div></div>;
  }
  if (!space) {
    return (
      <div className="page-scroll">
        <div className="center-fill">
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 24 }}>You're not in this space</div>
            <div style={{ color: 'var(--muted)', fontSize: 14 }}>Ask a member for its six-character code, then join.</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary" onClick={() => openModal('join')}>Join with a code</button>
              <button className="btn" onClick={() => nav('/app')}>Back home</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const notesForTask = notes ?? [];

  return (
    <div className="space-view">
      <div className="space-topbar">
        <div className="space-titlebar">
          <span className="tile" style={{ background: spaceTile(space.id) }}>
            {space.kind === 'private' ? <LockIcon color="var(--o-ink)" size={11} /> : space.name.trim()[0]?.toUpperCase()}
          </span>
          <div className="name">{space.name}</div>
          {isShared ? (
            <button className="code-chip" title="Click to copy the join code" onClick={async () => {
              try { await navigator.clipboard.writeText(space.joinCode); toast('Code copied', null, 'ok'); }
              catch { toast(`Code: ${space.joinCode}`, null, 'ok'); }
            }}>{space.joinCode}</button>
          ) : (
            <span className="private-chip"><LockIcon size={10} />PRIVATE — only you</span>
          )}
          <div className="right">
            {isShared && (
              <>
                <AvatarStack people={members} size={26} max={5} />
                <button className="btn btn-sm" onClick={() => setModal({ name: 'share' })}>Share</button>
              </>
            )}
          </div>
        </div>
        <div className="space-tabs">
          <button className={'space-tab' + (tab === 'notes' ? ' on' : '')} onClick={() => setTab('notes')}>Notes</button>
          {isShared && (
            <button className={'space-tab' + (tab === 'board' ? ' on' : '')} onClick={() => setTab('board')}>Board</button>
          )}
        </div>
      </div>

      <div className="space-body">
        <div className="space-content">
          {tab === 'notes' && notes === null && <div className="center-fill"><Spinner /></div>}

          {tab === 'notes' && notes !== null && !openNote && (
            <NotesList
              space={space} notes={notes} members={members} presence={presence}
              meUserId={user.id} myMemberId={myMemberId}
              onOpen={(n) => openNoteById(n.id)}
              onNew={newNote}
              onDelete={removeNote}
              onShareNote={(n) => setModal({ name: 'share', note: n })}
            />
          )}

          {tab === 'notes' && openNote && (
            <NoteEditor
              note={openNote} space={space} members={members} presence={presence}
              meUserId={user.id} meName={displayName} meAvatar={avatarUrl}
              live={liveRef.current} remoteEdit={remoteEdit} remoteComment={remoteComment}
              noteTasks={tasks.filter((t) => t.note_id === openNote.id)}
              canAssign={tasksReady && isShared}
              onClose={() => openNoteById(null)}
              onDeleted={() => removeNote(openNote)}
              onChanged={refresh}
              onShare={() => setModal({ name: 'share', note: openNote })}
              onAssignNew={() => setModal({ name: 'newtask', status: 'todo', noteId: openNote.id, title: openNote.title })}
              onReassign={(t) => setModal({ name: 'assign', task: t })}
            />
          )}

          {tab === 'board' && (
            tasksReady ? (
              <Board
                space={space} tasks={tasks} members={members} notes={notesForTask}
                onChanged={refresh}
                openAssign={(t) => setModal({ name: 'assign', task: t })}
                openNewTask={(status) => setModal({ name: 'newtask', status })}
              />
            ) : (
              <div style={{ padding: 22 }}>
                <div className="setup-callout">
                  The board needs one more backend step: paste <code>sql/06_grovestudio.sql</code> into
                  the Supabase SQL editor and reload. Notes and live co-writing already work.
                </div>
              </div>
            )
          )}
        </div>

      </div>

      {modal?.name === 'share' && (
        <ShareSpaceModal
          space={space} members={members} note={modal.note} meUserId={user.id}
          onClose={() => setModal(null)}
          onChanged={() => { refresh(); liveRef.current?.nudge(); }}
        />
      )}
      {modal?.name === 'assign' && (
        <AssignModal
          space={space} task={modal.task} members={members}
          noteTitle={notesForTask.find((n) => n.id === modal.task.note_id)?.title}
          onClose={() => setModal(null)}
          onChanged={() => { refresh(); refreshTasks(); }}
        />
      )}
      {modal?.name === 'newtask' && (
        <NewTaskModal
          space={space} members={members} notes={notesForTask} status={modal.status}
          presetNoteId={modal.noteId} presetTitle={modal.title}
          onClose={() => setModal(null)}
          onChanged={() => { refresh(); refreshTasks(); }}
        />
      )}
    </div>
  );
}
