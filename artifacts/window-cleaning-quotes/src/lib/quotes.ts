import { QUOTE_ITEMS } from '@/lib/quote-items';
import type { PriceKey } from '@/lib/prices';

export type SavedQuoteLineItem = {
  key: PriceKey;
  label: string;
  quantity: number;
  unitPrice: number | null;
  subtotal: number;
};

export type SavedQuote = {
  id: string;
  address: string;
  priceListId?: string;
  priceListName?: string;
  createdAt: string;
  updatedAt?: string;
  total: number;
  lineItems: SavedQuoteLineItem[];
};

export type SaveQuoteInput = {
  id?: string;
  address: string;
  priceListId?: string;
  priceListName?: string;
  total: number;
  lineItems: SavedQuoteLineItem[];
};

const STORAGE_KEY = 'window-cleaning-quotes.saved';

function isPriceKey(value: unknown): value is PriceKey {
  return QUOTE_ITEMS.some((item) => item.key === value);
}

function isValidLineItem(value: unknown): value is SavedQuoteLineItem {
  if (!value || typeof value !== 'object') return false;
  const line = value as Partial<SavedQuoteLineItem>;
  return (
    isPriceKey(line.key) &&
    typeof line.label === 'string' &&
    typeof line.quantity === 'number' &&
    Number.isFinite(line.quantity) &&
    Number.isInteger(line.quantity) &&
    line.quantity >= 0 &&
    (line.unitPrice === null ||
      (typeof line.unitPrice === 'number' &&
        Number.isFinite(line.unitPrice) &&
        line.unitPrice >= 0)) &&
    typeof line.subtotal === 'number' &&
    Number.isFinite(line.subtotal) &&
    line.subtotal >= 0
  );
}

function isValidQuote(value: unknown): value is SavedQuote {
  if (!value || typeof value !== 'object') return false;
  const quote = value as Partial<SavedQuote>;
  const lineItems = quote.lineItems;
  return (
    typeof quote.id === 'string' &&
    quote.id.length > 0 &&
    typeof quote.address === 'string' &&
    (quote.priceListId === undefined || typeof quote.priceListId === 'string') &&
    (quote.priceListName === undefined || typeof quote.priceListName === 'string') &&
    typeof quote.createdAt === 'string' &&
    !Number.isNaN(Date.parse(quote.createdAt)) &&
    typeof quote.total === 'number' &&
    Number.isFinite(quote.total) &&
    quote.total >= 0 &&
    Array.isArray(lineItems) &&
    lineItems.length === QUOTE_ITEMS.length &&
    lineItems.every(isValidLineItem) &&
    new Set(lineItems.map((line) => line.key)).size === QUOTE_ITEMS.length
  );
}

function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `quote-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function loadQuotes(): SavedQuote[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(isValidQuote)
      .sort((first, second) => Date.parse(second.createdAt) - Date.parse(first.createdAt));
  } catch {
    return [];
  }
}

export function getQuote(id: string): SavedQuote | undefined {
  return loadQuotes().find((quote) => quote.id === id);
}

export function saveQuote(input: SaveQuoteInput): SavedQuote {
  const quotes = loadQuotes();
  const existingIndex = input.id
    ? quotes.findIndex((quote) => quote.id === input.id)
    : -1;
  const now = new Date().toISOString();
  const saved: SavedQuote = {
    id: existingIndex >= 0 && input.id ? input.id : createId(),
    address: input.address.trim(),
    priceListId: input.priceListId,
    priceListName: input.priceListName?.trim() || undefined,
    createdAt: existingIndex >= 0 ? quotes[existingIndex].createdAt : now,
    updatedAt: existingIndex >= 0 ? now : undefined,
    total: input.total,
    lineItems: input.lineItems.map((line) => ({ ...line })),
  };

  if (existingIndex >= 0) {
    quotes[existingIndex] = saved;
  } else {
    quotes.push(saved);
  }

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(quotes));
  }
  return saved;
}

export function deleteQuote(id: string): boolean {
  const quotes = loadQuotes();
  const nextQuotes = quotes.filter((quote) => quote.id !== id);
  if (nextQuotes.length === quotes.length) return false;
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextQuotes));
  }
  return true;
}