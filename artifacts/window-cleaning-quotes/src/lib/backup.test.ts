import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';
import {
  createBackup,
  parseBackupFile,
  restoreBackup,
  type PortableBackup,
} from '@/lib/backup';
import {
  loadLastUsedPriceListId,
  loadPriceLists,
  saveLastUsedPriceListId,
  savePriceLists,
  type PriceSettings,
} from '@/lib/prices';
import {
  BUSINESS_CONTACT_STORAGE_KEY,
  loadBusinessContactDetails,
  loadQuotes,
  saveBusinessContactDetails,
  saveQuote,
  type BusinessContactDetails,
  type SavedQuoteLineItem,
} from '@/lib/quotes';

const contact: BusinessContactDetails = {
  businessName: 'Clearpane Window Cleaning',
  phone: '01234 567890',
  email: 'hello@clearpane.example',
  website: 'clearpane.example',
  other: 'Text for a free estimate',
};
const prices: PriceSettings = {
  smallWindow: 3.5,
  mediumWindow: 5.25,
  largeWindow: 7,
  bayWindow: 12.5,
  normalDoor: 8.5,
  frenchDoorSet: 14,
};
const lineItems: SavedQuoteLineItem[] = [
  { key: 'smallWindow', label: 'Small Window', quantity: 2, unitPrice: 3.5, subtotal: 7 },
  { key: 'mediumWindow', label: 'Medium Window', quantity: 0, unitPrice: 5.25, subtotal: 0 },
  { key: 'largeWindow', label: 'Large Window', quantity: 0, unitPrice: 7, subtotal: 0 },
  { key: 'bayWindow', label: 'Bay Window', quantity: 0, unitPrice: 12.5, subtotal: 0 },
  { key: 'normalDoor', label: 'Normal Door', quantity: 0, unitPrice: 8.5, subtotal: 0 },
  { key: 'frenchDoorSet', label: 'French Door Set', quantity: 0, unitPrice: 14, subtotal: 0 },
];

function installStorage() {
  const values = new Map<string, string>();
  let failNextContactWrite = false;
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      if (failNextContactWrite && key === BUSINESS_CONTACT_STORAGE_KEY) {
        failNextContactWrite = false;
        throw new Error('Storage is full');
      }
      values.set(key, String(value));
    },
    removeItem: (key: string) => values.delete(key),
    clear: () => values.clear(),
    failNextContactWrite: () => {
      failNextContactWrite = true;
    },
  };
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { localStorage: storage },
  });
  return { storage, values };
}

function seedSavedData() {
  savePriceLists([{ id: 'list-winter', name: 'Winter', prices }]);
  saveLastUsedPriceListId('list-winter');
  saveBusinessContactDetails(contact);
  saveQuote({
    id: 'quote-1',
    address: '12 Market Street, York',
    priceListId: 'list-winter',
    priceListName: 'Winter',
    total: 7,
    lineItems,
  });
}

describe('portable saved-data backups', () => {
  let storageState: ReturnType<typeof installStorage>;

  beforeEach(() => {
    storageState = installStorage();
    seedSavedData();
  });

  afterEach(() => {
    Reflect.deleteProperty(globalThis, 'window');
  });

  it('exports quotes, price lists, contact details, and the last-used list', () => {
    const backup = createBackup();

    assert.equal(backup.quotes.length, 1);
    assert.equal(backup.priceLists[0].id, 'list-winter');
    assert.deepEqual(backup.businessContact, contact);
    assert.equal(backup.lastUsedPriceListId, 'list-winter');
    assert.ok(!Number.isNaN(Date.parse(backup.createdAt)));
  });

  it('omits a stale last-used list setting from the backup', () => {
    saveLastUsedPriceListId('deleted-list');

    const backup = createBackup();

    assert.equal(backup.lastUsedPriceListId, undefined);
    assert.doesNotThrow(() => parseBackupFile(JSON.stringify(backup)));
  });

  it('parses and validates a complete backup file', () => {
    const backup = createBackup();
    assert.deepEqual(parseBackupFile(JSON.stringify(backup)), backup);
  });

  it('rejects invalid JSON and unsupported backup versions', () => {
    assert.throws(() => parseBackupFile('{broken'), /not valid JSON/i);
    assert.throws(
      () => parseBackupFile(JSON.stringify({ ...createBackup(), version: 99 })),
      /version is not supported/i,
    );
  });

  it('rejects malformed records and duplicate saved IDs', () => {
    const backup = createBackup();
    const badQuote = { ...backup, quotes: [{ ...backup.quotes[0], total: -1 }] };
    const duplicateQuote = { ...backup, quotes: [...backup.quotes, backup.quotes[0]] };
    const badList = {
      ...backup,
      priceLists: [{ ...backup.priceLists[0], prices: { ...prices, smallWindow: -1 } }],
    };
    const missingContact = {
      ...backup,
      businessContact: { ...backup.businessContact, phone: 123 },
    };

    assert.throws(() => parseBackupFile(JSON.stringify(badQuote)), /invalid or duplicate saved quotes/i);
    assert.throws(() => parseBackupFile(JSON.stringify(duplicateQuote)), /invalid or duplicate saved quotes/i);
    assert.throws(() => parseBackupFile(JSON.stringify(badList)), /valid, uniquely identified price lists/i);
    assert.throws(() => parseBackupFile(JSON.stringify(missingContact)), /invalid business contact/i);
  });

  it('replaces existing saved data only when restore is called', () => {
    const backup = createBackup();
    saveQuote({
      address: 'Existing quote',
      total: 0,
      lineItems: lineItems.map((line) => ({ ...line, quantity: 0, subtotal: 0 })),
    });
    saveBusinessContactDetails({ ...contact, businessName: 'Current business' });

    restoreBackup(backup);

    assert.deepEqual(loadQuotes(), backup.quotes);
    assert.deepEqual(loadPriceLists(), backup.priceLists);
    assert.deepEqual(loadBusinessContactDetails(), backup.businessContact);
    assert.equal(loadLastUsedPriceListId(), backup.lastUsedPriceListId);
  });

  it('keeps existing data when a storage write fails partway through restore', () => {
    const backup = createBackup();
    const originalValues = new Map(storageState.values);
    const replacement: PortableBackup = {
      ...backup,
      quotes: [],
      priceLists: [{ id: 'list-new', name: 'New rates', prices }],
      businessContact: { ...contact, businessName: 'Replacement business' },
      lastUsedPriceListId: 'list-new',
    };
    storageState.storage.failNextContactWrite();

    assert.throws(() => restoreBackup(replacement), /previous data was kept/i);
    assert.deepEqual(new Map(storageState.values), originalValues);
  });
});

