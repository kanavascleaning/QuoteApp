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

export type BusinessContactDetails = {
  businessName: string;
  phone: string;
  email: string;
  website: string;
  other: string;
};

const STORAGE_KEY = 'window-cleaning-quotes.saved';
const BUSINESS_CONTACT_STORAGE_KEY = 'window-cleaning-quotes.business-contact';

export const EMPTY_BUSINESS_CONTACT_DETAILS: BusinessContactDetails = {
  businessName: '',
  phone: '',
  email: '',
  website: '',
  other: '',
};

function normaliseBusinessContactDetails(value: unknown): BusinessContactDetails {
  if (!value || typeof value !== 'object') return { ...EMPTY_BUSINESS_CONTACT_DETAILS };
  const details = value as Partial<Record<keyof BusinessContactDetails, unknown>>;

  return Object.keys(EMPTY_BUSINESS_CONTACT_DETAILS).reduce((result, key) => {
    const field = key as keyof BusinessContactDetails;
    result[field] = typeof details[field] === 'string' ? details[field] as string : '';
    return result;
  }, { ...EMPTY_BUSINESS_CONTACT_DETAILS });
}

export function loadBusinessContactDetails(): BusinessContactDetails {
  if (typeof window === 'undefined') return { ...EMPTY_BUSINESS_CONTACT_DETAILS };

  try {
    const stored = window.localStorage.getItem(BUSINESS_CONTACT_STORAGE_KEY);
    if (!stored) return { ...EMPTY_BUSINESS_CONTACT_DETAILS };
    return normaliseBusinessContactDetails(JSON.parse(stored));
  } catch {
    return { ...EMPTY_BUSINESS_CONTACT_DETAILS };
  }
}

export function saveBusinessContactDetails(
  details: BusinessContactDetails,
): BusinessContactDetails {
  const saved = normaliseBusinessContactDetails(details);
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(BUSINESS_CONTACT_STORAGE_KEY, JSON.stringify(saved));
  }
  return saved;
}

function formatCurrency(value: number): string {
  return `£${value.toFixed(2)}`;
}

function formatQuoteDate(value: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function quotePriceListName(quote: SavedQuote): string {
  return quote.priceListName?.trim() || 'Saved prices from older quote';
}

function contactDetailsLines(details: BusinessContactDetails): string[] {
  const fields: [string, string][] = [
    ['Business', details.businessName],
    ['Phone', details.phone],
    ['Email', details.email],
    ['Website', details.website],
    ['Other', details.other],
  ];
  const filledFields = fields
    .filter(([, value]) => value.trim())
    .map(([label, value]) => `${label}: ${value.trim()}`);

  return filledFields.length > 0 ? ['CONTACT DETAILS', ...filledFields] : [];
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    switch (character) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      default: return '&#39;';
    }
  });
}

export function formatQuoteSummary(
  quote: SavedQuote,
  contactDetails: BusinessContactDetails = loadBusinessContactDetails(),
): string {
  const lineRows = quote.lineItems.map((line) => [
    line.label,
    `${line.quantity} ${line.quantity === 1 ? 'unit' : 'units'}`,
    line.unitPrice === null ? 'Not priced' : `${formatCurrency(line.unitPrice)} each`,
    formatCurrency(line.subtotal),
  ].join(' | '));
  const contactLines = contactDetailsLines(contactDetails);

  return [
    'CLEARPANE',
    'WINDOW CLEANING QUOTE',
    ...(contactLines.length > 0 ? ['', ...contactLines] : []),
    '',
    `Address: ${quote.address.trim() || 'No address'}`,
    `Price list: ${quotePriceListName(quote)}`,
    `Quote date: ${formatQuoteDate(quote.createdAt)}`,
    '',
    'ITEM | QUANTITY | RATE | LINE TOTAL',
    ...lineRows,
    '',
    `QUOTED TOTAL: ${formatCurrency(quote.total)}`,
  ].join('\n');
}

export function buildQuotePrintHtml(
  quote: SavedQuote,
  contactDetails: BusinessContactDetails = loadBusinessContactDetails(),
): string {
  const address = quote.address.trim() || 'No address';
  const contactLines = contactDetailsLines(contactDetails);
  const lineRows = quote.lineItems.map((line) => `
    <tr>
      <td>${escapeHtml(line.label)}</td>
      <td>${line.quantity}</td>
      <td>${line.unitPrice === null ? 'Not priced' : `${formatCurrency(line.unitPrice)} each`}</td>
      <td>${formatCurrency(line.subtotal)}</td>
    </tr>`).join('');

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Window cleaning quote — ${escapeHtml(address)}</title>
    <style>
      @page { size: A4; margin: 20mm; }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        color: #1d343b;
        font-family: Arial, Helvetica, sans-serif;
        font-size: 12pt;
        line-height: 1.5;
      }
      main { max-width: 760px; margin: 0 auto; }
      .brand {
        color: #17636d;
        font-size: 11pt;
        font-weight: 700;
        letter-spacing: .12em;
      }
      h1 { margin: 8px 0 24px; font-size: 28pt; line-height: 1.1; }
      .details {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 18px 28px;
        margin-bottom: 28px;
        padding: 18px;
        border: 1px solid #d8e2e3;
        border-radius: 10px;
      }
      .detail-label {
        margin: 0 0 4px;
        color: #5c7379;
        font-size: 9pt;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: .06em;
      }
      .detail-value { margin: 0; font-weight: 700; white-space: pre-line; }
      table { width: 100%; border-collapse: collapse; }
      th, td { padding: 11px 8px; border-bottom: 1px solid #d8e2e3; text-align: left; }
      th { color: #5c7379; font-size: 9pt; text-transform: uppercase; letter-spacing: .05em; }
      th:not(:first-child), td:not(:first-child) { text-align: right; }
      .total {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        margin-top: 22px;
        padding: 18px 0;
        border-top: 2px solid #17636d;
        font-size: 16pt;
        font-weight: 700;
      }
      .note { margin-top: 18px; color: #5c7379; font-size: 9pt; }
      @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
    </style>
  </head>
  <body>
    <main>
      <div class="brand">CLEARPANE</div>
      <h1>Window cleaning quote</h1>
      <section class="details" aria-label="Quote details">
        <div><p class="detail-label">Address</p><p class="detail-value">${escapeHtml(address)}</p></div>
        <div><p class="detail-label">Price list</p><p class="detail-value">${escapeHtml(quotePriceListName(quote))}</p></div>
        <div><p class="detail-label">Quote date</p><p class="detail-value">${escapeHtml(formatQuoteDate(quote.createdAt))}</p></div>
        ${contactLines.length > 0 ? `<div><p class="detail-label">Business contact</p><p class="detail-value">${contactLines.slice(1).map(escapeHtml).join('\n')}</p></div>` : ''}
      </section>
      <table>
        <thead>
          <tr><th>Item</th><th>Quantity</th><th>Rate</th><th>Line total</th></tr>
        </thead>
        <tbody>${lineRows}
        </tbody>
      </table>
      <div class="total"><span>Quoted total</span><span>${formatCurrency(quote.total)}</span></div>
      <p class="note">Rates and totals shown are from the saved quote snapshot.</p>
    </main>
  </body>
</html>`;
}

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