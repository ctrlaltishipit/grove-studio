// Grove Studio — the app shell. GROVE-MASTER.md §16 amendment A14.
//
// A persistent sidebar carrying the things a person returns to (home, their
// spaces) and a wide content area for the thing they came to do. Depth is
// surface contrast and hairlines — §6.4's two elevation levels still stand,
// and nothing here casts a shadow.
import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Mark } from './Mark';
import { ThemeToggle } from './ThemeToggle';

export interface ShellSpace { id: string; name: string; shared_notes: number }

export interface AppShellProps {
  spaces?: ShellSpace[];
  activeSpaceId?: string;
  onSignOut?: () => void;
  children: ReactNode;
}

export function AppShell({ spaces = [], activeSpaceId, onSignOut, children }: AppShellProps) {
  const { pathname } = useLocation();

  return (
    <div className="shell">
      <aside className="shell__side" aria-label="Navigation">
        <Link to="/home" className="shell__brand">
          <Mark size={22} />
          Grove Studio
        </Link>

        <Link to="/home" className="navitem" aria-current={pathname === '/home' ? 'page' : undefined}>
          <span className="navitem__text">Home</span>
        </Link>
        <Link to="/create" className="navitem" aria-current={pathname === '/create' ? 'page' : undefined}>
          <span className="navitem__text">New session</span>
        </Link>

        {spaces.length > 0 && (
          <>
            <div className="shell__label">Spaces</div>
            {spaces.map((s) => (
              <Link
                key={s.id}
                to={`/space/${s.id}`}
                className="navitem"
                aria-current={s.id === activeSpaceId ? 'page' : undefined}
              >
                <span className="navitem__dot" aria-hidden="true" />
                <span className="navitem__text">{s.name}</span>
                <span className="navitem__count">{s.shared_notes}</span>
              </Link>
            ))}
          </>
        )}

        <div className="shell__foot">
          <div className="row" style={{ gap: 'var(--space-2)' }}>
            {onSignOut && (
              <button type="button" className="navitem" onClick={onSignOut}>
                <span className="navitem__text">Sign out</span>
              </button>
            )}
            <span className="spacer" />
            <ThemeToggle />
          </div>
        </div>
      </aside>

      <main className="shell__main">
        <div className="shell__inner">{children}</div>
      </main>
    </div>
  );
}
