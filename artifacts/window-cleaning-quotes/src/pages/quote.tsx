import {
  ArrowLeft,
  Check,
  CircleAlert,
  MapPin,
  Minus,
  Plus,
  ReceiptText,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'wouter';
import { AppHeader, AppShell } from '@/components/app-shell';
import { QUOTE_ITEMS } from '@/lib/quote-items';
import { loadPrices, type PriceKey, type PriceSettings } from '@/lib/prices';

type QuoteQuantities = Record<PriceKey, number>;

type FinishedQuoteLineItem = {
  key: PriceKey;
  label: string;
  quantity: number;
  unitPrice: number | null;
  subtotal: number;
};

type FinishedQuote = {
  address: string;
  lineItems: FinishedQuoteLineItem[];
  total: number;
};

type QuoteLine = FinishedQuoteLineItem & {
  hint: string;
  isPriced: boolean;
};

function emptyQuantities(): QuoteQuantities {
  return QUOTE_ITEMS.reduce((quantities, item) => {
    quantities[item.key] = 0;
    return quantities;
  }, {} as QuoteQuantities);
}

function pounds(value: number): string {
  return `£${value.toFixed(2)}`;
}

export default function QuotePage() {
  const [prices, setPrices] = useState<PriceSettings | null>(null);
  const [address, setAddress] = useState('');
  const [quantities, setQuantities] = useState<QuoteQuantities>(emptyQuantities);
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    setPrices(loadPrices());
  }, []);

  const lines = useMemo<QuoteLine[]>(() => {
    return QUOTE_ITEMS.map((item) => {
      const rawPrice = prices?.[item.key];
      const unitPrice =
        typeof rawPrice === 'number' && Number.isFinite(rawPrice) && rawPrice > 0
          ? rawPrice
          : null;
      const isPriced = unitPrice !== null;
      const quantity = quantities[item.key];

      return {
        key: item.key,
        label: item.label,
        hint: item.hint,
        quantity,
        unitPrice,
        subtotal: unitPrice === null ? 0 : quantity * unitPrice,
        isPriced,
      };
    });
  }, [prices, quantities]);

  const total = useMemo(
    () => lines.reduce((sum, line) => sum + line.subtotal, 0),
    [lines],
  );
  const unpricedItems = useMemo(
    () => lines.filter((line) => !line.isPriced),
    [lines],
  );

  function changeQuantity(key: PriceKey, adjustment: number) {
    setQuantities((current) => ({
      ...current,
      [key]: Math.max(0, current[key] + adjustment),
    }));
    setSaveMessage('');
  }

  function saveQuote() {
    const quote: FinishedQuote = {
      address: address.trim(),
      lineItems: lines.map((line) => ({
        key: line.key,
        label: line.label,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        subtotal: line.subtotal,
      })),
      total,
    };

    console.info('Quote prepared (not persisted)', quote);
    setSaveMessage('Quote ready. Nothing was saved to this device.');
  }

  if (!prices) {
    return (
      <AppShell>
        <div className="page-wrap">
          <AppHeader />
          <div className="skeleton-card quote-skeleton" aria-label="Loading prices" data-testid="loading-quote" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="page-wrap quote-page">
        <AppHeader />

        <Link href="/" className="quote-back-link" data-testid="link-quote-back">
          <ArrowLeft size={17} aria-hidden="true" />
          <span>Back to home</span>
        </Link>

        <section aria-labelledby="quote-title">
          <p className="eyebrow">Clearpane / 02</p>
          <h1 className="page-heading" id="quote-title">
            Make a quote.
          </h1>
          <p className="page-intro">
            Count what is in front of you. The total follows as you go.
          </p>
        </section>

        <div className="quote-form">
          <div className="quote-address-card">
            <label className="quote-field-label" htmlFor="quote-address">
              <MapPin size={16} aria-hidden="true" />
              Address <span>(optional)</span>
            </label>
            <input
              className="quote-address-input"
              id="quote-address"
              type="text"
              value={address}
              onChange={(event) => {
                setAddress(event.target.value);
                setSaveMessage('');
              }}
              placeholder="Number and street"
              autoComplete="street-address"
              data-testid="input-quote-address"
            />
          </div>

          <div className="quote-section-heading">
            <div>
              <p className="section-label">Count items</p>
              <p className="quote-section-copy">Tap plus as you count each type.</p>
            </div>
            <ReceiptText size={21} aria-hidden="true" />
          </div>

          <div className="quote-items" aria-label="Quote line items">
            {lines.map((line) => (
              <article className="quote-item" key={line.key} data-testid={`row-quote-item-${line.key}`}>
                <div className="quote-item-info">
                  <h2 className="quote-item-label">{line.label}</h2>
                  <p className="quote-item-hint">{line.hint}</p>
                  {!line.isPriced && (
                    <p className="quote-unpriced" data-testid={`status-unpriced-${line.key}`}>
                      <CircleAlert size={14} aria-hidden="true" />
                      Not priced in Settings
                    </p>
                  )}
                </div>

                <div className="quote-item-actions">
                  <div className="quantity-control" aria-label={`${line.label} quantity`}>
                    <button
                      className="quantity-stepper"
                      type="button"
                      onClick={() => changeQuantity(line.key, -1)}
                      disabled={line.quantity === 0}
                      aria-label={`Decrease ${line.label} quantity`}
                      data-testid={`button-decrease-${line.key}`}
                    >
                      <Minus size={18} strokeWidth={2.4} aria-hidden="true" />
                    </button>
                    <span className="quantity-value" aria-live="polite" data-testid={`text-quantity-${line.key}`}>
                      {line.quantity}
                    </span>
                    <button
                      className="quantity-stepper"
                      type="button"
                      onClick={() => changeQuantity(line.key, 1)}
                      aria-label={`Increase ${line.label} quantity`}
                      data-testid={`button-increase-${line.key}`}
                    >
                      <Plus size={18} strokeWidth={2.4} aria-hidden="true" />
                    </button>
                  </div>
                  <p className={`quote-subtotal ${!line.isPriced ? 'is-muted' : ''}`} data-testid={`text-subtotal-${line.key}`}>
                    {line.isPriced ? pounds(line.subtotal) : '—'}
                  </p>
                </div>
              </article>
            ))}
          </div>

          <div className="quote-total-card" aria-label="Quote total">
            <div>
              <p className="quote-total-label">Estimated total</p>
              <p className="quote-total-note">
                {unpricedItems.length > 0
                  ? `${unpricedItems.length} item${unpricedItems.length === 1 ? '' : 's'} need${unpricedItems.length === 1 ? 's' : ''} a price`
                  : 'Based on your current rate card'}
              </p>
            </div>
            <strong className="quote-total-value" data-testid="text-quote-total">
              {pounds(total)}
            </strong>
          </div>

          {unpricedItems.length > 0 && (
            <p className="quote-warning" role="status" data-testid="status-quote-warning">
              <CircleAlert size={16} aria-hidden="true" />
              {unpricedItems.map((line) => line.label).join(', ')} {unpricedItems.length === 1 ? 'is' : 'are'} not priced. Update Settings before giving a final total.
            </p>
          )}

          <div className="save-zone quote-save-zone">
            <button
              className="save-button"
              type="button"
              onClick={saveQuote}
              data-testid="button-save-quote"
            >
              <Check size={17} aria-hidden="true" />
              Save quote
            </button>
            <p className={`save-feedback ${saveMessage ? 'is-success' : ''}`} aria-live="polite" data-testid="status-save-quote">
              {saveMessage || 'This prepares the quote for now. It will not be stored.'}
            </p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}