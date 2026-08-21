// Grove — S4 Capture Mode. The core screen. GROVE-MASTER.md §7 S4.
//
// One observer, one lane, complete stillness. This screen must simultaneously
// make the observer feel alone with their thinking and certain the others are
// present. THE ENTIRE INDEPENDENCE ARGUMENT RESTS HERE.
//
// Nothing on this screen animates. Identity comes from getCachedUser() — a deep
// link never signs anyone in; it sends them to Join.
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Composer } from '../ds/Composer';
import { Empty } from '../ds/Empty';
import { Header } from '../ds/Header';
import { Icon } from '../ds/Icon';
import { Notice } from '../ds/Notice';
import { OfflineBanner } from '../ds/OfflineBanner';
import { QuestionBand } from '../ds/QuestionBand';
import { RosterRail } from '../ds/RosterRail';
import { RosterStrip } from '../ds/RosterStrip';
import { NoteCard } from '../ds/NoteCard';
import { useToast } from '../ds/Toast';
import { ApiError, synthesise } from '../lib/api';
import { getCachedUser } from '../lib/auth';
import { SOLO_NOTE_GATE } from '../lib/config';
import type { Note, NoteKind, Participant, RosterRow, Session } from '../lib/models';
import { loadDraft, loadRosterCollapsed, saveDraft, saveLastSession, saveRosterCollapsed } from '../lib/storage';
import { configured, createNote, deleteNote, getMyParticipant, getSession, updateNote } from '../lib/supabase';
import { startSync, type SyncHandle } from '../lib/sync';

function useWide(): boolean {
  const [wide, setWide] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 1024);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const on = (e: MediaQueryListEvent) => setWide(e.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return wide;
}

export default function Capture() {
  const { sessionId = '' } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const wide = useWide();
  const toast = useToast();

  const [session, setSession] = useState<Session | null>(null);
  const [me, setMe] = useState<Participant | null>(null);
  const [roster, setRoster] = useState<RosterRow[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [rosterLoading, setRosterLoading] = useState(true);
  const [draft, setDraft] = useState(() => loadDraft(sessionId));
  const [noteError, setNoteError] = useState(false);
  const [collapsed, setCollapsed] = useState(loadRosterCollapsed);
  const [synthesising, setSynthesising] = useState(false);
  const [synthError, setSynthError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const tempId = useRef(0);
  const sync = useRef<SyncHandle | null>(null);

  /* ---------- load: cached identity only — never a sign-in on a deep link ---------- */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!configured) { setLoading(false); return; }
      try {
        const user = await getCachedUser();
        if (cancelled) return;
        if (!user) { navigate('/join', { replace: true }); return; }
        const found = await getSession(sessionId);
        if (cancelled) return;
        // Not readable = not ours (sessions_select is tight on purpose). The code is the capability.
        if (!found) { navigate('/join', { replace: true }); return; }
        setSession(found);
        const mine = await getMyParticipant(sessionId, user.id);
        if (cancelled) return;
        if (!mine) {
          navigate(found.status === 'synthesised' ? `/s/${sessionId}/findings` : `/join/${found.join_code}`, { replace: true });
          return;
        }
        setMe(mine);
        saveLastSession({ sessionId: found.id, title: found.title, joinCode: found.join_code });
      } catch { /* the sync loop will retry */ }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [sessionId, navigate]);

  /* ---------- the feed: 3-second polling, built first and kept working ---------- */
  useEffect(() => {
    if (!me) return undefined;
    const handle = startSync({
      sessionId,
      participantId: me.id,
      onRoster: (rows) => { setRoster(rows); setRosterLoading(false); },
      // Optimistic (pending) cards survive a poll; everything else is the server's truth.
      onMyNotes: (server) => setNotes((prev) => [...prev.filter((n) => n.pending), ...server]),
      onStatus: (status) => setSession((s) => (s && s.status !== status ? { ...s, status } : s)),
    });
    sync.current = handle;
    return () => { handle.stop(); sync.current = null; };
  }, [me, sessionId]);

  /* ---------- the draft never leaves the device until submitted ---------- */
  useEffect(() => { saveDraft(sessionId, draft); }, [sessionId, draft]);

  /* ---------- notes ---------- */
  async function submitNote(body: string, kind: NoteKind) {
    if (!me) return;
    tempId.current += 1;
    const temp: Note = {
      id: `temp-${tempId.current}`, session_id: sessionId, participant_id: me.id,
      body: body.trim(), kind, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), pending: true,
    };
    setNotes((n) => [temp, ...n]);
    setDraft('');
    setNoteError(false);
    try {
      const saved = await createNote({ sessionId, participantId: me.id, body, kind });
      setNotes((n) => n.map((x) => (x.id === temp.id ? saved : x)));
      void sync.current?.tick();
    } catch {
      // The optimistic card is removed and the text is restored into the composer. Nothing is silently lost. (E11)
      setNotes((n) => n.filter((x) => x.id !== temp.id));
      setDraft(body);
      setNoteError(true);
    }
  }

  const saveEdit = useCallback(async (id: string, body: string) => {
    if (!me) return;
    try {
      const saved = await updateNote({ noteId: id, participantId: me.id, body });
      setNotes((n) => n.map((x) => (x.id === id ? saved : x)));
    } catch {
      setNotes((n) => n.map((x) => (x.id === id ? { ...x, failed: true } : x)));
    }
  }, [me]);

  const removeNote = useCallback(async (id: string) => {
    if (!me) return;
    let before: Note[] = [];
    setNotes((n) => { before = n; return n.filter((x) => x.id !== id); });
    try {
      await deleteNote({ noteId: id, participantId: me.id });
      toast.show('Note deleted.');
      void sync.current?.tick();
    } catch {
      setNotes(before);
    }
  }, [me, toast]);

  /* ---------- synthesis ---------- */
  const withNotes = roster.filter((p) => p.note_count > 0);
  const solo = roster.length <= 1;
  const totalNotes = roster.reduce((sum, p) => sum + p.note_count, 0);
  // Door B relaxes the gate: one participant arms at 3 notes. Door A needs two participants each with a note. §1.4, S10
  const armed = solo ? totalNotes >= SOLO_NOTE_GATE : withNotes.length >= 2;
  const gateLabel = solo ? `Synthesise — available at ${SOLO_NOTE_GATE} notes` : 'Synthesise — available when two observers have notes';

  useEffect(() => {
    if (!synthesising) return undefined;
    setElapsed(0);
    const t = setInterval(() => setElapsed((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [synthesising]);

  async function runSynthesis() {
    setSynthesising(true);
    setSynthError(null);
    try {
      await synthesise(sessionId);
      navigate(`/s/${sessionId}/findings`);
    } catch (e) {
      setSynthError(e instanceof ApiError ? e.message : "Synthesis didn't complete. Your notes are saved. Try again.");
      setSynthesising(false);
    }
  }

  /* ---------- S5 the synthesising interstitial — this screen IS the loading state. Nothing animates. ---------- */
  if (synthesising) {
    return (
      <>
        <Header linkHome={false} />
        <main className="page col-narrow center" style={{ paddingTop: '20vh' }}>
          <div className="t-tracked muted">Synthesising</div>
          <h1 className="t-h1 tabular" style={{ marginTop: 'var(--space-4)' }}>
            Synthesising {totalNotes} notes from {roster.length} observer{roster.length === 1 ? '' : 's'}.
          </h1>
          <p className="t-body muted" style={{ marginTop: 'var(--space-4)' }}>This usually takes about twenty seconds. Don&rsquo;t close the tab.</p>
          {elapsed >= 30 && <p className="t-body muted" style={{ marginTop: 'var(--space-4)' }}>Still working.</p>}
        </main>
      </>
    );
  }

  const synthesiseButton = (
    <button
      type="button"
      className={`btn ${armed ? 'btn--primary' : 'btn--secondary'} btn--block`}
      style={{ height: 'auto', minHeight: 'var(--control-h)', paddingTop: 8, paddingBottom: 8, whiteSpace: 'normal' }}
      disabled={!armed}
      onClick={runSynthesis}
    >
      {armed ? 'Synthesise' : gateLabel}
    </button>
  );

  return (
    <>
      <Header
        linkHome={false}
        left={<span className="wordmark">Grove</span>}
        right={session && (
          <span className="codechip">
            <span className="t-tracked muted">Code</span>
            <span className="codechip__value">{session.join_code}</span>
            <button
              type="button" className="btn btn--ghost btn--icon" aria-label="Copy session code"
              onClick={() => { void navigator.clipboard?.writeText(session.join_code); toast.show('Code copied.'); }}
            >
              <Icon name="copy" size={16} />
            </button>
          </span>
        )}
      />
      <OfflineBanner />

      {!wide && !loading && (
        <div className="page">
          <RosterStrip
            roster={roster} meId={me?.id} collapsed={collapsed}
            onToggle={() => { const next = !collapsed; setCollapsed(next); saveRosterCollapsed(next); }}
          />
        </div>
      )}

      <main className="page" style={{ paddingTop: 'var(--space-6)', paddingBottom: 'var(--space-12)' }}>
        <QuestionBand question={session?.research_question} loading={loading} />

        <div className="capture" style={{ marginTop: 'var(--space-8)' }}>
          <div className="capture__main">
            {session?.status === 'synthesised' && (
              <div className="row" style={{ marginBottom: 'var(--space-4)' }}>
                <span className="t-label muted">This session has findings.</span>
                <Link to={`/s/${sessionId}/findings`} className="btn btn--ghost btn--sm" style={{ textDecoration: 'none' }}>Open findings</Link>
              </div>
            )}

            {synthError && (
              <div style={{ marginBottom: 'var(--space-4)' }}>
                <Notice action={<button type="button" className="btn btn--primary btn--sm" onClick={runSynthesis}>Try again</button>}>
                  {synthError}
                </Notice>
              </div>
            )}

            <Composer value={draft} onChange={setDraft} onSubmit={submitNote} error={noteError} sticky={!wide} />

            <div className="row" style={{ marginTop: 'var(--space-8)' }}>
              <h2 className="t-h3">Your notes</h2>
              <span className="t-label muted">— only you can see these</span>
              <span className="spacer" />
              <span className="t-badge">{notes.length}</span>
            </div>

            <div className="stack stack-4" style={{ marginTop: 'var(--space-4)' }}>
              {loading && <p className="t-body muted">Loading the session.</p>}
              {!loading && notes.length === 0 && <Empty>Your notes appear here. Only you can see them.</Empty>}
              {notes.map((note) => (
                <NoteCard key={note.id} note={note} onSave={saveEdit} onDelete={removeNote} />
              ))}
            </div>

            {!wide && <div style={{ marginTop: 'var(--space-8)' }}>{synthesiseButton}</div>}
          </div>

          {wide && (
            <div style={{ position: 'sticky', top: 'calc(56px + var(--space-8))', alignSelf: 'flex-start' }}>
              <RosterRail roster={roster} meId={me?.id} loading={rosterLoading} />
              {solo && session && (
                <p className="t-body muted" style={{ marginTop: 'var(--space-3)', paddingLeft: 'var(--space-4)' }}>
                  You&rsquo;re the only observer here. Share the code <span className="codechip__value">{session.join_code}</span>.
                </p>
              )}
              <div style={{ marginTop: 'var(--space-8)', paddingLeft: 'var(--space-4)' }}>{synthesiseButton}</div>
            </div>
          )}
        </div>
      </main>
      {toast.node}
    </>
  );
}
