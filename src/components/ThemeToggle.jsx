import { useState } from 'react';
import { currentTheme, cycleTheme } from '../lib/theme';

const LABEL = { light: 'Light', dark: 'Dark', system: 'System' };

export default function ThemeToggle() {
  const [mode, setMode] = useState(() => currentTheme() ?? 'system');
  return (
    <button
      type="button"
      className="btn btn--quiet"
      onClick={() => setMode(cycleTheme() ?? 'system')}
      aria-label={`Appearance: ${LABEL[mode]}. Change appearance.`}
    >
      {LABEL[mode]}
    </button>
  );
}
