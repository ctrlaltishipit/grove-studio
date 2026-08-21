// Grove — S1 Home. This screen must not sell. GROVE-MASTER.md §7 S1.
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CodeInput } from '../ds/CodeInput';
import { Header } from '../ds/Header';
import { OfflineBanner } from '../ds/OfflineBanner';
import { loadLastSession } from '../lib/storage';

export default function Home() {
  const [code, setCode] = useState('');
  const navigate = useNavigate();
  const last = loadLastSession();

  return (
    <>
      <Header linkHome={false} />
      <OfflineBanner />
      <main className="page col-content" style={{ paddingTop: 'var(--space-12)', paddingBottom: 'var(--space-12)' }}>
        <div className="center">
          <h1 className="t-display">Notes from three people who could not see each other.</h1>
          <p className="t-body muted" style={{ margin: 'var(--space-4) auto 0', maxWidth: '56ch' }}>
            {last ? 'Grove ranks findings by how many observers independently noted them.' : 'Create a session, or join one with a six-character code.'}
          </p>
        </div>

        <div className="home-cards" style={{ marginTop: 'var(--space-8)' }}>
          <section className="card">
            <h2 className="t-h3">Create a session</h2>
            <p className="t-label muted" style={{ marginTop: 'var(--space-2)' }}>You&rsquo;ll get a six-character code to read out.</p>
            <Link to="/create" className="btn btn--primary btn--block" style={{ marginTop: 'var(--space-4)', textDecoration: 'none' }}>
              Create a session
            </Link>
          </section>

          <section className="card">
            <h2 className="t-h3">Join a session</h2>
            <p className="t-label muted" style={{ marginTop: 'var(--space-2)' }}>Enter the code you were given.</p>
            <div style={{ marginTop: 'var(--space-4)' }}>
              <CodeInput value={code} onChange={setCode} />
            </div>
            <button
              type="button"
              className="btn btn--secondary btn--block"
              style={{ marginTop: 'var(--space-4)' }}
              disabled={code.length !== 6}
              onClick={() => navigate(`/join/${code}`)}
            >
              Join
            </button>
          </section>
        </div>

        {last && (
          <div className="card row" style={{ marginTop: 'var(--space-8)', padding: 'var(--space-3)' }}>
            <span>
              <span className="t-body">{last.title}</span>
              <span className="t-micro muted" style={{ display: 'block' }}>code {last.joinCode}</span>
            </span>
            <span className="spacer" />
            <Link to={`/s/${last.sessionId}`} className="btn btn--ghost btn--sm" style={{ textDecoration: 'none' }}>Rejoin</Link>
          </div>
        )}

        <p className="t-label muted center" style={{ marginTop: 'var(--space-12)' }}>
          Each observer&rsquo;s notes stay private until synthesis.
        </p>
      </main>
    </>
  );
}
