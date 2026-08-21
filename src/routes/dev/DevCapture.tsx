// Grove — DEV ONLY. Mounted only when import.meta.env.DEV. Lets Capture Mode
// be designed and verified before Supabase is wired. Not in a production build.
import { useState } from 'react';
import { Composer } from '../../ds/Composer';
import { Empty } from '../../ds/Empty';
import { Header } from '../../ds/Header';
import { Icon } from '../../ds/Icon';
import { NoteCard } from '../../ds/NoteCard';
import { OfflineBanner } from '../../ds/OfflineBanner';
import { QuestionBand } from '../../ds/QuestionBand';
import { RosterRail } from '../../ds/RosterRail';
import { RosterStrip } from '../../ds/RosterStrip';
import { useToast } from '../../ds/Toast';
import type { Note, NoteKind } from '../../lib/models';
import { ME, ownNotes, roster, session } from './fixtures';

export function DevCapture() {
  const [draft, setDraft] = useState('');
  const [notes, setNotes] = useState<Note[]>(ownNotes);
  const [collapsed, setCollapsed] = useState(false);
  const toast = useToast();
  const wide = typeof window !== 'undefined' && window.innerWidth >= 1024;

  const submit = (body: string, kind: NoteKind) => {
    const at = new Date().toISOString();
    setNotes((n) => [
      { id: `x${n.length}`, session_id: session.id, participant_id: ME, body, kind, created_at: at, updated_at: at },
      ...n,
    ]);
    setDraft('');
  };

  return (
    <>
      <Header
        linkHome={false}
        left={<span className="wordmark">Grove</span>}
        right={(
          <span className="codechip">
            <span className="t-tracked muted">Code</span>
            <span className="codechip__value">{session.join_code}</span>
            <button type="button" className="btn btn--ghost btn--icon" aria-label="Copy session code"
                    onClick={() => toast.show('Code copied.')}>
              <Icon name="copy" size={16} />
            </button>
          </span>
        )}
      />
      <OfflineBanner />
      {!wide && (
        <div className="page">
          <RosterStrip roster={roster} meId={ME} collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />
        </div>
      )}
      <main className="page" style={{ paddingTop: 'var(--space-6)', paddingBottom: 'var(--space-12)' }}>
        <QuestionBand question={session.research_question} />
        <div className="capture" style={{ marginTop: 'var(--space-8)' }}>
          <div className="capture__main">
            <Composer
              value={draft}
              onChange={setDraft}
              sticky={!wide}
              onSubmit={submit}
            />
            <div className="row" style={{ marginTop: 'var(--space-8)' }}>
              <h2 className="t-h3">Your notes</h2>
              <span className="t-label muted">— only you can see these</span>
              <span className="spacer" />
              <span className="t-badge">{notes.length}</span>
            </div>
            <div className="stack stack-4" style={{ marginTop: 'var(--space-4)' }}>
              {notes.length === 0 && <Empty>Your notes appear here. Only you can see them.</Empty>}
              {notes.map((n) => (
                <NoteCard key={n.id} note={n}
                  onSave={(id, body) => setNotes((all) => all.map((x) => (x.id === id ? { ...x, body } : x)))}
                  onDelete={(id) => setNotes((all) => all.filter((x) => x.id !== id))} />
              ))}
            </div>
            {!wide && (
              <button type="button" className="btn btn--primary btn--block" style={{ marginTop: 'var(--space-8)' }}>
                Synthesise
              </button>
            )}
          </div>
          {wide && (
            <div style={{ position: 'sticky', top: 'calc(56px + var(--space-8))', alignSelf: 'flex-start' }}>
              <RosterRail roster={roster} meId={ME} />
              <div style={{ marginTop: 'var(--space-8)', paddingLeft: 'var(--space-4)' }}>
                <button type="button" className="btn btn--primary btn--block">Synthesise</button>
              </div>
            </div>
          )}
        </div>
      </main>
      {toast.node}
    </>
  );
}
