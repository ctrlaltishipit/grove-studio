// Grove Studio — home. A greeting, then your spaces as tiles.
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { User } from '@supabase/supabase-js';
import { AppShell } from '../ds/AppShell';
import { CodeInput } from '../ds/CodeInput';
import { Empty } from '../ds/Empty';
import { Mark } from '../ds/Mark';
import { MyWork } from '../ds/MyWork';
import { Notice } from '../ds/Notice';
import { OfflineBanner } from '../ds/OfflineBanner';
import { useToast } from '../ds/Toast';
import { awaitUser, identityOf, signOut } from '../lib/auth';
import { greeting, relative } from '../lib/greeting';
import type { MyTask, Space } from '../lib/models';
import { configured, createSpace, joinSpace, listMySpaces, myTasks, saveProfile } from '../lib/supabase';

export default function StudioHome() {
  const navigate = useNavigate();
  const toast = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [tasks, setTasks] = useState<MyTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [newName, setNewName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [busy, setBusy] = useState<'create' | 'join' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [s, mine] = await Promise.all([listMySpaces(), myTasks().catch(() => [] as MyTask[])]);
      setSpaces(s); setTasks(mine);
    } catch { setFailed(true); } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!configured) { setLoading(false); return; }
      const u = await awaitUser();
      if (cancelled) return;
      if (!u) { navigate('/', { replace: true }); return; }
      setUser(u);
      const id = identityOf(u);
      saveProfile({ user_id: u.id, display_name: id.displayName, avatar_url: id.avatarUrl }).catch(() => {});
      await load();
    })();
    return () => { cancelled = true; };
  }, [navigate, load]);

  const me = identityOf(user);
  const openTasks = tasks.filter((x) => x.status !== 'done').length;
  const firstName = me.displayName.split(' ')[0];

  async function create(e: FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setBusy('create'); setError(null);
    try {
      const space = await createSpace(newName, me.displayName);
      navigate(`/space/${space.id}`);
    } catch { setError('Couldn’t create that space. Nothing was saved. Try again.'); setBusy(null); }
  }

  async function join(e: FormEvent) {
    e.preventDefault();
    if (joinCode.length !== 6) return;
    setBusy('join'); setError(null);
    try {
      const member = await joinSpace(joinCode, me.displayName);
      if (!member) { setError('No space with that code. Check the six characters and try again.'); setBusy(null); return; }
      navigate(`/space/${(member as unknown as { project_id: string }).project_id}`);
    } catch { setError('No space with that code. Check the six characters and try again.'); setBusy(null); }
  }

  return (
    <AppShell
      spaces={spaces.map((s) => ({ id: s.id, name: s.name, shared_notes: s.shared_notes }))}
      onSignOut={async () => { await signOut(); navigate('/', { replace: true }); }}
    >
      <OfflineBanner />

      <div className="pagehead">
        {me.avatarUrl
          ? <img src={me.avatarUrl} alt="" width={48} height={48} style={{ borderRadius: '999px', flex: 'none' }} />
          : <Mark size={48} />}
        <div className="pagehead__title">
          <h1 className="t-h1">{greeting()}, {firstName}.</h1>
          <p className="t-body muted" style={{ marginTop: 'var(--space-1)' }}>
            {openTasks > 0
              ? `${openTasks} ${openTasks === 1 ? 'task is' : 'tasks are'} assigned to you.`
              : spaces.length === 0
                ? 'Create a space to write in, or join one with a code.'
                : `${spaces.length} ${spaces.length === 1 ? 'space' : 'spaces'}. Pick up where you left off.`}
          </p>
        </div>
      </div>

      {error && <div style={{ marginTop: 'var(--space-6)' }}><Notice>{error}</Notice></div>}

      <MyWork tasks={tasks} onChange={() => { void load(); }} />

      <div className="grid-spaces" style={{ marginTop: 'var(--space-8)' }}>
        <form onSubmit={create} className="tile">
          <div className="tile__title">New space</div>
          <p className="tile__meta">A place to write together. You&rsquo;ll get a code to share.</p>
          <input
            className="input" style={{ marginTop: 'var(--space-4)' }} value={newName} disabled={busy !== null}
            placeholder="Clinic booking research" aria-label="Space name"
            onChange={(e) => setNewName(e.target.value)}
          />
          <button type="submit" className="btn btn--primary btn--block" style={{ marginTop: 'var(--space-3)' }} disabled={busy !== null || !newName.trim()}>
            {busy === 'create' ? 'Creating.' : 'Create space'}
          </button>
        </form>

        <form onSubmit={join} className="tile">
          <div className="tile__title">Join a space</div>
          <p className="tile__meta">Paste the six-character code someone shared with you.</p>
          <div style={{ marginTop: 'var(--space-4)' }}>
            <CodeInput value={joinCode} onChange={setJoinCode} disabled={busy !== null} />
          </div>
          <button type="submit" className="btn btn--secondary btn--block" style={{ marginTop: 'var(--space-3)' }} disabled={busy !== null || joinCode.length !== 6}>
            {busy === 'join' ? 'Joining.' : 'Join'}
          </button>
        </form>
      </div>

      <div className="row" style={{ marginTop: 'var(--space-12)' }}>
        <h2 className="t-h3">Your spaces</h2>
        <span className="spacer" />
        {!loading && <span className="t-badge">{spaces.length}</span>}
      </div>

      <div className="grid-spaces" style={{ marginTop: 'var(--space-4)' }}>
        {loading && <p className="t-body muted">Loading your spaces.</p>}
        {failed && !loading && <Notice>Couldn&rsquo;t load your spaces. Try refreshing.</Notice>}
        {!loading && !failed && spaces.length === 0 && (
          <Empty>Nothing here yet. Create a space, or join one with a code.</Empty>
        )}
        {spaces.map((s) => (
          <Link key={s.id} to={`/space/${s.id}`} className="tile">
            <div className="tile__title">{s.name}</div>
            <div className="tile__meta">
              {s.member_count} {s.member_count === 1 ? 'member' : 'members'} · {s.shared_notes} shared
              {s.my_private_notes > 0 && <> · {s.my_private_notes} private</>}
            </div>
            <div className="tile__foot">
              <span className="t-micro muted">{relative(s.last_activity)}</span>
              <span className="spacer" />
              <span className="codechip__value" style={{ fontSize: 13 }}>{s.join_code}</span>
            </div>
          </Link>
        ))}
      </div>
      {toast.node}
    </AppShell>
  );
}
