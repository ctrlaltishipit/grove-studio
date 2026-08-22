// Grove Studio — the note editor.
//
// Type it or say it. The dictate button appends to whatever is already there
// and NEVER submits on your behalf: you read the words before they are yours.
// Nothing on this screen animates while you write.
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AppShell } from '../ds/AppShell';
import { TaskBoard } from '../ds/TaskBoard';
import { Icon } from '../ds/Icon';
import { Notice } from '../ds/Notice';
import { OfflineBanner } from '../ds/OfflineBanner';
import { Recording } from '../ds/Recording';
import { useToast } from '../ds/Toast';
import { awaitUser } from '../lib/auth';
import { createDictation, dictationSupported, type Dictation } from '../lib/dictation';
import { relative } from '../lib/greeting';
import type { SpaceMember, SpaceNote } from '../lib/models';
import { configured, deleteSpaceNote, getSpaceMembers, getSpaceNote, saveSpaceNote, shareSpaceNote } from '../lib/supabase';

const SAVE_DEBOUNCE_MS = 1200;

export default function StudioNote() {
  const { spaceId = '', noteId = '' } = useParams<{ spaceId: string; noteId: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const [note, setNote] = useState<SpaceNote | null>(null);
  const [members, setMembers] = useState<SpaceMember[]>([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'failed'>('idle');
  const [confirmingShare, setConfirmingShare] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const [listening, setListening] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [micDenied, setMicDenied] = useState(false);
  const dictation = useRef<Dictation | null>(null);
  const baseText = useRef('');
  const area = useRef<HTMLTextAreaElement>(null);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!configured) { setLoading(false); return; }
      const u = await awaitUser();
      if (cancelled) return;
      if (!u) { navigate('/', { replace: true }); return; }
      try {
        const n = await getSpaceNote(noteId);
        if (cancelled) return;
        // A private note that isn't yours is indistinguishable from one that
        // doesn't exist — RLS returns nothing, and so do we.
        if (!n) { setFailed(true); return; }
        setNote(n);
        getSpaceMembers(spaceId).then(setMembers).catch(() => {}); setTitle(n.title); setBody(n.body);
      } catch {
        setFailed(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [noteId, navigate]);

  // Idle-debounced save. A dropped keystroke costs a moment of latency; it
  // never costs the sentence you just wrote.
  const queueSave = useCallback((patch: { title?: string; body?: string }) => {
    if (timer.current) window.clearTimeout(timer.current);
    setSaveState('saving');
    timer.current = window.setTimeout(async () => {
      try {
        const saved = await saveSpaceNote(noteId, patch);
        setNote(saved);
        setSaveState('saved');
      } catch {
        setSaveState('failed');
      }
    }, SAVE_DEBOUNCE_MS);
  }, [noteId]);

  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);

  useEffect(() => {
    if (!listening) return undefined;
    const t = setInterval(() => setSeconds((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [listening]);

  // The microphone is never live in the background.
  useEffect(() => {
    const hide = () => { if (document.hidden) dictation.current?.stop(); };
    document.addEventListener('visibilitychange', hide);
    return () => { document.removeEventListener('visibilitychange', hide); dictation.current?.stop(); };
  }, []);

  const join = (base: string, addition: string) => {
    if (!addition) return base;
    if (!base) return addition;
    return /\s$/.test(base) ? base + addition : `${base} ${addition}`;
  };

  function toggleDictation() {
    if (listening) { dictation.current?.stop(); return; }
    setMicDenied(false);
    setSeconds(0);
    baseText.current = body;
    dictation.current = createDictation({
      onInterim: (text) => setBody(join(baseText.current, text)),
      onFinal: (text) => {
        baseText.current = join(baseText.current, text);
        setBody(baseText.current);
        queueSave({ body: baseText.current });
      },
      onError: (code) => { if (code === 'not-allowed' || code === 'service-not-allowed') setMicDenied(true); },
      onEnd: () => { setListening(false); area.current?.focus(); },
    });
    if (!dictation.current) return;
    dictation.current.start();
    setListening(true);
  }

  async function share() {
    try {
      const saved = await shareSpaceNote(noteId);
      setNote(saved);
      setConfirmingShare(false);
      toast.show('Shared with the space.');
    } catch {
      toast.show('Couldn’t share that note. Try again.');
    }
  }

  async function remove() {
    try {
      await deleteSpaceNote(noteId);
      navigate(`/space/${spaceId}`);
    } catch {
      toast.show('Couldn’t delete that note. Try again.');
    }
  }

  if (failed) {
    return (
      <AppShell>
        <Notice action={<Link to={`/space/${spaceId}`} className="btn btn--secondary btn--sm" style={{ textDecoration: 'none' }}>Back to the space</Link>}>
          That note isn&rsquo;t available.
        </Notice>
      </AppShell>
    );
  }

  const isShared = note?.visibility === 'shared';

  return (
    <AppShell>
      <OfflineBanner />
      <div className="editor">
        <div className="editor__bar">
          <Link to={`/space/${spaceId}`} className="btn btn--ghost btn--sm" style={{ textDecoration: 'none' }}>
            Back to the space
          </Link>
          <span className="badge" data-corrob={isShared ? '3' : '1'} style={{ height: 28, fontSize: 13, padding: '0 12px' }}>
            {isShared ? 'Shared' : 'Private'}
          </span>
          <span className="spacer" />
          <span className="t-micro muted" aria-live="polite">
            {saveState === 'saving' ? 'Saving.' : saveState === 'failed' ? 'Not saved.' : note ? `Saved ${relative(note.updated_at)}` : ''}
          </span>
          {dictationSupported && (
            <button
              type="button"
              className="btn btn--ghost btn--icon mic"
              aria-pressed={listening}
              aria-label={listening ? 'Stop dictating' : 'Dictate this note'}
              onClick={toggleDictation}
            >
              <Icon name="mic" />
            </button>
          )}
          {!isShared && !confirmingShare && (
            <button type="button" className="btn btn--secondary btn--sm" onClick={() => setConfirmingShare(true)}>
              Share
            </button>
          )}
          {!confirmingDelete && (
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setConfirmingDelete(true)}>Delete</button>
          )}
        </div>

        {listening && (
          <div className="row" style={{ marginBottom: 'var(--space-4)' }}>
            <Recording seconds={seconds} onStop={() => dictation.current?.stop()} />
          </div>
        )}

        {confirmingShare && (
          <div className="notice" role="status" style={{ marginBottom: 'var(--space-6)' }}>
            <p className="t-body">Everyone in this space will be able to read this note, and sharing cannot be undone.</p>
            <div className="row" style={{ marginTop: 'var(--space-3)', gap: 'var(--space-2)' }}>
              <button type="button" className="btn btn--primary btn--sm" onClick={share}>Share it</button>
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => setConfirmingShare(false)}>Keep it private</button>
            </div>
          </div>
        )}

        {confirmingDelete && (
          <div className="notice" role="status" style={{ marginBottom: 'var(--space-6)' }}>
            <p className="t-body">Delete this note?</p>
            <div className="row" style={{ marginTop: 'var(--space-3)', gap: 'var(--space-2)' }}>
              <button type="button" className="btn btn--destructive btn--sm" onClick={remove}>Delete</button>
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => setConfirmingDelete(false)}>Keep</button>
            </div>
          </div>
        )}

        <label className="vh" htmlFor="note-title">Title</label>
        <input
          id="note-title"
          className="editor__title"
          value={title}
          placeholder="Untitled note"
          disabled={loading}
          onChange={(e) => { setTitle(e.target.value); queueSave({ title: e.target.value.trim() || 'Untitled note' }); }}
        />

        <label className="vh" htmlFor="note-body">Note</label>
        <textarea
          id="note-body"
          ref={area}
          className="editor__body"
          style={{ marginTop: 'var(--space-4)' }}
          placeholder="Write what you noticed, or press the microphone to dictate."
          value={body}
          disabled={loading}
          onChange={(e) => { setBody(e.target.value); queueSave({ body: e.target.value }); }}
          onBlur={() => dictation.current?.stop()}
          onKeyDown={(e) => { if (e.key === 'Escape') { dictation.current?.stop(); e.currentTarget.blur(); } }}
        />

        <section style={{ marginTop: 'var(--space-12)' }}>
          <div className="row" style={{ gap: 'var(--space-3)', alignItems: 'baseline' }}>
            <h2 className="t-h3">Tasks</h2>
            <span className="t-label muted">
              {isShared
                ? 'Assign one and it lands on that person’s home screen.'
                : 'Available once this note is shared.'}
            </span>
          </div>
          <div style={{ marginTop: 'var(--space-4)' }}>
            <TaskBoard noteId={noteId} members={members} shared={isShared} />
          </div>
        </section>

        {micDenied && (
          <p className="t-label muted" style={{ marginTop: 'var(--space-2)' }}>
            Grove Studio can&rsquo;t reach the microphone. Type the note instead.
          </p>
        )}
      </div>
      {toast.node}
    </AppShell>
  );
}
