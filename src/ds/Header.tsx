// Grove — shared header chrome. GROVE-MASTER.md §8.16–8.19.
// `nav` is an optional slot between the wordmark and the spacer. Empty in
// MVP; MVP+ uses it.
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Mark } from './Mark';
import { ThemeToggle } from './ThemeToggle';

export interface HeaderProps {
  left?: ReactNode;
  centre?: ReactNode;
  right?: ReactNode;
  linkHome?: boolean;
  nav?: ReactNode;
}

export function Header({ left, centre, right, linkHome = true, nav }: HeaderProps) {
  return (
    <header className="app-header">
      <div className="page row" style={{ width: '100%' }}>
        {left || (linkHome
          ? <Link to="/" className="wordmark row" style={{ gap: 'var(--space-2)' }}><Mark size={22} />Grove Studio</Link>
          : <span className="wordmark row" style={{ gap: 'var(--space-2)' }}><Mark size={22} />Grove Studio</span>)}
        {nav}
        <span className="spacer" />
        {centre}
        {right}
        <ThemeToggle />
      </div>
    </header>
  );
}
