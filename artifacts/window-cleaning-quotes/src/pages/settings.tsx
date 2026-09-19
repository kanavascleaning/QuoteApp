import { Check, LoaderCircle, Settings2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { AppHeader, AppShell } from '@/components/app-shell';
import {
  DEFAULT_PRICES,
  loadPrices,
  savePrices,
  type PriceKey,
  type PriceSettings,
} from '@/lib/prices';

const PRICE_FIELDS: Array<{ key: PriceKey; label: string; hint: string }> = [
  { key: 'smallWindow', label: 'Small Window', hint: '1 pane' },
  { key: 'mediumWindow', label: 'Medium Window', hint: '2 panes' },
  { key: 'largeWindow', label: 'Large Window', hint: '3 panes' },
  { key: 'bayWindow', label: 'Bay Window', hint: 'Full bay' },
  { key: 'normalDoor', label: 'Normal Door', hint: 'Single door' },
  { key: 'frenchDoorSet', label: 'French Door Set', hint: 'Door pair' },
];

type SaveState = 'idle' | 'saving' | 'saved';

export default function SettingsPage() {
  const [prices, setPrices] = useState<PriceSettings | null>(null);
  const [draft, setDraft] = useState<Record<PriceKey, string>>(() =>
    toDraft(DEFAULT_PRICES),
  );
  const [saveState, setSaveState] = useState<SaveState>('idle');

  useEffect(() => {
    const loaded = loadPrices();
    setPrices(loaded);
    setDraft(toDraft(loaded));
  }, []);

  function updatePrice(key: PriceKey, value: string) {
    const cleanValue = value.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1');
    setDraft((current) => ({ ...current, [key]: cleanValue }));
    setSaveState('idle');
  }

  function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!prices) return;

    const nextPrices = PRICE_FIELDS.reduce((next, field) => {
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

        <form onSubmit={handleSave} data-testid="form-prices">
          <div className="settings-card">
            {PRICE_FIELDS.map((field) => (
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
                    onChange={(event) => updatePrice(field.key, event.target.value)}
                    placeholder="0.00"
                    type="text"
                    value={draft[field.key]}
                    aria-label={`${field.label} price in pounds`}
                    data-testid={`input-price-${field.key}`}
                  />
                </div>
                <span className="price-hint">{field.hint}</span>
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

function toDraft(prices: PriceSettings): Record<PriceKey, string> {
  return (Object.keys(prices) as PriceKey[]).reduce(
    (draft, key) => {
      draft[key] = prices[key].toFixed(2);
      return draft;
    },
    {} as Record<PriceKey, string>,
  );
}