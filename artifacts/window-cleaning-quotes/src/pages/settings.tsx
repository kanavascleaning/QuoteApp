import { Check, LoaderCircle, Settings2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { AppHeader, AppShell } from '@/components/app-shell';
import { QUOTE_ITEMS } from '@/lib/quote-items';
import {
  DEFAULT_PRICES,
  loadPrices,
  savePrices,
  type PriceKey,
  type PriceSettings,
} from '@/lib/prices';

type SaveState = 'idle' | 'saving' | 'saved';

export default function SettingsPage() {
  const [prices, setPrices] = useState<PriceSettings | null>(null);
  const [draft, setDraft] = useState<Record<PriceKey, string>>(() =>
    toDraft(DEFAULT_PRICES),
  );
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [validationMessage, setValidationMessage] = useState('');

  useEffect(() => {
    const loaded = loadPrices();
    setPrices(loaded);
    setDraft(toDraft(loaded));
  }, []);

  function updatePrice(key: PriceKey, value: string) {
    const cleanValue = normalisePriceInput(value);
    setDraft((current) => ({ ...current, [key]: cleanValue }));
    setSaveState('idle');
    setValidationMessage('');
  }

  function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!prices) return;

    const invalidFields = QUOTE_ITEMS.filter(({ key }) => {
      return isInvalidPriceInput(draft[key]);
    });

    if (invalidFields.length > 0) {
      setValidationMessage(
        `${invalidFields.map((field) => field.label).join(', ')} ${invalidFields.length === 1 ? 'has' : 'have'} an invalid price. Use zero or a positive amount.`,
      );
      return;
    }

    const nextPrices = QUOTE_ITEMS.reduce((next, field) => {
      const value = Number.parseFloat(draft[field.key]);
      next[field.key] =
        Number.isFinite(value) && value >= 0 ? Math.round(value * 100) / 100 : 0;
      return next;
    }, {} as PriceSettings);

    setSaveState('saving');
    savePrices(nextPrices);
    window.setTimeout(() => {
      setPrices(nextPrices);
      setDraft(toDraft(nextPrices));
      setSaveState('saved');
    }, 280);
  }

  if (!prices) {
    return (
      <AppShell>
        <div className="page-wrap">
          <AppHeader />
          <div className="skeleton-card" aria-label="Loading prices" data-testid="loading-prices" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="page-wrap">
        <AppHeader />
        <section aria-labelledby="settings-title">
          <div className="settings-heading">
            <div>
              <p className="eyebrow">Your rate card</p>
              <h1 className="page-heading" id="settings-title">
                Set prices once.
              </h1>
            </div>
            <span className="settings-heading-icon" aria-hidden="true">
              <Settings2 size={22} />
            </span>
          </div>
          <p className="page-intro">
            Use simple per-item prices you can trust when you are quoting on
            site. All amounts are in pounds.
          </p>
        </section>

        {!Object.values(prices).some((price) => price > 0) && (
          <div className="empty-state compact-empty-state" role="status" data-testid="empty-prices-state">
            <span className="saved-empty-icon" aria-hidden="true">
              <Settings2 size={19} />
            </span>
            <div>
              <p className="saved-empty-title">No prices set yet</p>
              <p className="saved-empty-copy">Add a rate for each item, then save your rate card.</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSave} data-testid="form-prices">
          <div className="settings-card">
            {QUOTE_ITEMS.map((field) => (
              <div className="price-row" key={field.key}>
                <label className="price-label" htmlFor={`price-${field.key}`}>
                  {field.label}
                </label>
                <div className="currency-input">
                  <span className="currency-symbol" aria-hidden="true">
                    £
                  </span>
                  <input
                    className="price-input"
                    id={`price-${field.key}`}
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    onChange={(event) => updatePrice(field.key, event.target.value)}
                    placeholder="0.00"
                    type="number"
                    value={draft[field.key]}
                    aria-label={`${field.label} price in pounds`}
                    aria-describedby={`price-hint-${field.key}`}
                    aria-invalid={isInvalidPriceInput(draft[field.key])}
                    enterKeyHint="done"
                    onFocus={(event) => {
                      window.requestAnimationFrame(() => {
                        event.currentTarget.scrollIntoView({ block: 'center', behavior: 'smooth' });
                      });
                    }}
                    data-testid={`input-price-${field.key}`}
                  />
                </div>
                <span className="price-hint" id={`price-hint-${field.key}`}>{field.hint}</span>
              </div>
            ))}
          </div>

          <div className="save-zone">
            <button
              className="save-button"
              disabled={saveState === 'saving'}
              type="submit"
              data-testid="button-save-prices"
            >
              {saveState === 'saving' ? (
                <>
                  <LoaderCircle size={17} className="animate-spin" aria-hidden="true" />
                  Saving prices
                </>
              ) : saveState === 'saved' ? (
                <>
                  <Check size={17} aria-hidden="true" />
                  Prices saved
                </>
              ) : (
                'Save prices'
              )}
            </button>
            {validationMessage && (
              <p className="form-validation-message" role="alert" data-testid="status-price-validation">
                {validationMessage}
              </p>
            )}
            <p
              className={`save-feedback ${saveState === 'saved' ? 'is-success' : ''}`}
              aria-live="polite"
              data-testid="status-save-prices"
            >
              {saveState === 'saved'
                ? 'Saved on this device. You can use them offline.'
                : 'Changes are only saved when you tap the button.'}
            </p>
          </div>
        </form>
      </div>
    </AppShell>
  );
}

function normalisePriceInput(value: string): string {
  const cleaned = value.replace(/[^\d.-]/g, '');
  const sign = cleaned.startsWith('-') ? '-' : '';
  const unsigned = cleaned.replace(/-/g, '').replace(/(\..*)\./g, '$1');
  return `${sign}${unsigned}`;
}

function isInvalidPriceInput(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  const parsed = Number.parseFloat(trimmed);
  return trimmed.startsWith('-') || !Number.isFinite(parsed) || parsed < 0;
}

function toDraft(prices: PriceSettings): Record<PriceKey, string> {
  return (Object.keys(prices) as PriceKey[]).reduce(
    (draft, key) => {
      draft[key] = prices[key].toFixed(2);
      return draft;
    },
    {} as Record<PriceKey, string>,
  );
}