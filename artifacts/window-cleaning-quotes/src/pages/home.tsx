import { ArrowUpRight, CircleCheck, Settings2 } from 'lucide-react';
import { Link } from 'wouter';
import { AppHeader, AppShell } from '@/components/app-shell';

export default function HomePage() {
  return (
    <AppShell>
      <div className="page-wrap">
        <AppHeader />
        <section aria-labelledby="home-title">
          <p className="eyebrow">A tidy start</p>
          <h1 className="page-heading" id="home-title">
            Ready for the next pane.
          </h1>
          <p className="page-intro">
            Your field pricing lives here, ready to reach for when you are on
            the doorstep.
          </p>
        </section>

        <section className="hero-panel" aria-labelledby="hero-title">
          <p className="eyebrow">Clearpane / 01</p>
          <h2 className="hero-title" id="hero-title">
            Keep the numbers close. Keep the work moving.
          </h2>
          <p className="hero-copy">
            Set your standard prices once on this phone. They stay available
            without a signal.
          </p>
          <div className="panel-note" data-testid="text-storage-note">
            <CircleCheck size={17} aria-hidden="true" />
            <span>Prices are stored privately on this device.</span>
          </div>
        </section>

        <p className="section-label">Quick access</p>
        <Link href="/settings" className="quick-card" data-testid="link-home-settings">
          <span className="quick-card-copy">
            <span className="quick-card-icon" aria-hidden="true">
              <Settings2 size={18} />
            </span>
            <span>
              <span className="quick-card-title">Check your prices</span>
              <span className="quick-card-subtitle">Six items · stored locally</span>
            </span>
          </span>
          <span className="arrow-button" aria-hidden="true">
            <ArrowUpRight size={19} />
          </span>
        </Link>
      </div>
    </AppShell>
  );
}