import { ArrowLeft, Check, CircleAlert, MapPin, Minus, Plus, ReceiptText } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'wouter';
import { AppHeader, AppShell } from '@/components/app-shell';
import {
  loadLastUsedPriceListId,
  loadPriceLists,
  saveLastUsedPriceListId,
  type PriceKey,
  type PriceList,
} from '@/lib/prices';
import { QUOTE_ITEMS } from '@/lib/quote-items';
import {
  buildQuoteLineItems,
  createUnavailableQuotePriceList,
  getQuote,
  LEGACY_SNAPSHOT_ID,
  saveQuote as persistQuote,
  type SavedQuote,
  type SavedQuoteLineItem,
} from '@/lib/quotes';

type QuoteQuantities = Record<PriceKey, number>;

type QuoteLine = SavedQuoteLineItem & {
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
  const { id } = useParams<{ id: string }>();
  const [location, setLocation] = useLocation();
  const isEditing = Boolean(id && location.endsWith('/edit'));
  const [priceLists, setPriceLists] = useState<PriceList[] | null>(null);
  const [savedQuote] = useState<SavedQuote | undefined>(() => (isEditing && id ? getQuote(id) : undefined));
  const [selectedPriceListId, setSelectedPriceListId] = useState('');
  const [address, setAddress] = useState('');
  const [quantities, setQuantities] = useState<QuoteQuantities>(emptyQuantities);
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    const loaded = loadPriceLists();
    setPriceLists(loaded);

    if (savedQuote) {
      setSelectedPriceListId(savedQuote.priceListId ?? LEGACY_SNAPSHOT_ID);
      return;
    }

    const lastUsedId = loadLastUsedPriceListId();
    setSelectedPriceListId(
      loaded.some((list) => list.id === lastUsedId) ? lastUsedId ?? loaded[0].id : loaded[0].id,
    );
  }, [savedQuote]);

  useEffect(() => {
    if (!savedQuote) return;
    setAddress(savedQuote.address);
    setQuantities(
      savedQuote.lineItems.reduce((next, line) => {
        next[line.key] = line.quantity;
        return next;
      }, emptyQuantities()),
    );
  }, [savedQuote]);

  const unavailableSnapshot = useMemo<PriceList | undefined>(() => {
    if (!savedQuote || !priceLists) return undefined;
    return createUnavailableQuotePriceList(savedQuote, priceLists, selectedPriceListId);
  }, [priceLists, savedQuote, selectedPriceListId]);

  const activePriceList = useMemo(
    () =>
      unavailableSnapshot ??
      priceLists?.find((list) => list.id === selectedPriceListId) ??
      priceLists?.[0],
    [priceLists, selectedPriceListId, unavailableSnapshot],
  );

  const priceListOptions = useMemo(
    () =>
      unavailableSnapshot
        ? [unavailableSnapshot, ...(priceLists ?? [])]
        : priceLists ?? [],
    [priceLists, unavailableSnapshot],
  );

  const lines = useMemo<QuoteLine[]>(() => {
    if (!activePriceList) return [];
    const lineItems = buildQuoteLineItems(activePriceList, quantities);
    return lineItems.map((line, index) => ({
      ...line,
      hint: QUOTE_ITEMS[index].hint,
      isPriced: line.unitPrice !== null,
    }));
  }, [activePriceList, quantities]);

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
      [key]: Math.max(0, Math.floor(current[key] + adjustment)),
    }));
    setSaveMessage('');
  }

  function saveCurrentQuote() {
    if (!activePriceList) return;
    const isUnavailableSnapshot = Boolean(unavailableSnapshot && activePriceList.id === unavailableSnapshot.id);
    const saved = persistQuote({
      id: isEditing ? savedQuote?.id : undefined,
      address: address.trim(),
      priceListId: activePriceList.id,
      priceListName: isUnavailableSnapshot
        ? savedQuote?.priceListName ?? 'Saved prices from older quote'
        : activePriceList.name,
      total,
      lineItems: lines.map((line) => ({
        key: line.key,
        label: line.label,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        subtotal: line.subtotal,
      })),
    });
    if (!isUnavailableSnapshot) saveLastUsedPriceListId(activePriceList.id);
    setSaveMessage(isEditing ? 'Quote updated. Opening review…' : 'Quote saved. Opening review…');
    setLocation(`/quote/${saved.id}?saved=${isEditing ? 'updated' : 'saved'}`);
  }

  if (isEditing && !savedQuote) {
    return (
      <AppShell>
        <div className="page-wrap">
          <AppHeader />
          <section className="empty-state" aria-labelledby="missing-edit-title">
            <p className="eyebrow">Clearpane / archive</p>
            <h1 className="page-heading" id="missing-edit-title">Quote not found.</h1>
            <p className="page-intro">This saved quote may have been removed from this device.</p>
            <Link href="/" className="save-button empty-state-action" data-testid="link-missing-edit-home">
              <ArrowLeft size={17} aria-hidden="true" />
              Back to home
            </Link>
          </section>
        </div>
      </AppShell>
    );
  }

  if (!priceLists || !activePriceList) {
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
          <p className="eyebrow">{isEditing ? 'Clearpane / edit quote' : 'Clearpane / 02'}</p>
          <h1 className="page-heading" id="quote-title">
            {isEditing ? 'Adjust the quote.' : 'Make a quote.'}
          </h1>
          <p className="page-intro">
            {isEditing
              ? 'Update the count or address, then save this quote again.'
              : 'Count what is in front of you. The total follows as you go.'}
          </p>
        </section>

        <div className="quote-form">
          <div className="quote-price-list-card">
            <label className="quote-field-label" htmlFor="quote-price-list">
              <ReceiptText size={16} aria-hidden="true" />
              Price list
            </label>
            <select
              className="price-list-select"
              id="quote-price-list"
              value={selectedPriceListId}
              onChange={(event) => {
                const nextPriceListId = event.target.value;
                setSelectedPriceListId(nextPriceListId);
                if (priceLists.some((list) => list.id === nextPriceListId)) {
                  saveLastUsedPriceListId(nextPriceListId);
                }
                setSaveMessage('');
              }}
              data-testid="select-quote-price-list"
            >
              {priceListOptions.map((list) => (
                <option value={list.id} key={list.id}>{list.name}</option>
              ))}
            </select>
            {unavailableSnapshot && (
              <p className="price-list-unavailable" role="status" data-testid="status-price-list-unavailable">
                This price list is no longer available. The original saved prices are still shown.
              </p>
            )}
          </div>

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
              enterKeyHint="done"
              onFocus={(event) => {
                window.requestAnimationFrame(() => {
                  event.currentTarget.scrollIntoView({ block: 'center', behavior: 'smooth' });
                });
              }}
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
              onClick={saveCurrentQuote}
              data-testid="button-save-quote"
            >
              <Check size={17} aria-hidden="true" />
              {isEditing ? 'Update quote' : 'Save quote'}
            </button>
            <p className={`save-feedback ${saveMessage ? 'is-success' : ''}`} aria-live="polite" data-testid="status-save-quote">
              {saveMessage || 'Saved quotes keep these prices, even after Settings changes.'}
            </p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}