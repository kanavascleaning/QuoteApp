import {
  LAST_USED_PRICE_LIST_STORAGE_KEY,
  PRICE_LISTS_STORAGE_KEY,
  isValidPriceList,
  loadLastUsedPriceListId,
  loadPriceLists,
  type PriceList,
} from '@/lib/prices';
import {
  BUSINESS_CONTACT_STORAGE_KEY,
  SAVED_QUOTES_STORAGE_KEY,
  isValidSavedQuote,
  loadBusinessContactDetails,
  loadQuotes,
  type BusinessContactDetails,
  type SavedQuote,
} from '@/lib/quotes';

export const BACKUP_FORMAT = 'clearpane-window-cleaning-backup';
export const BACKUP_VERSION = 1;

export type PortableBackup = {
  format: typeof BACKUP_FORMAT;
  version: typeof BACKUP_VERSION;
  createdAt: string;
  quotes: SavedQuote[];
  priceLists: PriceList[];
  businessContact: BusinessContactDetails;
  lastUsedPriceListId?: string;
};

const CONTACT_FIELDS: (keyof BusinessContactDetails)[] = [
  'businessName',
  'phone',
  'email',
  'website',
  'other',
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isValidBusinessContact(value: unknown): value is BusinessContactDetails {
  return isRecord(value) && CONTACT_FIELDS.every((field) => typeof value[field] === 'string');
}

function hasUniqueIds<T extends { id: string }>(items: T[]): boolean {
  return new Set(items.map((item) => item.id)).size === items.length;
}

export function validateBackup(value: unknown): PortableBackup {
  if (!isRecord(value)) {
    throw new Error('This file does not contain a backup object.');
  }
  if (value.format !== BACKUP_FORMAT) {
    throw new Error('This file is not a Clearpane window-cleaning backup.');
  }
  if (value.version !== BACKUP_VERSION) {
    throw new Error('This backup version is not supported by this app.');
  }
  if (typeof value.createdAt !== 'string' || Number.isNaN(Date.parse(value.createdAt))) {
    throw new Error('The backup date is missing or invalid.');
  }
  if (
    !Array.isArray(value.quotes) ||
    !value.quotes.every(isValidSavedQuote) ||
    !hasUniqueIds(value.quotes as SavedQuote[])
  ) {
    throw new Error('The backup contains invalid or duplicate saved quotes.');
  }
  if (
    !Array.isArray(value.priceLists) ||
    value.priceLists.length === 0 ||
    !value.priceLists.every(isValidPriceList) ||
    !hasUniqueIds(value.priceLists as PriceList[])
  ) {
    throw new Error('The backup must contain valid, uniquely identified price lists.');
  }
  if (!isValidBusinessContact(value.businessContact)) {
    throw new Error('The backup contains invalid business contact details.');
  }
  if (
    value.lastUsedPriceListId !== undefined &&
    (typeof value.lastUsedPriceListId !== 'string' ||
      !value.priceLists.some((list) => list.id === value.lastUsedPriceListId))
  ) {
    throw new Error('The backup refers to a price list that is not included.');
  }

  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    createdAt: value.createdAt,
    quotes: (value.quotes as SavedQuote[]).map((quote) => ({
      ...quote,
      lineItems: quote.lineItems.map((line) => ({ ...line })),
    })),
    priceLists: (value.priceLists as PriceList[]).map((list) => ({
      ...list,
      prices: { ...list.prices },
    })),
    businessContact: { ...value.businessContact },
    ...(typeof value.lastUsedPriceListId === 'string'
      ? { lastUsedPriceListId: value.lastUsedPriceListId }
      : {}),
  };
}

export function createBackup(): PortableBackup {
  const priceLists = loadPriceLists();
  const backup: PortableBackup = {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    createdAt: new Date().toISOString(),
    quotes: loadQuotes(),
    priceLists,
    businessContact: loadBusinessContactDetails(),
  };
  const lastUsedPriceListId = loadLastUsedPriceListId();
  if (lastUsedPriceListId && priceLists.some((list) => list.id === lastUsedPriceListId)) {
    backup.lastUsedPriceListId = lastUsedPriceListId;
  }
  return backup;
}

export function parseBackupFile(contents: string): PortableBackup {
  let decoded: unknown;
  try {
    decoded = JSON.parse(contents);
  } catch {
    throw new Error('The selected file is not valid JSON.');
  }
  return validateBackup(decoded);
}

export function restoreBackup(value: unknown): PortableBackup {
  const backup = validateBackup(value);
  if (typeof window === 'undefined') {
    throw new Error('Backup restore is only available in a browser.');
  }

  let storage: Storage;
  try {
    storage = window.localStorage;
  } catch {
    throw new Error('Browser storage is unavailable. No saved data was changed.');
  }

  const valuesToWrite: [string, string | null][] = [
    [SAVED_QUOTES_STORAGE_KEY, JSON.stringify(backup.quotes)],
    [PRICE_LISTS_STORAGE_KEY, JSON.stringify(backup.priceLists)],
    [BUSINESS_CONTACT_STORAGE_KEY, JSON.stringify(backup.businessContact)],
    [LAST_USED_PRICE_LIST_STORAGE_KEY, backup.lastUsedPriceListId ?? null],
  ];
  let previousValues: (readonly [string, string | null])[];
  try {
    previousValues = valuesToWrite.map(([key]) => [key, storage.getItem(key)] as const);
  } catch {
    throw new Error('Browser storage could not be read. No saved data was changed.');
  }

  try {
    for (const [key, valueToWrite] of valuesToWrite) {
      if (valueToWrite === null) storage.removeItem(key);
      else storage.setItem(key, valueToWrite);
    }
  } catch {
    let rollbackFailed = false;
    for (const [key, previousValue] of previousValues) {
      try {
        if (previousValue === null) storage.removeItem(key);
        else storage.setItem(key, previousValue);
      } catch {
        rollbackFailed = true;
      }
    }
    if (rollbackFailed) {
      throw new Error('Restore could not finish. Reload the app and check your saved information.');
    }
    throw new Error('This device could not save the backup. Your previous data was kept.');
  }

  return backup;
}
