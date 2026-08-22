import { Link, useNavigate } from 'react-router-dom';
import { loadLastSession } from '../lib/local';

export default function Landing() {
  const navigate = useNavigate();
  const last = loadLastSession();

  return (
    <div className="page page--narrow stack-6">
      <div className="stack">
        <h1>Several people watched the same session. Only one version survives.</h1>
        <p className="t-muted">
          Grove Studio gives every observer a private lane. You can see that the others are writing.
          You cannot see what they wrote. When you are done, one merge ranks every finding by
          how many observers independently noticed it.
        </p>
      </div>

      <div className="stack">
        <button type="button" className="btn btn--primary btn--block" onClick={() => navigate('/create')}>
          Start a session
        </button>
        <button type="button" className="btn btn--block" onClick={() => navigate('/join')}>
          Join with a code
        </button>
        {last?.sessionId ? (
          <Link className="btn btn--block" to={`/s/${last.sessionId}`}>
            Rejoin {last.title ? `“${last.title}”` : 'your last session'}
          </Link>
        ) : null}
      </div>

      <hr className="divider" />

      <div className="stack-2 t-small t-muted">
        <p>
          Grove Studio records no audio and joins no calls. It reads only what the people in the room
          chose to write down.
        </p>
        <p>
          Groups that recall together retrieve less than the same people recalling separately
          and pooling afterwards. Grove Studio is built on that finding rather than around it.
        </p>
      </div>
    </div>
  );
}
