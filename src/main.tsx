import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import { initTheme } from './lib/theme';
import App from './App';

// Theme is applied before the first React paint (and again by index.html
// before the bundle loads) so no user ever sees the wrong theme flash.
initTheme();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
