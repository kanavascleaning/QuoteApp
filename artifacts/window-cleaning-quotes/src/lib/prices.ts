export type PriceKey =
  | 'smallWindow'
  | 'mediumWindow'
  | 'largeWindow'
  | 'bayWindow'
  | 'normalDoor'
  | 'frenchDoorSet';

export type PriceSettings = Record<PriceKey, number>;

export type PriceList = {
  id: string;
  name: string;
  prices: PriceSettings;
};

export const DEFAULT_PRICES: PriceSettings = {
  smallWindow: 3.5,
  mediumWindow: 5.25,
  largeWindow: 7,
  bayWindow: 12.5,
  normalDoor: 8.5,
  frenchDoorSet: 14,
};

export const ZERO_PRICES: PriceSettings = {
  smallWindow: 0,
  mediumWindow: 0,
  largeWindow: 0,
  bayWindow: 0,
  normalDoor: 0,
  frenchDoorSet: 0,
};

const PRICE_LISTS_STORAGE_KEY = 'window-cleaning-quotes.price-lists';
const LEGACY_PRICES_STORAGE_KEY = 'window-cleaning-quotes.prices';
const LAST_USED_STORAGE_KEY = 'window-cleaning-quotes.last-price-list';

function priceKeys(): PriceKey[] {
  return Object.keys(DEFAULT_PRICES) as PriceKey[];
}

function clonePrices(prices: PriceSettings): PriceSettings {
  return priceKeys().reduce((next, key) => {
    next[key] = prices[key];
    return next;
  }, {} as PriceSettings);
}

function normalisePrices(value: unknown, fallback: PriceSettings): PriceSettings {
  if (!value || typeof value !== 'object') return clonePrices(fallback);

  const source = value as Partial<Record<PriceKey, unknown>>;
  return priceKeys().reduce((prices, key) => {
    const price = source[key];
    prices[key] =
      typeof price === 'number' && Number.isFinite(price) && price >= 0
        ? Math.round(price * 100) / 100
        : fallback[key];
    return prices;
  }, {} as PriceSettings);
}

function isValidPriceList(value: unknown): value is PriceList {
  if (!value || typeof value !== 'object') return false;
  const list = value as Partial<PriceList>;
  if (
    typeof list.id !== 'string' ||
    list.id.length === 0 ||
    typeof list.name !== 'string' ||
    list.name.trim().length === 0 ||
    !list.prices ||
    typeof list.prices !== 'object'
  ) {
    return false;
  }

  return priceKeys().every((key) => {
    const price = list.prices?.[key];
    return typeof price === 'number' && Number.isFinite(price) && price >= 0;
  });
}

function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `price-list-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function writePriceLists(priceLists: PriceList[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(PRICE_LISTS_STORAGE_KEY, JSON.stringify(priceLists));
}

function migratedLegacyList(): PriceList {
  let prices = DEFAULT_PRICES;

  if (typeof window !== 'undefined') {
    try {
      const stored = window.localStorage.getItem(LEGACY_PRICES_STORAGE_KEY);
      if (stored) prices = normalisePrices(JSON.parse(stored), DEFAULT_PRICES);
    } catch {
      prices = DEFAULT_PRICES;
    }
  }

  const migrated = {
    id: createId(),
    name: 'Default',
    prices: clonePrices(prices),
  };
  writePriceLists([migrated]);
  return migrated;
}

export function loadPriceLists(): PriceList[] {
  if (typeof window === 'undefined') {
    return [{ id: 'default', name: 'Default', prices: clonePrices(DEFAULT_PRICES) }];
  }

  try {
    const stored = window.localStorage.getItem(PRICE_LISTS_STORAGE_KEY);
    if (!stored) return [migratedLegacyList()];

    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [migratedLegacyList()];

    const validLists = parsed.filter(isValidPriceList).map((list) => ({
      id: list.id,
      name: list.name.trim(),
      prices: clonePrices(list.prices),
    }));
    if (validLists.length === 0) return [migratedLegacyList()];
    return validLists;
  } catch {
    return [migratedLegacyList()];
  }
}

export function savePriceLists(priceLists: PriceList[]): void {
  if (priceLists.length === 0) {
    writePriceLists([createPriceList('Default', ZERO_PRICES)]);
    return;
  }
  writePriceLists(
    priceLists.map((list) => ({
      id: list.id,
      name: list.name.trim() || 'Untitled price list',
      prices: normalisePrices(list.prices, ZERO_PRICES),
    })),
  );
}

export function createPriceList(
  name: string,
  prices: PriceSettings = ZERO_PRICES,
): PriceList {
  const created = {
    id: createId(),
    name: name.trim() || 'Untitled price list',
    prices: clonePrices(prices),
  };
  const lists = loadPriceLists();
  savePriceLists([...lists, created]);
  return created;
}

export function updatePriceList(
  id: string,
  changes: Pick<PriceList, 'name' | 'prices'>,
): PriceList | undefined {
  const lists = loadPriceLists();
  const index = lists.findIndex((list) => list.id === id);
  if (index < 0) return undefined;

  const updated = {
    id,
    name: changes.name.trim() || 'Untitled price list',
    prices: normalisePrices(changes.prices, ZERO_PRICES),
  };
  lists[index] = updated;
  savePriceLists(lists);
  return updated;
}

export function deletePriceList(id: string): boolean {
  const lists = loadPriceLists();
  if (lists.length <= 1) return false;
  const next = lists.filter((list) => list.id !== id);
  if (next.length === lists.length) return false;
  savePriceLists(next);
  if (loadLastUsedPriceListId() === id) saveLastUsedPriceListId(next[0].id);
  return true;
}

export function getPriceList(id: string): PriceList | undefined {
  return loadPriceLists().find((list) => list.id === id);
}

export function loadLastUsedPriceListId(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  const id = window.localStorage.getItem(LAST_USED_STORAGE_KEY);
  return id || undefined;
}

export function saveLastUsedPriceListId(id: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(LAST_USED_STORAGE_KEY, id);
}

// Compatibility helpers for callers outside the current screens.
export function loadPrices(): PriceSettings {
  return loadPriceLists()[0].prices;
}

export function savePrices(prices: PriceSettings): void {
  const lists = loadPriceLists();
  updatePriceList(lists[0].id, { name: lists[0].name, prices });
}