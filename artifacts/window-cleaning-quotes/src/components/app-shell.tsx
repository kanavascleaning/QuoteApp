import { House, Settings2, Sparkles } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import type { ReactNode } from 'react';

export function AppShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="app-shell">
      <main>{children}</main>
      <nav className="bottom-nav" aria-label="Primary navigation">
        <Link
          href="/"
          className={`nav-link ${location === '/' ? 'active' : ''}`}
          aria-current={location === '/' ? 'page' : undefined}
          data-testid="link-home"
        >
          <House size={18} strokeWidth={2.2} />
          <span>Home</span>
        </Link>
        <Link
          href="/settings"
          className={`nav-link ${location === '/settings' ? 'active' : ''}`}
          aria-current={location === '/settings' ? 'page' : undefined}
          data-testid="link-settings"
        >
          <Settings2 size={18} strokeWidth={2.2} />
          <span>Settings</span>
        </Link>
      </nav>
    </div>
  );
}

export function AppHeader() {
  return (
    <header className="app-header">
      <Link href="/" className="brand-lockup" data-testid="link-brand-home">
        <span className="brand-mark" aria-hidden="true">
          <Sparkles size={17} strokeWidth={2.2} />
        </span>
        <span>
          <span className="brand-name">Clearpane</span>
          <span className="brand-kicker">Field quote kit</span>
        </span>
      </Link>
      <span className="header-status" data-testid="status-ready">
        <span className="status-dot" aria-hidden="true" />
        Ready
      </span>
    </header>
  );
}