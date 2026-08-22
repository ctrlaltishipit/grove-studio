import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import Landing from './routes/Landing';
import Create from './routes/Create';
import Join from './routes/Join';
import Capture from './routes/Capture';
import Findings from './routes/Findings';
import ThemeToggle from './components/ThemeToggle';
import { configError } from './lib/supabase';

// Router only. No state lives here.
export default function App() {
  return (
    <BrowserRouter>
      <header className="topbar">
        <div className="topbar__inner">
          <Link to="/" className="brand" aria-label="Grove Studio home">
            <span className="brand__mark" aria-hidden="true" />
            Grove Studio
          </Link>
          <ThemeToggle />
        </div>
      </header>

      {configError ? (
        <div className="page"><div className="notice">{configError}</div></div>
      ) : (
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/create" element={<Create />} />
          <Route path="/join/:code?" element={<Join />} />
          <Route path="/s/:sessionId" element={<Capture />} />
          <Route path="/s/:sessionId/findings" element={<Findings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      )}
    </BrowserRouter>
  );
}
