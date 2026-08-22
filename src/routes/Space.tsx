// Grove Studio — a space, as a workspace (A16).
//
// Three panes: who wrote what, the note itself, and what you can make from
// the space. The arrangement is borrowed from the notebook tools, the
// contents are not — their left column is a pile of source documents, ours
// is people, so it carries identity colours and authors. Their right column
// is a grid of equally loud generators; ours is a reading list that says
// what each artefact is before you spend a minute on it.
//
// The Shared/Private split is a fact about the data, not a filter: the
// database will not return another member's private note by any route, so
// the tab cannot leak one.
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AppShell } from '../ds/AppShell';
import { Chip } from '../ds/Chip';
import { Empty } from '../ds/Empty';
import { Icon } from '../ds/Icon';
import { NoteEditor } from '../ds/NoteEditor';
import { OfflineBanner } from '../ds/OfflineBanner';
import { StudioPanel, type Artefact } from '../ds/StudioPanel';
import { useToast } from '../ds/Toast';
import { awaitUser } from '../lib/auth';
import { POLL_MS } from '../lib/config';
import { relative } from '../lib/greeting';
import type { Space as SpaceRow, SpaceMember, SpaceNote } from '../lib/models';
import {
  configured, createSpaceNote, getSpace, getSpaceMembers, listMySpaces, listSpaceNotes,
} from '../lib/supabase';

type Tab = 'shared' | 'private';

export default function Space() {
  const { spaceId = '', noteId } = useParams<{ spaceId: string; noteId?: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const [space, setSpace] = useState<{ id: string; name: string; join_code: string } | null>(null);
  const [spaces, setSpaces] = useState<SpaceRow[]>([]);
  const [members, setMembers] = useState<SpaceMember[]>([]);
  const [notes, setNotes] = useState<SpaceNote[]>([]);
  const [meId, setMeId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('shared');
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [creating, setCreating] = useState(false);

  const refresh = useCallback(async () => {
    try { setNotes(await listSpaceNotes(spaceId)); } catch { /* the next tick retries */ }
  }, [spaceId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!configured) { setLoading(false); return; }
      const u = await awaitUser();
      if (cancelled) return;
      if (!u) { navigate('/', { replace: true }); return; }
      try {
        const s = await getSpace(spaceId);
        if (cancelled) return;
        if (!s) { setFailed(true); setLoading(false); return; }
        setSpace(s);
        listMySpaces().then((all) => { if (!cancelled) setSpaces(all); }).catch(() => {});
        const m = await getSpaceMembers(spaceId);
        if (cancelled) return;
        setMembers(m);
        setMeId(m.find((x) => x.user_id === u.id)?.member_id ?? null);
        setNotes(await listSpaceNotes(spaceId));
      } catch { setFailed(true); } finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [spaceId, navigate]);

  // Shared notes are collaborative, so the rail moves without you doing
  // anything. The open note is left alone — refreshing under someone's
  // cursor is how a half-typed sentence disappears.
  useEffect(() => {
    if (!meId) return undefined;
    const t = setInterval(() => { void refresh(); }, POLL_MS);
    return () => clearInterval(t);
  }, [meId, refresh]);

  // Follow the note you are looking at. Opening a private note from a link
  // should not leave the rail showing the shared tab and no selection.
  useEffect(() => {
    if (!noteId) return;
    const n = notes.find((x) => x.id === noteId);
    if (n) setTab(n.visibility === 'shared' ? 'shared' : 'private');
  }, [noteId, notes]);

  async function newNote(visibility: Tab) {
    if (!meId) return;
    setCreating(true);
    try {
      const n = await createSpaceNote({ projectId: spaceId, authorId: meId, visibility });
      await refresh();
      navigate(`/space/${spaceId}/note/${n.id}`);
    } catch { toast.show('That note didn’t save. Try again.'); }
    finally { setCreating(false); }
  }

  const shared = notes.filter((n) => n.visibility === 'shared');
  const mine = notes.filter((n) => n.visibility === 'private' && n.author_id === meId);
  const shown = tab === 'shared' ? shared : mine;
  const shellSpaces = spaces.map((s) => ({ id: s.id, name: s.name, shared_notes: s.shared_notes }));
  const openNote = noteId ? notes.find((n) => n.id === noteId) : undefined;

  const artefacts: Artefact[] = [
    {
      id: 'findings', name: 'Findings', colour: 0, ready: shared.length >= 2,
      note: shared.length >= 2
        ? `Group ${shared.length} shared notes by what they agree on`
        : 'Needs at least two shared notes',
      onOpen: () => toast.show('Findings run on a session. Start one from the sidebar.'),
    },
    { id: 'mindmap', name: 'Mind map', colour: 1, ready: false, note: 'Not built yet' },
    { id: 'slides',  name: 'Slide deck', colour: 2, ready: false, note: 'Not built yet' },
    { id: 'audio',   name: 'Audio overview', colour: 3, ready: false, note: 'Not built yet' },
  ];

  if (failed) {
    return (
      <AppShell spaces={shellSpaces} activeSpaceId={spaceId}>
        <Empty action={<Link to="/home" className="btn btn--secondary btn--sm" style={{ textDecoration: 'none' }}>Back to your spaces</Link>}>
          That space isn&rsquo;t available. You may need the join code.
        </Empty>
      </AppShell>
    );
  }

  return (
    <AppShell spaces={shellSpaces} activeSpaceId={spaceId}>
      <OfflineBanner />

      <div className="pagehead">
        <div className="pagehead__title">
          <h1 className="t-h1">{space?.name ?? 'Space'}</h1>
          <div className="row" style={{ marginTop: 'var(--space-3)', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            {members.map((m) => (
              <Chip key={m.member_id} name={m.display_name} colourIndex={m.colour_index} small self={m.member_id === meId} />
            ))}
            <span className="t-label muted" style={{ marginLeft: 'var(--space-1)' }}>
              {members.length} {members.length === 1 ? 'member' : 'members'}
            </span>
          </div>
        </div>
        {space && (
          <span className="codechip">
            <span className="t-tracked muted">Code</span>
            <span className="codechip__value">{space.join_code}</span>
            <button
              type="button" className="btn btn--ghost btn--icon" aria-label="Copy space code"
              onClick={() => { void navigator.clipboard?.writeText(space.join_code); toast.show('Code copied.'); }}
            >
              <Icon name="copy" size={16} />
            </button>
          </span>
        )}
      </div>

      <div className="wsp" style={{ marginTop: 'var(--space-8)' }}>
        {/* ---- notes rail ---- */}
        <section className="pane pane--flush" aria-label="Notes">
          <div className="tabs" role="tablist" aria-label="Notes" style={{ display: 'flex', width: '100%' }}>
            <button type="button" role="tab" aria-selected={tab === 'shared'} className="tabs__item"
                    style={{ flex: 1 }} onClick={() => setTab('shared')}>
              Shared · {shared.length}
            </button>
            <button type="button" role="tab" aria-selected={tab === 'private'} className="tabs__item"
                    style={{ flex: 1 }} onClick={() => setTab('private')}>
              Private · {mine.length}
            </button>
          </div>

          <button
            type="button" className="btn btn--secondary btn--block btn--sm"
            style={{ marginTop: 'var(--space-3)' }}
            disabled={creating || !meId} onClick={() => newNote(tab)}
          >
            New {tab} note
          </button>

          <div className="pane__scroll" style={{ marginTop: 'var(--space-3)' }}>
            {loading && <p className="t-label muted" style={{ padding: 'var(--space-3)' }}>Loading.</p>}
            {!loading && shown.length === 0 && (
              <p className="t-label muted" style={{ padding: 'var(--space-3)' }}>
                {tab === 'shared' ? 'No shared notes yet.' : 'Only you can see what you put here.'}
              </p>
            )}
            {shown.map((n) => {
              const author = members.find((m) => m.member_id === n.author_id);
              return (
                <Link
                  key={n.id}
                  to={`/space/${spaceId}/note/${n.id}`}
                  className="noterow"
                  aria-current={n.id === noteId}
                >
                  <span className="noterow__title">{n.title}</span>
                  <span className="noterow__meta">
                    <span className="noterow__dot" style={{ background: `var(--observer-${(author?.colour_index ?? 0) + 1})` }} />
                    {author?.display_name ?? 'Someone'}
                    <span className="spacer" />
                    <span className="tabular">{relative(n.updated_at)}</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        {/* ---- canvas ---- */}
        <section className="pane" aria-label="Note">
          {openNote || noteId ? (
            <NoteEditor
              key={noteId}
              spaceId={spaceId}
              noteId={noteId as string}
              onChanged={() => { void refresh(); }}
              onDeleted={() => { void refresh(); navigate(`/space/${spaceId}`); }}
            />
          ) : (
            <div className="wsp__empty">
              <div>
                <p className="t-h3">Pick a note, or start one.</p>
                <p className="t-body muted" style={{ marginTop: 'var(--space-2)', maxWidth: '42ch' }}>
                  Shared notes are read by everyone here. Private notes are yours until
                  you decide otherwise.
                </p>
              </div>
            </div>
          )}
        </section>

        {/* ---- studio ---- */}
        <StudioPanel
          artefacts={artefacts}
          footer={
            <p className="t-micro muted" style={{ marginTop: 'var(--space-3)', lineHeight: 1.5 }}>
              Artefacts are made from the shared notes only. Nothing private is read.
            </p>
          }
        />
      </div>
      {toast.node}
    </AppShell>
  );
}
