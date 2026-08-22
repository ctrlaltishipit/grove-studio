// Grove Studio — the first screen after signing in.
//
// A greeting, your spaces, and two ways to act. Everything a returning person
// needs and nothing they don't: no announcements feed, no activity stream, no
// counters that exist to be watched. §7 S1's rule still applies — this screen
// does not sell, it gets you back to your work.
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { User } from '@supabase/supabase-js';
import { CodeInput } from '../ds/CodeInput';
import { Empty } from '../ds/Empty';
import { Header } from '../ds/Header';
import { Mark } from '../ds/Mark';
import { Notice } from '../ds/Notice';
import { OfflineBanner } from '../ds/OfflineBanner';
import { useToast } from '../ds/Toast';
import { awaitUser, identityOf, signOut } from '../lib/auth';
import { greeting, relative } from '../lib/greeting';
import type { Space } from '../lib/models';
import { configured, createSpace, joinSpace, listMySpaces, saveProfile } from '../lib/supabase';

export default function StudioHome() {
  const navigate = useNavigate();
  const toast = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [newName, setNewName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [busy, setBusy] = useState<'create' | 'join' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setSpaces(await listMySpaces());
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!configured) { setLoading(false); return; }
      const u = await awaitUser();
      if (cancelled) return;
      if (!u) { navigate('/', { replace: true }); return; }
      setUser(u);
      // Persist name and avatar after the OAuth round trip so the greeting and
      // member chips have something to show. Failure here is cosmetic only.
      const id = identityOf(u);
      saveProfile({ user_id: u.id, display_name: id.displayName, avatar_url: id.avatarUrl }).catch(() => {});
      await load();
    })();
    return () => { cancelled = true; };
  }, [navigate, load]);

  const me = identityOf(user);
  const firstName = me.displayName.split(' ')[0];

  async function create(e: FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setBusy('create');
    setError(null);
    try {
      const space = await createSpace(newName, me.displayName);
      navigate(`/space/${space.id}`);
    } catch {
      setError('Couldn’t create that space. Nothing was saved. Try again.');
      setBusy(null);
    }
  }

  async function join(e: FormEvent) {
    e.preventDefault();
    if (joinCode.length !== 6) return;
    setBusy('join');
    setError(null);
    try {
      const member = await joinSpace(joinCode, me.displayName);
      if (!member) { setError('No space with that code. Check the six characters and try again.'); setBusy(null); return; }
      navigate(`/space/${(member as unknown as { project_id: string }).project_id}`);
    } catch {
      setError('No space with that code. Check the six characters and try again.');
      setBusy(null);
    }
  }

  return (
    <>
      <Header
        linkHome={false}
        left={<span className="wordmark">Grove Studio</span>}
        right={
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={async () => { await signOut(); navigate('/', { replace: true }); }}
          >
            Sign out
          </button>
        }
      />
      <OfflineBanner />

      <main className="page col-content" style={{ paddingTop: 'var(--space-12)', paddingBottom: 'var(--space-12)' }}>
        <div className="row" style={{ gap: 'var(--space-4)' }}>
          {me.avatarUrl
            ? <img src={me.avatarUrl} alt="" width={44} height={44} style={{ borderRadius: '999px' }} />
            : <Mark size={44} />}
          <h1 className="t-h1">{greeting()}, {firstName}.</h1>
        </div>

        {error && <div style={{ marginTop: 'var(--space-6)' }}><Notice>{error}</Notice></div>}

        <div className="home-cards" style={{ marginTop: 'var(--space-8)' }}>
          <section className="card">
            <h2 className="t-h3">New space</h2>
            <p className="t-label muted" style={{ marginTop: 'var(--space-2)' }}>
              A place to write together. You&rsquo;ll get a code to share.
            </p>
            <form onSubmit={create} style={{ marginTop: 'var(--space-4)' }}>
              <label className="vh" htmlFor="space-name">Space name</label>
              <input
                id="space-name" className="input" value={newName} disabled={busy !== null}
                placeholder="Clinic booking research"
                onChange={(e) => setNewName(e.target.value)}
              />
              <button type="submit" className="btn btn--primary btn--block" style={{ marginTop: 'var(--space-4)' }} disabled={busy !== null || !newName.trim()}>
                {busy === 'create' ? 'Creating.' : 'Create space'}
              </button>
            </form>
          </section>

          <section className="card">
            <h2 className="t-h3">Join a space</h2>
            <p className="t-label muted" style={{ marginTop: 'var(--space-2)' }}>Enter the six-character code.</p>
            <form onSubmit={join} style={{ marginTop: 'var(--space-4)' }}>
              <CodeInput value={joinCode} onChange={setJoinCode} disabled={busy !== null} />
              <button type="submit" className="btn btn--secondary btn--block" style={{ marginTop: 'var(--space-4)' }} disabled={busy !== null || joinCode.length !== 6}>
                {busy === 'join' ? 'Joining.' : 'Join'}
              </button>
            </form>
          </section>
        </div>

        <div className="row" style={{ marginTop: 'var(--space-12)' }}>
          <h2 className="t-h3">Your spaces</h2>
          <span className="spacer" />
          {!loading && <span className="t-badge">{spaces.length}</span>}
        </div>

        <div className="stack stack-3" style={{ marginTop: 'var(--space-4)' }}>
          {loading && <p className="t-body muted">Loading your spaces.</p>}
          {failed && !loading && <Notice>Couldn&rsquo;t load your spaces. Try refreshing.</Notice>}
          {!loading && !failed && spaces.length === 0 && (
            <Empty>Nothing here yet. Create a space, or join one with a code.</Empty>
          )}
          {spaces.map((s) => (
            <Link
              key={s.id}
              to={`/space/${s.id}`}
              className="card row"
              style={{ textDecoration: 'none', color: 'inherit', padding: 'var(--space-4)' }}
            >
              <span style={{ minWidth: 0 }}>
                <span className="t-h3" style={{ display: 'block' }}>{s.name}</span>
                <span className="t-micro muted" style={{ display: 'block', marginTop: 4 }}>
                  {s.member_count} {s.member_count === 1 ? 'member' : 'members'}
                  {' · '}{s.shared_notes} shared
                  {s.my_private_notes > 0 && <> · {s.my_private_notes} private</>}
                  {' · '}{relative(s.last_activity)}
                </span>
              </span>
              <span className="spacer" />
              <span className="codechip__value" aria-label={`Join code ${s.join_code}`}>{s.join_code}</span>
            </Link>
          ))}
        </div>
      </main>
      {toast.node}
    </>
  );
}
