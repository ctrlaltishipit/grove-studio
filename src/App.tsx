import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Styleguide } from './routes/Styleguide';
import { DevCapture } from './routes/dev/DevCapture';
import { DevFindings } from './routes/dev/DevFindings';

// Routes are added phase by phase. Until Phase 2 lands, every path renders the
// wordmark so the build, the theme and the tokens can be verified.
function Placeholder() {
  return (
    <main className="page col-content" style={{ paddingTop: 'var(--space-12)' }}>
      <span className="wordmark">Grove</span>
      <p className="t-body muted" style={{ marginTop: 'var(--space-4)' }}>Scaffold. Routes arrive in Phase 2.</p>
    </main>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Placeholder />} />
        <Route path="/styleguide" element={<Styleguide />} />
        {/* Fixture data. Dev builds only — a production build must never
            render fabricated findings. */}
        {import.meta.env.DEV && <Route path="/__preview/capture" element={<DevCapture />} />}
        {import.meta.env.DEV && <Route path="/__preview/findings" element={<DevFindings />} />}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
