// Grove Studio — a space. Notes as tiles, Shared and Private as tabs.
//
// The split is a fact about the data, not a filter in the UI: the database
// will not return another member's private note by any route.
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AppShell } from '../ds/AppShell';
import { Chip } from '../ds/Chip';
import { Empty } from '../ds/Empty';
import { Icon } from '../ds/Icon';
import { OfflineBanner } from '../ds/OfflineBanner';
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
  const { spaceId = '' } = useParams<{ spaceId: string }>();
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
    try {
      const [m, n] = await Promise.all([getSpaceMembers(spaceId), listSpaceNotes(spaceId)]);
      setMembers(m); setNotes(n);
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

  // Shared notes are collaborative, so they move without you doing anything.
  useEffect(() => {
    if (!meId) return undefined;
    const t = setInterval(() => { void refresh(); }, POLL_MS);
    return () => clearInterval(t);
  }, [meId, refresh]);

  async function newNote(visibility: Tab) {
    if (!meId) return;
    setCreating(true);
    try {
      const n = await createSpaceNote({ projectId: spaceId, authorId: meId, visibility });
      navigate(`/space/${spaceId}/note/${n.id}`);
    } catch { setCreating(false); toast.show('That note didn’t save. Try again.'); }
  }

  const shared = notes.filter((n) => n.visibility === 'shared');
  const mine = notes.filter((n) => n.visibility === 'private' && n.author_id === meId);
  const shown = tab === 'shared' ? shared : mine;
  const nameOf = (id: string) => members.find((m) => m.member_id === id);

  const shellSpaces = spaces.map((s) => ({ id: s.id, name: s.name, shared_notes: s.shared_notes }));

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

      <div className="row" style={{ marginTop: 'var(--space-8)', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
        <div className="tabs" role="tablist" aria-label="Notes">
          <button type="button" role="tab" aria-selected={tab === 'shared'} className="tabs__item" onClick={() => setTab('shared')}>
            Shared · {shared.length}
          </button>
          <button type="button" role="tab" aria-selected={tab === 'private'} className="tabs__item" onClick={() => setTab('private')}>
            Private · {mine.length}
          </button>
        </div>
        <span className="spacer" />
        <button type="button" className="btn btn--primary btn--sm" disabled={creating || !meId} onClick={() => newNote(tab)}>
          New {tab} note
        </button>
      </div>

      <p className="t-label muted" style={{ marginTop: 'var(--space-3)' }}>
        {tab === 'shared'
          ? 'Everyone in this space can read these.'
          : 'Only you can see these. Share one when you are ready.'}
      </p>

      <div className="grid-notes" style={{ marginTop: 'var(--space-6)' }}>
        {loading && <p className="t-body muted">Loading notes.</p>}
        {!loading && shown.length === 0 && (
          <Empty>{tab === 'shared' ? 'No shared notes yet.' : 'Your private notes appear here. Only you can see them.'}</Empty>
        )}
        {shown.map((n) => {
          const author = nameOf(n.author_id);
          return (
            <Link
              key={n.id}
              to={`/space/${spaceId}/note/${n.id}`}
              className={`tile ${n.visibility === 'shared' ? 'tile--shared' : 'tile--private'}`}
            >
              <div className="tile__title">{n.title}</div>
              <div className="tile__body">{n.body.trim() || 'Empty'}</div>
              <div className="tile__foot">
                {author && <Chip name={author.display_name} colourIndex={author.colour_index} small />}
                <span className="t-micro muted">{author?.display_name}</span>
                <span className="spacer" />
                <span className="t-micro muted tabular">{relative(n.updated_at)}</span>
              </div>
            </Link>
          );
        })}
      </div>
      {toast.node}
    </AppShell>
  );
}
