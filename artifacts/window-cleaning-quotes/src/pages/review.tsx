import { ArrowLeft, CircleAlert, Edit3, List, MapPin, ReceiptText, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'wouter';
import { AppHeader, AppShell } from '@/components/app-shell';
import { loadPriceLists, type PriceList } from '@/lib/prices';
import { QUOTE_ITEMS } from '@/lib/quote-items';
import { deleteQuote, getQuote, type SavedQuote } from '@/lib/quotes';

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

export default function ReviewPage() {
  const { id } = useParams<{ id: string }>();
  const [location, setLocation] = useLocation();
  const [quote, setQuote] = useState<SavedQuote | undefined>(() => (id ? getQuote(id) : undefined));
  const [priceLists, setPriceLists] = useState<PriceList[] | null>(null);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  useEffect(() => {
    setPriceLists(loadPriceLists());
  }, []);

  const lines = useMemo(
    () =>
      QUOTE_ITEMS.map((item) => quote?.lineItems.find((line) => line.key === item.key)).filter(
        (line): line is SavedQuote['lineItems'][number] => Boolean(line),
      ),
    [quote],
  );

  function confirmDelete() {
    if (!quote) return;
    deleteQuote(quote.id);
    setLocation('/');
  }

  if (!quote) {
    return (
      <AppShell>
        <div className="page-wrap">
          <AppHeader />
          <section className="empty-state" aria-labelledby="missing-quote-title">
            <p className="eyebrow">Clearpane / archive</p>
            <h1 className="page-heading" id="missing-quote-title">Quote not found.</h1>
            <p className="page-intro">This saved quote may have been removed from this device.</p>
            <Link href="/" className="save-button empty-state-action" data-testid="link-missing-quote-home">
              <ArrowLeft size={17} aria-hidden="true" />
              Back to home
            </Link>
          </section>
        </div>
      </AppShell>
    );
  }

  const sourcePriceList = priceLists?.find((list) => list.id === quote.priceListId);
  const priceListName = quote.priceListName ?? 'Saved prices from older quote';
  const priceListStatus = quote.priceListId && !sourcePriceList ? ' — no longer available' : '';

  return (
    <AppShell>
      <div className="page-wrap quote-page">
        <AppHeader />
        <Link href="/" className="quote-back-link" data-testid="link-review-back">
          <ArrowLeft size={17} aria-hidden="true" />
          <span>Back to home</span>
        </Link>

        <section aria-labelledby="review-title">
          <p className="eyebrow">Clearpane / saved quote</p>
          <h1 className="page-heading" id="review-title">Review the quote.</h1>
          <p className="page-intro">
            Saved {formatDate(quote.createdAt)} · prices below are from this quote.
          </p>
          {location.includes('saved=') && (
            <p className="review-save-notice" role="status" data-testid="status-review-save">
              {location.includes('saved=updated') ? 'Quote updated and saved.' : 'Quote saved to this device.'}
            </p>
          )}
        </section>

        <div className="review-meta-card">
          <div>
            <p className="quote-field-label">
              <MapPin size={16} aria-hidden="true" />
              Address
            </p>
            <p className="review-address" data-testid="text-review-address">
              {quote.address || 'No address'}
            </p>
          </div>
          <div className="review-meta-details">
            <div>
              <p className="quote-field-label">
                <List size={16} aria-hidden="true" />
                Price list
              </p>
              <p className="review-address" data-testid="text-review-price-list">
                {priceListName}{priceListStatus}
              </p>
            </div>
            <p className="review-date" data-testid="text-review-date">{formatDate(quote.createdAt)}</p>
          </div>
        </div>

        <div className="quote-section-heading review-section-heading">
          <div>
            <p className="section-label">Saved breakdown</p>
            <p className="quote-section-copy">A read-only snapshot of what was quoted.</p>
          </div>
          <ReceiptText size={21} aria-hidden="true" />
        </div>

        <div className="quote-items" aria-label="Saved quote line items">
          {lines.map((line) => {
            const isPriced = line.unitPrice !== null && line.unitPrice > 0;
            return (
              <article className="quote-item review-item" key={line.key} data-testid={`row-review-item-${line.key}`}>
                <div className="quote-item-info">
                  <h2 className="quote-item-label">{line.label}</h2>
                  <p className="quote-item-hint">
                    {line.quantity} {line.quantity === 1 ? 'unit' : 'units'} · {line.unitPrice === null ? 'No unit price saved' : `${pounds(line.unitPrice)} each`}
                  </p>
                  {!isPriced && (
                    <p className="quote-unpriced" data-testid={`status-review-unpriced-${line.key}`}>
                      <CircleAlert size={14} aria-hidden="true" />
                      Not priced when saved
                    </p>
                  )}
                </div>
                <div className="review-line-total">
                  <span className="review-unit-price" data-testid={`text-review-unit-price-${line.key}`}>
                    {line.unitPrice === null ? '—' : pounds(line.unitPrice)}
                  </span>
                  <strong className={`quote-subtotal ${!isPriced ? 'is-muted' : ''}`} data-testid={`text-review-subtotal-${line.key}`}>
                    {pounds(line.subtotal)}
                  </strong>
                </div>
              </article>
            );
          })}
        </div>

        <div className="quote-total-card" aria-label="Saved quote total">
          <div>
            <p className="quote-total-label">Quoted total</p>
            <p className="quote-total-note">This total will not change with Settings.</p>
          </div>
          <strong className="quote-total-value" data-testid="text-review-total">{pounds(quote.total)}</strong>
        </div>

        <div className="review-actions">
          <Link href={`/quote/${quote.id}/edit`} className="save-button" data-testid="link-edit-quote">
            <Edit3 size={17} aria-hidden="true" />
            Edit quote
          </Link>
          {!isConfirmingDelete ? (
            <button className="danger-button" type="button" onClick={() => setIsConfirmingDelete(true)} data-testid="button-delete-quote">
              <Trash2 size={17} aria-hidden="true" />
              Delete quote
            </button>
          ) : (
            <div className="delete-confirmation" role="alert" data-testid="status-delete-confirmation">
              <p>Delete this saved quote? This cannot be undone.</p>
              <div className="delete-confirmation-actions">
                <button className="secondary-button" type="button" onClick={() => setIsConfirmingDelete(false)} data-testid="button-cancel-delete">
                  Keep quote
                </button>
                <button className="danger-button danger-button-solid" type="button" onClick={confirmDelete} data-testid="button-confirm-delete">
                  Delete
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}