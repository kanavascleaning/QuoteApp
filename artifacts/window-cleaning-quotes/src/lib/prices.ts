export type PriceKey =
  | 'smallWindow'
  | 'mediumWindow'
  | 'largeWindow'
  | 'bayWindow'
  | 'normalDoor'
  | 'frenchDoorSet';

export type PriceSettings = Record<PriceKey, number>;

export const DEFAULT_PRICES: PriceSettings = {
  smallWindow: 3.5,
  mediumWindow: 5.25,
  largeWindow: 7,
  bayWindow: 12.5,
  normalDoor: 8.5,
  frenchDoorSet: 14,
};

const STORAGE_KEY = 'window-cleaning-quotes.prices';

export function loadPrices(): PriceSettings {
  if (typeof window === 'undefined') return { ...DEFAULT_PRICES };

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return { ...DEFAULT_PRICES };
    const parsed = JSON.parse(stored) as Partial<Record<PriceKey, unknown>>;
    return (Object.keys(DEFAULT_PRICES) as PriceKey[]).reduce(
      (prices, key) => {
        const value = parsed[key];
        prices[key] =
          typeof value === 'number' && Number.isFinite(value) && value >= 0
            ? value
            : DEFAULT_PRICES[key];
        return prices;
      },
      {} as PriceSettings,
    );
  } catch {
    return { ...DEFAULT_PRICES };
  }
}

export function savePrices(prices: PriceSettings): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prices));
}