import {
  Check,
  ContactRound,
  Download,
  FileJson,
  ListPlus,
  LoaderCircle,
  Settings2,
  Trash2,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { AppHeader, AppShell } from '@/components/app-shell';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { QUOTE_ITEMS } from '@/lib/quote-items';
import {
  createBackup,
  parseBackupFile,
  restoreBackup,
  type PortableBackup,
} from '@/lib/backup';
import {
  loadBusinessContactDetails,
  saveBusinessContactDetails,
  type BusinessContactDetails,
} from '@/lib/quotes';
import {
  ZERO_PRICES,
  createPriceList,
  deletePriceList,
  loadPriceLists,
  updatePriceList,
  type PriceKey,
  type PriceList,
  type PriceSettings,
} from '@/lib/prices';

type SaveState = 'idle' | 'saving' | 'saved';

export default function SettingsPage() {
  const [priceLists, setPriceLists] = useState<PriceList[] | null>(null);
  const [selectedListId, setSelectedListId] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [draft, setDraft] = useState<Record<PriceKey, string>>(toDraft(ZERO_PRICES));
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [businessContact, setBusinessContact] = useState<BusinessContactDetails>(
    () => loadBusinessContactDetails(),
  );
  const [contactSaveState, setContactSaveState] = useState<SaveState>('idle');
  const [validationMessage, setValidationMessage] = useState('');
  const [deleteConfirmationId, setDeleteConfirmationId] = useState<string | null>(null);
  const [selectedBackup, setSelectedBackup] = useState<PortableBackup | null>(null);
  const [backupStatus, setBackupStatus] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);
  const [isConfirmingBackupRestore, setIsConfirmingBackupRestore] = useState(false);

  useEffect(() => {
    const loaded = loadPriceLists();
    setPriceLists(loaded);
    setSelectedListId(loaded[0].id);
  }, []);

  const selectedList = useMemo(
    () => priceLists?.find((list) => list.id === selectedListId),
    [priceLists, selectedListId],
  );

  useEffect(() => {
    if (isCreating) return;
    if (!selectedList) return;
    setDraftName(selectedList.name);
    setDraft(toDraft(selectedList.prices));
    setSaveState('idle');
    setValidationMessage('');
    setDeleteConfirmationId(null);
  }, [isCreating, selectedList]);

  function selectList(id: string) {
    setIsCreating(false);
    setSelectedListId(id);
  }

  function startCreating() {
    setIsCreating(true);
    setSelectedListId('');
    setDraftName('');
    setDraft(toDraft(ZERO_PRICES));
    setSaveState('idle');
    setValidationMessage('');
    setDeleteConfirmationId(null);
  }

  function cancelCreating() {
    const fallback = priceLists?.[0];
    if (!fallback) return;
    setIsCreating(false);
    setSelectedListId(fallback.id);
  }

  function updatePrice(key: PriceKey, value: string) {
    setDraft((current) => ({ ...current, [key]: normalisePriceInput(value) }));
    setSaveState('idle');
    setValidationMessage('');
  }

  function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!priceLists) return;

    const name = draftName.trim();
    if (!name) {
      setValidationMessage('Give this price list a name before saving.');
      return;
    }

    const invalidFields = QUOTE_ITEMS.filter(({ key }) => isInvalidPriceInput(draft[key]));
    if (invalidFields.length > 0) {
      setValidationMessage(
        `${invalidFields.map((field) => field.label).join(', ')} ${invalidFields.length === 1 ? 'has' : 'have'} an invalid price. Use zero or a positive amount.`,
      );
      return;
    }

    const prices = draftToPrices(draft);
    setSaveState('saving');

    if (isCreating) {
      const created = createPriceList(name, prices);
      setPriceLists(loadPriceLists());
      setSelectedListId(created.id);
      setIsCreating(false);
    } else if (selectedList) {
      updatePriceList(selectedList.id, { name, prices });
      setPriceLists(loadPriceLists());
    }

    window.setTimeout(() => setSaveState('saved'), 220);
  }

  function handleSaveBusinessContact(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusinessContact(saveBusinessContactDetails(businessContact));
    setContactSaveState('saved');
  }

  function handleExportBackup() {
    try {
      const backup = createBackup();
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `clearpane-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setBackupStatus({ kind: 'success', message: 'Backup downloaded. Keep the file somewhere safe.' });
    } catch {
      setBackupStatus({ kind: 'error', message: 'The backup could not be downloaded. Check your device storage and try again.' });
    }
  }

  async function handleBackupFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    setSelectedBackup(null);
    setBackupStatus(null);
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setBackupStatus({ kind: 'error', message: 'This file is too large to be a valid backup (maximum 10 MB).' });
      return;
    }

    try {
      setSelectedBackup(parseBackupFile(await file.text()));
    } catch (error) {
      setBackupStatus({
        kind: 'error',
        message: error instanceof Error ? error.message : 'The selected backup could not be read.',
      });
    }
  }

  function handleRestoreBackup() {
    if (!selectedBackup) return;
    try {
      const restored = restoreBackup(selectedBackup);
      setPriceLists(restored.priceLists);
      setSelectedListId(restored.priceLists[0].id);
      setIsCreating(false);
      setBusinessContact(restored.businessContact);
      setContactSaveState('idle');
      setSelectedBackup(null);
      setBackupStatus({ kind: 'success', message: 'Backup restored on this device.' });
    } catch (error) {
      setBackupStatus({
        kind: 'error',
        message: error instanceof Error ? error.message : 'The backup could not be restored.',
      });
    } finally {
      setIsConfirmingBackupRestore(false);
    }
  }

  function updateBusinessContact(field: keyof BusinessContactDetails, value: string) {
    setBusinessContact((current) => ({ ...current, [field]: value }));
    setContactSaveState('idle');
  }

  function requestDelete() {
    if (!selectedList || !priceLists) return;
    if (priceLists.length <= 1) {
      setValidationMessage('Keep at least one price list. Create another list before deleting this one.');
      return;
    }
    setDeleteConfirmationId(selectedList.id);
    setValidationMessage('');
  }

  function confirmDelete() {
    if (!selectedList || !priceLists) return;
    if (!deletePriceList(selectedList.id)) {
      setValidationMessage('At least one price list must remain.');
      setDeleteConfirmationId(null);
      return;
    }

    const next = loadPriceLists();
    setPriceLists(next);
    setSelectedListId(next[0].id);
    setDeleteConfirmationId(null);
    setValidationMessage('');
  }

  if (!priceLists) {
    return (
      <AppShell>
        <div className="page-wrap">
          <AppHeader />
          <div className="skeleton-card" aria-label="Loading price lists" data-testid="loading-price-lists" />
        </div>
      </AppShell>
    );
  }

  const currentPrices = isCreating ? draftToPrices(draft) : selectedList?.prices ?? ZERO_PRICES;
  const hasPrices = Object.values(currentPrices).some((price) => price > 0);

  return (
    <AppShell>
      <div className="page-wrap">
        <AppHeader />
        <section aria-labelledby="settings-title">
          <div className="settings-heading">
            <div>
              <p className="eyebrow">Your rate cards</p>
              <h1 className="page-heading" id="settings-title">Price by area.</h1>
            </div>
            <span className="settings-heading-icon" aria-hidden="true">
              <Settings2 size={22} />
            </span>
          </div>
          <p className="page-intro">
            Keep a separate rate card for each area you work in. Quotes keep
            the prices used at the time they were saved.
          </p>
        </section>

        <section className="price-lists-section" aria-labelledby="price-lists-title">
          <div className="list-section-heading">
            <div>
              <p className="section-label" id="price-lists-title">Price lists</p>
              <p className="saved-quotes-copy">Choose a list to edit it.</p>
            </div>
            <button
              className="small-action-button"
              type="button"
              onClick={startCreating}
              data-testid="button-new-price-list"
            >
              <ListPlus size={16} aria-hidden="true" />
              New list
            </button>
          </div>

          <div className="price-list-cards" aria-label="Price lists">
            {priceLists.map((list) => (
              <button
                className={`price-list-card ${!isCreating && selectedListId === list.id ? 'is-selected' : ''}`}
                type="button"
                key={list.id}
                onClick={() => selectList(list.id)}
                data-testid={`button-price-list-${list.id}`}
              >
                <span className="price-list-card-copy">
                  <strong>{list.name}</strong>
                  <span>{priceSummary(list.prices)}</span>
                </span>
                <span className="price-list-card-mark" aria-hidden="true">
                  {selectedListId === list.id && !isCreating ? <Check size={16} /> : <span />}
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="price-editor-section" aria-labelledby="price-editor-title">
          <div className="editor-heading">
            <div>
              <p className="section-label" id="price-editor-title">
                {isCreating ? 'New price list' : 'Edit price list'}
              </p>
              <p className="saved-quotes-copy">
                {isCreating ? 'Start with blank prices for a new area.' : 'Changes only affect this list.'}
              </p>
            </div>
            {isCreating && (
              <button className="text-button" type="button" onClick={cancelCreating} data-testid="button-cancel-new-price-list">
                Cancel
              </button>
            )}
          </div>

          {!hasPrices && (
            <div className="empty-state compact-empty-state" role="status" data-testid="empty-prices-state">
              <span className="saved-empty-icon" aria-hidden="true"><Settings2 size={19} /></span>
              <div>
                <p className="saved-empty-title">No prices set yet</p>
                <p className="saved-empty-copy">Add a rate for each item, then save this price list.</p>
              </div>
            </div>
          )}

          <form noValidate onSubmit={handleSave} data-testid="form-prices">
            <div className="settings-card">
              <div className="price-list-name-row">
                <label className="price-label" htmlFor="price-list-name">List name</label>
                <input
                  className="price-list-name-input"
                  id="price-list-name"
                  type="text"
                  value={draftName}
                  onChange={(event) => {
                    setDraftName(event.target.value);
                    setSaveState('idle');
                    setValidationMessage('');
                  }}
                  placeholder="e.g. Pontypridd"
                  autoComplete="off"
                  enterKeyHint="next"
                  data-testid="input-price-list-name"
                />
              </div>

              {QUOTE_ITEMS.map((field) => (
                <div className="price-row" key={field.key}>
                  <label className="price-label" htmlFor={`price-${field.key}`}>{field.label}</label>
                  <div className="currency-input">
                    <span className="currency-symbol" aria-hidden="true">£</span>
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
                    Saving list
                  </>
                ) : saveState === 'saved' ? (
                  <>
                    <Check size={17} aria-hidden="true" />
                    List saved
                  </>
                ) : (
                  'Save price list'
                )}
              </button>
              {validationMessage && (
                <p className="form-validation-message" role="alert" data-testid="status-price-validation">
                  {validationMessage}
                </p>
              )}
              <p className={`save-feedback ${saveState === 'saved' ? 'is-success' : ''}`} aria-live="polite" data-testid="status-save-prices">
                {saveState === 'saved' ? 'Saved on this device.' : 'Each list is stored independently on this device.'}
              </p>
            </div>
          </form>

          {!isCreating && selectedList && (
            <div className="delete-list-zone">
              {deleteConfirmationId === selectedList.id ? (
                <div className="delete-confirmation" role="alert" data-testid="status-delete-price-list-confirmation">
                  <p>Delete “{selectedList.name}”? This cannot be undone.</p>
                  <div className="delete-confirmation-actions">
                    <button className="secondary-button" type="button" onClick={() => setDeleteConfirmationId(null)} data-testid="button-cancel-delete-price-list">
                      Keep list
                    </button>
                    <button className="danger-button danger-button-solid" type="button" onClick={confirmDelete} data-testid="button-confirm-delete-price-list">
                      <Trash2 size={16} aria-hidden="true" />
                      Delete
                    </button>
                  </div>
                </div>
              ) : (
                <button className="danger-button" type="button" onClick={requestDelete} data-testid="button-delete-price-list">
                  <Trash2 size={16} aria-hidden="true" />
                  Delete this price list
                </button>
              )}
            </div>
          )}
        </section>

        <section className="business-contact-section" aria-labelledby="business-contact-title">
          <div className="settings-heading">
            <div>
              <p className="eyebrow">Customer-ready quotes</p>
              <h2 className="page-heading" id="business-contact-title">Business contact.</h2>
            </div>
            <span className="settings-heading-icon" aria-hidden="true">
              <ContactRound size={22} />
            </span>
          </div>
          <p className="page-intro">
            Add the details customers can use to reach you. They appear on PDF and copied quote summaries.
          </p>

          <form onSubmit={handleSaveBusinessContact} data-testid="form-business-contact">
            <div className="settings-card business-contact-card">
              <div className="contact-field">
                <label className="price-label" htmlFor="business-contact-name">Business name</label>
                <input
                  className="price-list-name-input"
                  id="business-contact-name"
                  type="text"
                  autoComplete="organization"
                  value={businessContact.businessName}
                  onChange={(event) => updateBusinessContact('businessName', event.target.value)}
                  placeholder="e.g. Clearpane Window Cleaning"
                  data-testid="input-business-name"
                />
              </div>
              <div className="contact-field">
                <label className="price-label" htmlFor="business-contact-phone">Phone</label>
                <input
                  className="price-list-name-input"
                  id="business-contact-phone"
                  type="tel"
                  autoComplete="tel"
                  value={businessContact.phone}
                  onChange={(event) => updateBusinessContact('phone', event.target.value)}
                  placeholder="Your business phone number"
                  data-testid="input-business-phone"
                />
              </div>
              <div className="contact-field">
                <label className="price-label" htmlFor="business-contact-email">Email</label>
                <input
                  className="price-list-name-input"
                  id="business-contact-email"
                  type="email"
                  autoComplete="email"
                  value={businessContact.email}
                  onChange={(event) => updateBusinessContact('email', event.target.value)}
                  placeholder="you@example.com"
                  data-testid="input-business-email"
                />
              </div>
              <div className="contact-field">
                <label className="price-label" htmlFor="business-contact-website">Website</label>
                <input
                  className="price-list-name-input"
                  id="business-contact-website"
                  type="text"
                  autoComplete="url"
                  value={businessContact.website}
                  onChange={(event) => updateBusinessContact('website', event.target.value)}
                  placeholder="yourwebsite.co.uk"
                  data-testid="input-business-website"
                />
              </div>
              <div className="contact-field">
                <label className="price-label" htmlFor="business-contact-other">Other contact details</label>
                <textarea
                  className="price-list-name-input business-contact-other"
                  id="business-contact-other"
                  value={businessContact.other}
                  onChange={(event) => updateBusinessContact('other', event.target.value)}
                  placeholder="Add another way for customers to reach you"
                  data-testid="input-business-other"
                />
              </div>
            </div>
            <div className="save-zone contact-save-zone">
              <button className="save-button" type="submit" data-testid="button-save-business-contact">
                {contactSaveState === 'saved' ? (
                  <>
                    <Check size={17} aria-hidden="true" />
                    Contact details saved
                  </>
                ) : (
                  'Save contact details'
                )}
              </button>
              <p className={`save-feedback ${contactSaveState === 'saved' ? 'is-success' : ''}`} aria-live="polite" data-testid="status-business-contact">
                {contactSaveState === 'saved'
                  ? 'Saved on this device. New exports will include these details.'
                  : 'Optional details are stored on this device.'}
              </p>
            </div>
          </form>
        </section>

        <section className="data-backup-section" aria-labelledby="data-backup-title">
          <div className="settings-heading">
            <div>
              <p className="eyebrow">Moving devices</p>
              <h2 className="page-heading" id="data-backup-title">Backup your data.</h2>
            </div>
            <span className="settings-heading-icon" aria-hidden="true">
              <FileJson size={22} />
            </span>
          </div>
          <p className="page-intro">
            Save your quotes, price lists, and business contact details in a file you can restore on another device.
            Backup files may include customer addresses, so store them somewhere private.
          </p>

          <div className="settings-card backup-card">
            <div className="backup-action-row">
              <div className="backup-action-copy">
                <strong>Export a backup</strong>
                <span>Download a copy of your saved information.</span>
              </div>
              <button
                className="small-action-button"
                type="button"
                onClick={handleExportBackup}
                data-testid="button-export-backup"
              >
                <Download size={16} aria-hidden="true" />
                Download backup
              </button>
            </div>

            <div className="backup-file-field">
              <label className="price-label" htmlFor="backup-file">Restore from a backup file</label>
              <input
                className="price-list-name-input"
                id="backup-file"
                type="file"
                accept=".json,application/json"
                onChange={handleBackupFileChange}
                data-testid="input-backup-file"
              />
              {selectedBackup && (
                <div className="backup-preview" role="status" data-testid="status-backup-preview">
                  <strong>Backup checked</strong>
                  <span>
                    {selectedBackup.quotes.length} {selectedBackup.quotes.length === 1 ? 'quote' : 'quotes'},
                    {' '}{selectedBackup.priceLists.length} {selectedBackup.priceLists.length === 1 ? 'price list' : 'price lists'},
                    {' '}· Created {new Date(selectedBackup.createdAt).toLocaleDateString('en-GB')}
                  </span>
                  <button
                    className="save-button"
                    type="button"
                    onClick={() => setIsConfirmingBackupRestore(true)}
                    data-testid="button-restore-backup"
                  >
                    Restore backup
                  </button>
                </div>
              )}
              {backupStatus && (
                <p
                  className={`backup-status ${backupStatus.kind === 'error' ? 'is-error' : 'is-success'}`}
                  role={backupStatus.kind === 'error' ? 'alert' : 'status'}
                  data-testid="status-backup"
                >
                  {backupStatus.message}
                </p>
              )}
            </div>
          </div>
        </section>

        <AlertDialog open={isConfirmingBackupRestore} onOpenChange={setIsConfirmingBackupRestore}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Replace saved data with this backup?</AlertDialogTitle>
              <AlertDialogDescription>
                This replaces all saved quotes, price lists, and business contact details on this device. This cannot be undone.
                The backup contains {selectedBackup?.quotes.length ?? 0} {selectedBackup?.quotes.length === 1 ? 'quote' : 'quotes'} and{' '}
                {selectedBackup?.priceLists.length ?? 0} {selectedBackup?.priceLists.length === 1 ? 'price list' : 'price lists'}.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="danger-button danger-button-solid"
                onClick={handleRestoreBackup}
                data-testid="button-confirm-restore-backup"
              >
                Replace saved data
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppShell>
  );
}

function priceSummary(prices: PriceSettings): string {
  const count = Object.values(prices).filter((price) => price > 0).length;
  return count === 0 ? 'No prices set' : `${count} of ${QUOTE_ITEMS.length} prices set`;
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

function draftToPrices(draft: Record<PriceKey, string>): PriceSettings {
  return QUOTE_ITEMS.reduce((next, field) => {
    const value = Number.parseFloat(draft[field.key]);
    next[field.key] =
      Number.isFinite(value) && value >= 0 ? Math.round(value * 100) / 100 : 0;
    return next;
  }, {} as PriceSettings);
}

function toDraft(prices: PriceSettings): Record<PriceKey, string> {
  return QUOTE_ITEMS.reduce(
    (draft, field) => {
      draft[field.key] = prices[field.key].toFixed(2);
      return draft;
    },
    {} as Record<PriceKey, string>,
  );
}