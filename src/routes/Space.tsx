// Grove Studio — a space: shared notes, and your own private ones.
//
// THE BOUNDARY THIS SCREEN DRAWS:
//   "Shared" is everything the space can read. "Private" is yours — the
//   database will not return another member's private note to you by any
//   route, so this split is a fact about the data, not a filter in the UI.
//   Promotion is one-way and the button says so.
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Chip } from '../ds/Chip';
import { Empty } from '../ds/Empty';
import { Header } from '../ds/Header';
import { Icon } from '../ds/Icon';
import { OfflineBanner } from '../ds/OfflineBanner';
import { useToast } from '../ds/Toast';
import { awaitUser } from '../lib/auth';
import { relative } from '../lib/greeting';
import type { SpaceMember, SpaceNote } from '../lib/models';
import { POLL_MS } from '../lib/config';
import {
  configured, createSpaceNote, getSpace, getSpaceMembers, listSpaceNotes,
} from '../lib/supabase';

export default function Space() {
  const { spaceId = '' } = useParams<{ spaceId: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const [space, setSpace] = useState<{ id: string; name: string; join_code: string } | null>(null);
  const [members, setMembers] = useState<SpaceMember[]>([]);
  const [notes, setNotes] = useState<SpaceNote[]>([]);
  const [meId, setMeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [creating, setCreating] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [m, n] = await Promise.all([getSpaceMembers(spaceId), listSpaceNotes(spaceId)]);
      setMembers(m);
      setNotes(n);
    } catch { /* the next tick retries */ }
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
        const m = await getSpaceMembers(spaceId);
        if (cancelled) return;
        setMembers(m);
        setMeId(m.find((x) => x.user_id === u.id)?.member_id ?? null);
        setNotes(await listSpaceNotes(spaceId));
      } catch {
        setFailed(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [spaceId, navigate]);

  // Shared notes are collaborative, so they move without you doing anything.
  // Polling, not a socket: a three-second delay is invisible, a dead feed is not.
  useEffect(() => {
    if (!meId) return undefined;
    const t = setInterval(() => { void refresh(); }, POLL_MS);
    return () => clearInterval(t);
  }, [meId, refresh]);

  async function newNote(visibility: 'private' | 'shared') {
    if (!meId) return;
    setCreating(true);
    try {
      const n = await createSpaceNote({ projectId: spaceId, authorId: meId, visibility });
      navigate(`/space/${spaceId}/note/${n.id}`);
    } catch {
      setCreating(false);
      toast.show('That note didn’t save. Try again.');
    }
  }

  const shared = notes.filter((n) => n.visibility === 'shared');
  const mine = notes.filter((n) => n.visibility === 'private' && n.author_id === meId);
  const nameOf = (authorId: string) => members.find((m) => m.member_id === authorId);

  const NoteRow = ({ n }: { n: SpaceNote }) => {
    const author = nameOf(n.author_id);
    return (
      <Link
        to={`/space/${spaceId}/note/${n.id}`}
        className="card"
        style={{ textDecoration: 'none', color: 'inherit', padding: 'var(--space-4)', display: 'block' }}
      >
        <span className="row" style={{ gap: 'var(--space-3)' }}>
          {author && <Chip name={author.display_name} colourIndex={author.colour_index} small />}
          <span style={{ minWidth: 0, flex: 1 }}>
            <span className="t-h3" style={{ display: 'block' }}>{n.title}</span>
            <span className="t-micro muted" style={{ display: 'block', marginTop: 2 }}>
              {n.body.trim() ? `${n.body.trim().slice(0, 90)}${n.body.length > 90 ? '…' : ''}` : 'Empty'}
            </span>
          </span>
          <span className="t-micro muted tabular">{relative(n.updated_at)}</span>
        </span>
      </Link>
    );
  };

  if (failed) {
    return (
      <>
        <Header />
        <main className="page col-content" style={{ paddingTop: 'var(--space-8)' }}>
          <Empty action={<Link to="/home" className="btn btn--secondary btn--sm" style={{ textDecoration: 'none' }}>Back to your spaces</Link>}>
            That space isn&rsquo;t available. You may need the join code.
          </Empty>
        </main>
      </>
    );
  }

  return (
    <>
      <Header
        left={<Link to="/home" className="btn btn--ghost btn--sm" style={{ textDecoration: 'none' }}>All spaces</Link>}
        right={space && (
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
      />
      <OfflineBanner />

      <main className="page col-content" style={{ paddingTop: 'var(--space-6)', paddingBottom: 'var(--space-12)' }}>
        <h1 className="t-h1">{space?.name ?? 'Space'}</h1>

        <div className="row" style={{ marginTop: 'var(--space-3)', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          {members.map((m) => (
            <Chip key={m.member_id} name={m.display_name} colourIndex={m.colour_index} small self={m.member_id === meId} />
          ))}
          <span className="t-label muted" style={{ marginLeft: 'var(--space-2)' }}>
            {members.length} {members.length === 1 ? 'member' : 'members'}
          </span>
        </div>

        <div className="row" style={{ marginTop: 'var(--space-8)', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn--primary" disabled={creating || !meId} onClick={() => newNote('shared')}>
            New shared note
          </button>
          <button type="button" className="btn btn--secondary" disabled={creating || !meId} onClick={() => newNote('private')}>
            New private note
          </button>
          <span className="spacer" />
          <Link to="/create" className="btn btn--ghost btn--sm" style={{ textDecoration: 'none' }}>
            Run a private-lane session
          </Link>
        </div>

        <section style={{ marginTop: 'var(--space-12)' }}>
          <div className="row">
            <h2 className="t-h3">Shared</h2>
            <span className="t-label muted">— everyone in this space can read these</span>
            <span className="spacer" />
            <span className="t-badge">{shared.length}</span>
          </div>
          <div className="stack stack-3" style={{ marginTop: 'var(--space-4)' }}>
            {loading && <p className="t-body muted">Loading notes.</p>}
            {!loading && shared.length === 0 && <Empty>No shared notes yet.</Empty>}
            {shared.map((n) => <NoteRow key={n.id} n={n} />)}
          </div>
        </section>

        <section style={{ marginTop: 'var(--space-12)' }}>
          <div className="row">
            <h2 className="t-h3">Private</h2>
            <span className="t-label muted">— only you can see these</span>
            <span className="spacer" />
            <span className="t-badge">{mine.length}</span>
          </div>
          <div className="stack stack-3" style={{ marginTop: 'var(--space-4)' }}>
            {!loading && mine.length === 0 && <Empty>Your private notes appear here. Only you can see them.</Empty>}
            {mine.map((n) => <NoteRow key={n.id} n={n} />)}
          </div>
        </section>
      </main>
      {toast.node}
    </>
  );
}
