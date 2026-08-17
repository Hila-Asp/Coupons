import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import {
  BARCODE_FORMATS,
  COMPANY_COLOR_PRESETS,
  createCompany,
  createImportRecord,
  createVoucher,
  type BarcodeFormat,
  type Company,
  type Voucher,
} from '../db';
import { assertNever } from '../lib/assertNever';
import { cx } from '../lib/cx';
import { Banner, Button, Card, Input, Select } from '../ui';
import { CompanyPicker, NEW_COMPANY_VALUE } from './CompanyPicker';
import { formatIls, parseIlsInput } from './formatIls';
import type { ImportDraft, ScrapeStatus } from './importTypes';
import { isPluxeeVoucherUrl, isTwentyDigitCode } from './pluxee';

const BARCODE_OPTIONS = [
  { value: 'code128', label: 'Code 128' },
  { value: 'itf', label: 'ITF' },
  { value: 'ean13', label: 'EAN-13' },
  { value: 'qr', label: 'QR code' },
  { value: 'image', label: 'Photo' },
  { value: 'none', label: 'None' },
] as const satisfies readonly { value: BarcodeFormat; label: string }[];

function isBarcodeFormat(value: string): value is BarcodeFormat {
  return (BARCODE_FORMATS as readonly string[]).includes(value);
}

function dateInputFromTimestamp(value: number): string {
  return new Date(value).toISOString().slice(0, 10);
}

function timestampFromDateInput(value: string): number | undefined {
  if (!value) {
    return undefined;
  }
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) {
    return undefined;
  }
  return Date.UTC(year, month - 1, day);
}

function formatPurchasedAt(value: number): string {
  return new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function findCompanyByName(
  companies: readonly Company[] | undefined,
  name: string,
): Company | undefined {
  const needle = name.trim().toLowerCase();
  if (!needle || !companies) {
    return undefined;
  }
  return companies.find((company) => company.name.trim().toLowerCase() === needle);
}

function openVoucherPage(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer');
}

export interface ImportReviewFormProps {
  draft: ImportDraft;
  scrape: ScrapeStatus;
  companies: readonly Company[] | undefined;
  onSkipScrape: () => void;
  onLookupCode: (url: string) => void;
  onSaved: (voucher: Voucher, companyName: string) => void;
}

export function ImportReviewForm({
  draft,
  scrape,
  companies,
  onSkipScrape,
  onLookupCode,
  onSaved,
}: ImportReviewFormProps) {
  const parsed = draft.parsed;
  const matchedCompany = findCompanyByName(companies, parsed.companyName);
  const [companyId, setCompanyId] = useState(
    () => matchedCompany?.id ?? NEW_COMPANY_VALUE,
  );
  const [newCompanyName, setNewCompanyName] = useState(parsed.companyName);
  const [newCompanyColor, setNewCompanyColor] = useState<string>(
    COMPANY_COLOR_PRESETS[0],
  );
  const [code, setCode] = useState(parsed.code ?? '');
  const [cvv, setCvv] = useState(parsed.cvv ?? '');
  const [balanceInput, setBalanceInput] = useState(
    parsed.balance === undefined ? '' : parsed.balance.toFixed(2),
  );
  const [initialTouched, setInitialTouched] = useState(false);
  const [initialInput, setInitialInput] = useState(
    parsed.balance === undefined ? '' : parsed.balance.toFixed(2),
  );
  const [url, setUrl] = useState(parsed.url ?? '');
  const [expiresInput, setExpiresInput] = useState(
    parsed.expiresAt ? dateInputFromTimestamp(parsed.expiresAt) : '',
  );
  const [barcodeFormat, setBarcodeFormat] = useState<BarcodeFormat>(
    parsed.barcodeFormat,
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const codeRef = useRef<HTMLInputElement>(null);
  const matchedOnce = useRef(Boolean(matchedCompany));

  useEffect(() => {
    if (matchedOnce.current || !companies) {
      return;
    }
    const match = findCompanyByName(companies, parsed.companyName);
    if (match) {
      matchedOnce.current = true;
      setCompanyId(match.id);
    }
  }, [companies, parsed.companyName]);

  useEffect(() => {
    if (scrape.kind === 'success' && scrape.code) {
      setCode((current) => current || scrape.code);
      if (barcodeFormat === 'none') {
        setBarcodeFormat('code128');
      }
    }
  }, [barcodeFormat, scrape]);

  useEffect(() => {
    if (scrape.kind === 'failed' || scrape.kind === 'skipped') {
      codeRef.current?.focus();
    }
  }, [scrape.kind]);

  const balance = parseIlsInput(balanceInput);
  const pluxeeUrl = isPluxeeVoucherUrl(url);
  const showManualCodeHelp =
    pluxeeUrl &&
    (scrape.kind === 'failed' ||
      scrape.kind === 'skipped' ||
      (scrape.kind !== 'success' &&
        scrape.kind !== 'choice' &&
        scrape.kind !== 'loading' &&
        !isTwentyDigitCode(code)));

  const heroAmount = useMemo(() => {
    if (balance === undefined) {
      return null;
    }
    return formatIls(balance);
  }, [balance]);

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (companyId === NEW_COMPANY_VALUE && !newCompanyName.trim()) {
      next.company = 'Enter a company name.';
    }
    if (companyId !== NEW_COMPANY_VALUE && !companyId) {
      next.company = 'Choose a company.';
    }
    if (!code.trim()) {
      next.code = pluxeeUrl
        ? 'Paste the 20-digit code from the voucher page.'
        : 'Enter the voucher code.';
    } else if (pluxeeUrl && !isTwentyDigitCode(code)) {
      next.code = 'Pluxee codes are 20 digits.';
    }
    if (balance === undefined) {
      next.balance = 'Enter the remaining balance.';
    } else if (balance < 0) {
      next.balance = 'Balance cannot be negative.';
    }
    const initial = parseIlsInput(initialInput);
    if (initialInput && initial === undefined) {
      next.initial = 'Enter a valid amount.';
    } else if (initial !== undefined && initial < 0) {
      next.initial = 'Initial balance cannot be negative.';
    }
    if (url.trim()) {
      try {
        new URL(url.trim());
      } catch {
        next.url = 'Enter a valid URL.';
      }
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!validate() || balance === undefined) {
      return;
    }

    setSaving(true);
    setSaveError(null);
    try {
      let nextCompanyId = companyId;
      let companyName = parsed.companyName || 'Voucher';
      if (companyId === NEW_COMPANY_VALUE) {
        const company = await createCompany({
          name: newCompanyName.trim(),
          color: newCompanyColor,
        });
        nextCompanyId = company.id;
        companyName = company.name;
      } else {
        const existing = companies?.find((company) => company.id === companyId);
        companyName = existing?.name ?? companyName;
      }

      const initial = parseIlsInput(initialInput) ?? balance;
      const voucher = await createVoucher({
        companyId: nextCompanyId,
        code: code.trim(),
        cvv: cvv.trim() || undefined,
        balance,
        initialBalance: initial,
        url: url.trim() || undefined,
        expiresAt: timestampFromDateInput(expiresInput),
        barcodeFormat,
        sourceUrl: url.trim() || undefined,
      });
      await createImportRecord({
        fingerprint: draft.fingerprint,
        parserId: draft.parserId,
      });
      onSaved(voucher, companyName);
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : 'Could not save this voucher.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="flex flex-col gap-4 pb-28" onSubmit={handleSubmit} noValidate>
      <Hero
        amount={heroAmount}
        companyName={parsed.companyName || draft.parserLabel}
        purchasedAt={parsed.purchasedAt}
        matched={draft.matched}
      />

      <ScrapePanel
        scrape={scrape}
        url={url}
        pluxeeUrl={pluxeeUrl}
        selectedCode={code}
        onSelectCode={setCode}
        onSkip={onSkipScrape}
        onLookup={() => onLookupCode(url.trim())}
      />

      {!draft.matched ? (
        <Banner tone="info" title="Couldn’t recognize this message">
          Fill in the details below. The shared text is kept so you can copy from it.
        </Banner>
      ) : null}

      {showManualCodeHelp ? (
        <Banner
          tone={scrape.kind === 'failed' ? 'danger' : 'info'}
          title={
            scrape.kind === 'failed'
              ? 'Couldn’t read the code'
              : 'Paste the voucher code'
          }
        >
          {scrape.kind === 'failed'
            ? scrape.message
            : 'Open the voucher page, copy the 20-digit code, and paste it here.'}
        </Banner>
      ) : null}

      {saveError ? (
        <Banner tone="danger" title="Save failed">
          {saveError}
        </Banner>
      ) : null}

      <Card>
        <div className="flex flex-col gap-4">
          <Input
            ref={codeRef}
            label="Code"
            value={code}
            inputMode={pluxeeUrl ? 'numeric' : 'text'}
            autoComplete="off"
            spellCheck={false}
            placeholder={pluxeeUrl ? '20-digit code' : 'Voucher code'}
            hint={
              pluxeeUrl
                ? 'The number printed on the Pluxee voucher page.'
                : undefined
            }
            error={errors.code}
            className="font-mono tracking-wide"
            onChange={(event) => setCode(event.target.value.replace(/\s+/g, ''))}
          />
          <Input
            label="CVV"
            value={cvv}
            inputMode="numeric"
            autoComplete="off"
            placeholder="Optional"
            onChange={(event) => setCvv(event.target.value)}
          />
        </div>
      </Card>

      <Card>
        <div className="flex flex-col gap-4">
          <CompanyPicker
            companies={companies}
            companyId={companyId}
            newName={newCompanyName}
            newColor={newCompanyColor}
            suggestedName={parsed.companyName}
            error={errors.company}
            onCompanyIdChange={setCompanyId}
            onNewNameChange={setNewCompanyName}
            onNewColorChange={setNewCompanyColor}
          />
          <Input
            label="Balance"
            value={balanceInput}
            inputMode="decimal"
            autoComplete="off"
            hint={balance === undefined ? undefined : formatIls(balance)}
            error={errors.balance}
            onChange={(event) => {
              const next = event.target.value;
              setBalanceInput(next);
              if (!initialTouched) {
                setInitialInput(next);
              }
            }}
            onBlur={() => {
              if (balance !== undefined) {
                setBalanceInput(balance.toFixed(2));
                if (!initialTouched) {
                  setInitialInput(balance.toFixed(2));
                }
              }
            }}
          />
          <Input
            label="Original amount"
            value={initialInput}
            inputMode="decimal"
            autoComplete="off"
            error={errors.initial}
            onChange={(event) => {
              setInitialTouched(true);
              setInitialInput(event.target.value);
            }}
            onBlur={() => {
              const initial = parseIlsInput(initialInput);
              if (initial !== undefined) {
                setInitialInput(initial.toFixed(2));
              }
            }}
          />
          <Input
            label="Voucher URL"
            type="url"
            value={url}
            autoComplete="off"
            inputMode="url"
            error={errors.url}
            onChange={(event) => setUrl(event.target.value)}
          />
          <Input
            label="Expires"
            type="date"
            value={expiresInput}
            onChange={(event) => setExpiresInput(event.target.value)}
          />
          <Select
            label="Barcode"
            value={barcodeFormat}
            options={BARCODE_OPTIONS}
            onChange={(value) => {
              if (isBarcodeFormat(value)) {
                setBarcodeFormat(value);
              }
            }}
          />
        </div>
      </Card>

      <details className="rounded-lg border border-line bg-surface shadow-[var(--shadow-sm)]">
        <summary className="min-h-11 cursor-pointer list-none px-4 py-3 text-sm font-medium text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent [&::-webkit-details-marker]:hidden">
          Shared message
        </summary>
        <pre
          dir="auto"
          lang="he"
          className="whitespace-pre-wrap break-words border-t border-line px-4 py-3 font-mono text-sm leading-relaxed text-ink"
        >
          {draft.text}
        </pre>
      </details>

      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-canvas/95 px-4 pt-3 backdrop-blur-md pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto w-full max-w-lg">
          <Button type="submit" fullWidth size="lg" loading={saving}>
            Save voucher
          </Button>
        </div>
      </div>
    </form>
  );
}

function Hero({
  amount,
  companyName,
  purchasedAt,
  matched,
}: {
  amount: string | null;
  companyName?: string;
  purchasedAt?: number;
  matched: boolean;
}) {
  return (
    <div className="px-1 pt-1">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">
        {matched ? 'Review import' : 'Manual import'}
      </p>
      <p className="mt-1 text-3xl font-semibold tracking-tight text-ink tabular-nums">
        {amount ?? 'New voucher'}
      </p>
      <p className="mt-1 text-sm text-muted">
        {[companyName, purchasedAt ? `Purchased ${formatPurchasedAt(purchasedAt)}` : null]
          .filter(Boolean)
          .join(' · ') || 'Confirm the details before saving.'}
      </p>
    </div>
  );
}

function ScrapePanel({
  scrape,
  url,
  pluxeeUrl,
  selectedCode,
  onSelectCode,
  onSkip,
  onLookup,
}: {
  scrape: ScrapeStatus;
  url: string;
  pluxeeUrl: boolean;
  selectedCode: string;
  onSelectCode: (code: string) => void;
  onSkip: () => void;
  onLookup: () => void;
}) {
  switch (scrape.kind) {
    case 'loading':
      return (
        <Card>
          <div className="flex items-start gap-3">
            <span
              className="mt-0.5 size-5 shrink-0 animate-spin rounded-full border-2 border-accent border-t-transparent motion-reduce:animate-none"
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink">Looking up the code</p>
              <p className="mt-1 text-sm text-muted">
                Reading the voucher page. You can paste the code yourself at any time.
              </p>
              <Button variant="ghost" className="mt-2 -ml-3" onClick={onSkip}>
                Enter code manually
              </Button>
            </div>
          </div>
        </Card>
      );
    case 'success':
      return (
        <Banner tone="success" title="Code found">
          We filled in the 20-digit code. Check it before saving.
        </Banner>
      );
    case 'choice':
      return (
        <Card>
          <p className="text-sm font-semibold text-ink">Several codes found</p>
          <p className="mt-1 text-sm text-muted">
            Choose the voucher code from the page. Tracking numbers are listed
            too when they look the same.
          </p>
          <ul className="mt-3 flex flex-col gap-2">
            {scrape.codes.map((candidate) => {
              const selected = selectedCode === candidate;
              return (
                <li key={candidate}>
                  <button
                    type="button"
                    className={cx(
                      'flex min-h-11 w-full items-center rounded-md border px-3 text-left font-mono text-sm tracking-wide',
                      'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
                      selected
                        ? 'border-accent bg-accent-soft text-ink'
                        : 'border-line bg-canvas text-ink hover:bg-surface-hover',
                    )}
                    onClick={() => onSelectCode(candidate)}
                  >
                    {candidate}
                  </button>
                </li>
              );
            })}
          </ul>
        </Card>
      );
    case 'failed':
    case 'skipped':
    case 'idle':
      if (!pluxeeUrl) {
        return null;
      }
      return (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="secondary" fullWidth onClick={() => openVoucherPage(url)}>
            Open voucher page
          </Button>
          <Button variant="secondary" fullWidth onClick={onLookup}>
            Look up code
          </Button>
        </div>
      );
    default:
      return assertNever(scrape);
  }
}
