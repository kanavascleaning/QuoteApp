import type { PriceKey } from '@/lib/prices';

export type QuoteItemDefinition = {
  readonly key: PriceKey;
  readonly label: string;
  readonly hint: string;
};

export const QUOTE_ITEMS: readonly QuoteItemDefinition[] = [
  { key: 'smallWindow', label: 'Small Window', hint: '1 pane' },
  { key: 'mediumWindow', label: 'Medium Window', hint: '2 panes' },
  { key: 'largeWindow', label: 'Large Window', hint: '3 panes' },
  { key: 'bayWindow', label: 'Bay Window', hint: 'Full bay' },
  { key: 'normalDoor', label: 'Normal Door', hint: 'Single door' },
  { key: 'frenchDoorSet', label: 'French Door Set', hint: 'Door pair' },
];