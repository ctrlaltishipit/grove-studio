import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Login from './routes/Login';
import StudioHome from './routes/StudioHome';
import Space from './routes/Space';
import StudioNote from './routes/StudioNote';
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
        {/* Grove Studio — the collaborative surface */}
        <Route path="/" element={<Login />} />
        <Route path="/home" element={<StudioHome />} />
        <Route path="/space/:spaceId" element={<Space />} />
        <Route path="/space/:spaceId/note/:noteId" element={<StudioNote />} />

        {/* Private-lane sessions — the corroboration mode. Joinable with no account. */}
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
