import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { initTheme } from './lib/theme';
import './styles/tokens.css';
import './styles/base.css';
import './styles/app.css';
import './styles/app-polish.css';
import './styles/site.css';
import './styles/site-visuals.css';

// Theme before first paint, so dark-mode users never see a light flash.
initTheme();

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
