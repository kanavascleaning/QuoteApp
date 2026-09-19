import { ArrowUpRight, CalendarDays, ChevronRight, CircleCheck, ClipboardPlus, FileText, Settings2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { AppHeader, AppShell } from '@/components/app-shell';
import { loadQuotes, type SavedQuote } from '@/lib/quotes';

function pounds(value: number): string {
  return `£${value.toFixed(2)}`;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

export default function HomePage() {
  const [location] = useLocation();
  const [quotes, setQuotes] = useState<SavedQuote[]>([]);

  useEffect(() => {
    setQuotes(loadQuotes());
  }, [location]);

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
        <Link href="/quote" className="quick-card" data-testid="link-home-new-quote">
          <span className="quick-card-copy">
            <span className="quick-card-icon" aria-hidden="true">
              <ClipboardPlus size={18} />
            </span>
            <span>
              <span className="quick-card-title">Start a new quote</span>
              <span className="quick-card-subtitle">Count items · see the total live</span>
            </span>
          </span>
          <span className="arrow-button" aria-hidden="true">
            <ArrowUpRight size={19} />
          </span>
        </Link>

        <div className="saved-quotes-heading">
          <div>
            <p className="section-label">Saved quotes</p>
            <p className="saved-quotes-copy">Recent work, ready to review.</p>
          </div>
          {quotes.length > 0 && <span className="saved-count" data-testid="text-saved-quote-count">{quotes.length}</span>}
        </div>

        {quotes.length === 0 ? (
          <div className="saved-empty" data-testid="empty-saved-quotes">
            <span className="saved-empty-icon" aria-hidden="true"><FileText size={19} /></span>
            <div>
              <p className="saved-empty-title">No saved quotes yet</p>
              <p className="saved-empty-copy">Your finished quotes will appear here.</p>
            </div>
          </div>
        ) : (
          <div className="saved-quotes-list" aria-label="Saved quotes">
            {quotes.map((quote) => (
              <Link href={`/quote/${quote.id}`} className="saved-quote-card" key={quote.id} data-testid={`link-saved-quote-${quote.id}`}>
                <span className="saved-quote-icon" aria-hidden="true"><FileText size={17} /></span>
                <span className="saved-quote-copy">
                  <strong data-testid={`text-saved-quote-address-${quote.id}`}>{quote.address || 'No address'}</strong>
                  <span><CalendarDays size={13} aria-hidden="true" /> {formatDate(quote.createdAt)}</span>
                </span>
                <span className="saved-quote-side">
                  <strong data-testid={`text-saved-quote-total-${quote.id}`}>{pounds(quote.total)}</strong>
                  <ChevronRight size={17} aria-hidden="true" />
                </span>
              </Link>
            ))}
          </div>
        )}

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