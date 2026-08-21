import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Home from './routes/Home';
import Create from './routes/Create';
import Join from './routes/Join';
import Capture from './routes/Capture';
import Findings from './routes/Findings';
import { Styleguide } from './routes/Styleguide';
import { DevCapture } from './routes/dev/DevCapture';
import { DevFindings } from './routes/dev/DevFindings';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/create" element={<Create />} />
        <Route path="/join" element={<Join />} />
        <Route path="/join/:code" element={<Join />} />
        <Route path="/s/:sessionId" element={<Capture />} />
        <Route path="/s/:sessionId/findings" element={<Findings />} />
        <Route path="/styleguide" element={<Styleguide />} />
        {/* Fixture data. Dev builds only — a production build must never render fabricated findings. */}
        {import.meta.env.DEV && <Route path="/__preview/capture" element={<DevCapture />} />}
        {import.meta.env.DEV && <Route path="/__preview/findings" element={<DevFindings />} />}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
