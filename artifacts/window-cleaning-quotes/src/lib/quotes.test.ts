import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { loadPriceLists, savePriceLists, updatePriceList } from '@/lib/prices';
import {
  buildQuotePrintHtml,
  formatQuoteSummary,
  getQuote,
  saveQuote,
  type SavedQuoteLineItem,
} from '@/lib/quotes';

const quoteLines: SavedQuoteLineItem[] = [
  { key: 'smallWindow', label: 'Small Window', quantity: 2, unitPrice: 4.25, subtotal: 8.5 },
  { key: 'mediumWindow', label: 'Medium Window', quantity: 1, unitPrice: 6.75, subtotal: 6.75 },
  { key: 'largeWindow', label: 'Large Window', quantity: 3, unitPrice: 8, subtotal: 24 },
  { key: 'bayWindow', label: 'Bay Window', quantity: 1, unitPrice: null, subtotal: 0 },
  { key: 'normalDoor', label: 'Normal Door', quantity: 2, unitPrice: 9.5, subtotal: 19 },
  { key: 'frenchDoorSet', label: 'French Door Set', quantity: 1, unitPrice: 16.25, subtotal: 16.25 },
];

const originalPrices = {
  smallWindow: 4.25,
  mediumWindow: 6.75,
  largeWindow: 8,
  bayWindow: 0,
  normalDoor: 9.5,
  frenchDoorSet: 16.25,
};

const noContactDetails = {
  businessName: '',
  phone: '',
  email: '',
  website: '',
  other: '',
};

describe('saved quote exports', () => {
  beforeEach(() => {
    const values = new Map<string, string>();
    const localStorage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, String(value)),
      removeItem: (key: string) => values.delete(key),
      clear: () => values.clear(),
    };

    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: { localStorage },
    });
    savePriceLists([{ id: 'current-rates', name: 'Winter 2026', prices: originalPrices }]);
  });

  afterEach(() => {
    Reflect.deleteProperty(globalThis, 'window');
  });

  function saveHistoricalQuote() {
    const saved = saveQuote({
      address: '  12 Market Street, York  ',
      priceListId: 'current-rates',
      priceListName: 'Winter 2026',
      total: 74.5,
      lineItems: quoteLines,
    });
    return getQuote(saved.id)!;
  }

  it('keeps saved quote details in both exports after the current rates change', () => {
    const savedQuote = saveHistoricalQuote();
    const originalSummary = formatQuoteSummary(savedQuote, noContactDetails);
    const originalPrintHtml = buildQuotePrintHtml(savedQuote, noContactDetails);

    assert.match(originalSummary, /^Address: 12 Market Street, York$/m);
    assert.match(originalSummary, /^Price list: Winter 2026$/m);
    assert.match(originalSummary, /^Small Window \| 2 units \| £4\.25 each \| £8\.50$/m);
    assert.match(originalSummary, /^Medium Window \| 1 unit \| £6\.75 each \| £6\.75$/m);
    assert.match(originalSummary, /^Large Window \| 3 units \| £8\.00 each \| £24\.00$/m);
    assert.match(originalSummary, /^Bay Window \| 1 unit \| Not priced \| £0\.00$/m);
    assert.match(originalSummary, /^Normal Door \| 2 units \| £9\.50 each \| £19\.00$/m);
    assert.match(originalSummary, /^French Door Set \| 1 unit \| £16\.25 each \| £16\.25$/m);
    assert.match(originalSummary, /^QUOTED TOTAL: £74\.50$/m);

    assert.match(originalPrintHtml, /<p class="detail-value">12 Market Street, York<\/p>/);
    assert.match(originalPrintHtml, /<p class="detail-value">Winter 2026<\/p>/);
    assert.match(
      originalPrintHtml,
      /<td>Small Window<\/td>\s*<td>2<\/td>\s*<td>£4\.25 each<\/td>\s*<td>£8\.50<\/td>/,
    );
    assert.match(
      originalPrintHtml,
      /<td>Bay Window<\/td>\s*<td>1<\/td>\s*<td>Not priced<\/td>\s*<td>£0\.00<\/td>/,
    );
    assert.match(originalPrintHtml, /<span>Quoted total<\/span><span>£74\.50<\/span>/);
    for (const line of quoteLines) {
      const rate = line.unitPrice === null ? 'Not priced' : `£${line.unitPrice.toFixed(2)} each`;
      const row = `<td>${line.label}</td>\n      <td>${line.quantity}</td>\n      <td>${rate}</td>\n      <td>£${line.subtotal.toFixed(2)}</td>`;
      assert.ok(originalPrintHtml.includes(row), `Printable export should include ${line.label}`);
    }

    const updatedPrices = {
      smallWindow: 99,
      mediumWindow: 120,
      largeWindow: 140,
      bayWindow: 80,
      normalDoor: 105,
      frenchDoorSet: 160,
    };
    assert.ok(
      updatePriceList('current-rates', { name: 'Summer 2027', prices: updatedPrices }),
    );
    assert.deepEqual(loadPriceLists()[0], {
      id: 'current-rates',
      name: 'Summer 2027',
      prices: updatedPrices,
    });

    assert.equal(formatQuoteSummary(savedQuote, noContactDetails), originalSummary);
    assert.equal(buildQuotePrintHtml(savedQuote, noContactDetails), originalPrintHtml);
    assert.equal(getQuote(savedQuote.id)?.address, '12 Market Street, York');
    assert.equal(getQuote(savedQuote.id)?.priceListName, 'Winter 2026');
    assert.deepEqual(getQuote(savedQuote.id)?.lineItems, quoteLines);
    assert.equal(getQuote(savedQuote.id)?.total, 74.5);
  });

  it('does not mutate the saved quote while formatting its exports', () => {
    const savedQuote = saveHistoricalQuote();
    const originalSnapshot = structuredClone(savedQuote);

    formatQuoteSummary(savedQuote, noContactDetails);
    buildQuotePrintHtml(savedQuote, noContactDetails);

    assert.deepEqual(savedQuote, originalSnapshot);
    assert.deepEqual(getQuote(savedQuote.id), originalSnapshot);
  });
});
