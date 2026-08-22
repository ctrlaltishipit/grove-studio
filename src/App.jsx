import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { ToastProvider, AuthProvider, DataProvider, StudioProvider, useAuth } from './state/Store';
import Landing from './routes/Landing';
import SignIn from './routes/SignIn';
import Home from './routes/Home';
import Space from './routes/Space';
import Sidebar from './components/Sidebar';
import ModalHost from './components/Modals';
import StudioRail from './components/StudioRail';
import Toasts from './components/Toasts';
import { Spinner } from './components/ui';

function AppShell() {
  const { user, loading } = useAuth();
  const [navOpen, setNavOpen] = useState(false);
  if (loading) {
    return <div className="signin-wrap"><Spinner /></div>;
  }
  if (!user) return <Navigate to="/signin" replace />;
  return (
    <DataProvider>
      <StudioProvider>
        <div className="shell">
          <Sidebar open={navOpen} onNavigate={() => setNavOpen(false)} />
          {navOpen && <button className="nav-veil" aria-label="Close menu" onClick={() => setNavOpen(false)} />}
          <div className="shell-main">
            <div className="mobile-topbar">
              <button className="burger" aria-label="Menu" onClick={() => setNavOpen(true)}>
                <svg width="16" height="16" viewBox="0 0 16 16">
                  <path d="M2.5 4.5 h11 M2.5 8 h11 M2.5 11.5 h11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </button>
              <span style={{ fontWeight: 700, fontSize: 15.5, letterSpacing: '-0.01em' }}>
                Grove<em style={{ fontStyle: 'normal', color: 'var(--acc-deep)' }}>Studio</em>
              </span>
            </div>
            <Outlet />
          </div>
          <StudioRail />
        </div>
        <ModalHost />
      </StudioProvider>
    </DataProvider>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/signin" element={<SignIn />} />
            <Route path="/app" element={<AppShell />}>
              <Route index element={<Home />} />
              <Route path="s/:spaceId" element={<Space />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
        <Toasts />
      </AuthProvider>
    </ToastProvider>
  );
}
