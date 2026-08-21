import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import {
  COMPANY_COLOR_PRESETS,
  createCompany,
  type Company,
} from '../db';
import { assertNever } from '../lib/assertNever';
import { cx } from '../lib/cx';
import { Button, Card, EmptyState } from '../ui';
import { CompanyPicker, NEW_COMPANY_VALUE } from './CompanyPicker';
import { formatIls } from './formatIls';
import { selectedSmsRowCount, smsBodySnippet } from './smsImportClassify';
import type { SmsImportBadge } from './smsImportClassify';
import type { SmsImportRow } from './smsImportTypes';

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

function formatMessageDate(value: number): string {
  return new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function badgeLabel(badge: SmsImportBadge): string {
  switch (badge) {
    case 'ready':
      return 'Ready';
    case 'duplicate':
      return 'Duplicate';
    case 'needs_review':
      return 'Needs review';
    case 'no_voucher':
      return 'No voucher';
    default:
      return assertNever(badge);
  }
}

function badgeClass(badge: SmsImportBadge): string {
  switch (badge) {
    case 'ready':
      return 'bg-success-soft text-success';
    case 'duplicate':
      return 'bg-warning-soft text-warning';
    case 'needs_review':
      return 'bg-accent-soft text-ink';
    case 'no_voucher':
      return 'bg-canvas text-muted border border-line';
    default:
      return assertNever(badge);
  }
}

export interface SmsImportResultsProps {
  items: readonly SmsImportRow[];
  companies: readonly Company[] | undefined;
  suggestedCompany: string;
  /** Company already known to receive from this sender, if any. */
  senderCompanyId?: string;
  onToggle: (id: string) => void;
  onImport: (companyId: string) => Promise<void>;
}

export function SmsImportResults({
  items,
  companies,
  suggestedCompany,
  senderCompanyId,
  onToggle,
  onImport,
}: SmsImportResultsProps) {
  const matchedCompany = findCompanyByName(companies, suggestedCompany);
  const [companyId, setCompanyId] = useState(
    () => senderCompanyId ?? matchedCompany?.id ?? NEW_COMPANY_VALUE,
  );
  const [newCompanyName, setNewCompanyName] = useState(suggestedCompany);
  const [newCompanyColor, setNewCompanyColor] = useState<string>(
    COMPANY_COLOR_PRESETS[0],
  );
  const [companyError, setCompanyError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const matchedOnce = useRef(Boolean(senderCompanyId ?? matchedCompany));
  const selectedCount = selectedSmsRowCount(items);

  useEffect(() => {
    if (matchedOnce.current || !companies) {
      return;
    }
    const match =
      companies.find((company) => company.id === senderCompanyId) ??
      findCompanyByName(companies, suggestedCompany);
    if (match) {
      matchedOnce.current = true;
      setCompanyId(match.id);
    }
  }, [companies, senderCompanyId, suggestedCompany]);

  const readyCount = useMemo(
    () => items.filter((item) => item.badge === 'ready').length,
    [items],
  );

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (selectedCount === 0) {
      return;
    }
    if (companyId === NEW_COMPANY_VALUE && !newCompanyName.trim()) {
      setCompanyError('Enter a company name.');
      return;
    }
    if (companyId !== NEW_COMPANY_VALUE && !companyId) {
      setCompanyError('Choose a company.');
      return;
    }
    setCompanyError(undefined);
    setSaving(true);
    try {
      let nextCompanyId = companyId;
      if (companyId === NEW_COMPANY_VALUE) {
        const company = await createCompany({
          name: newCompanyName.trim(),
          color: newCompanyColor,
        });
        nextCompanyId = company.id;
      }
      await onImport(nextCompanyId);
    } finally {
      setSaving(false);
    }
  }

  if (items.length === 0) {
    return (
      <EmptyState
        title="No messages found"
        description="Nothing from that sender since the date you picked. Check the number or name, or try an earlier date."
      />
    );
  }

  return (
    <form className="flex flex-col gap-4 pb-28" onSubmit={handleSubmit}>
      <div className="px-1 pt-1">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">
          Review import
        </p>
        <p className="mt-1 text-sm text-muted">
          {readyCount} look like coupons
          {selectedCount !== readyCount ? ` · ${selectedCount} selected` : ''}.
          Choose a company for the whole batch.
        </p>
      </div>

      <Card>
        <CompanyPicker
          companies={companies}
          companyId={companyId}
          newName={newCompanyName}
          newColor={newCompanyColor}
          suggestedName={suggestedCompany}
          error={companyError}
          onCompanyIdChange={setCompanyId}
          onNewNameChange={setNewCompanyName}
          onNewColorChange={setNewCompanyColor}
        />
      </Card>

      <ul className="flex flex-col gap-3">
        {items.map((item) => (
          <SmsImportRowCard
            key={item.id}
            item={item}
            onToggle={() => onToggle(item.id)}
          />
        ))}
      </ul>

      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-canvas/95 px-4 pt-3 backdrop-blur-md pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto w-full max-w-lg">
          <Button
            type="submit"
            fullWidth
            size="lg"
            loading={saving}
            disabled={selectedCount === 0}
          >
            {selectedCount === 0
              ? 'Select coupons to import'
              : `Import ${selectedCount} coupon${selectedCount === 1 ? '' : 's'}`}
          </Button>
        </div>
      </div>
    </form>
  );
}

function SmsImportRowCard({
  item,
  onToggle,
}: {
  item: SmsImportRow;
  onToggle: () => void;
}) {
  const amount =
    item.parsed.balance === undefined ? null : formatIls(item.parsed.balance);

  return (
    <Card as="li" padding="none">
      <label
        className={cx(
          'flex cursor-pointer gap-3 px-4 py-3',
          item.disabled && 'cursor-not-allowed opacity-70',
        )}
      >
        <input
          type="checkbox"
          className="mt-1 size-5 shrink-0 rounded border-line accent-accent"
          checked={item.selected}
          disabled={item.disabled}
          onChange={onToggle}
          aria-label={`Select message from ${formatMessageDate(item.date)}`}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-base font-semibold tabular-nums text-ink">
              {amount ?? 'No amount'}
            </p>
            <span
              className={cx(
                'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                badgeClass(item.badge),
              )}
            >
              {badgeLabel(item.badge)}
            </span>
          </div>
          <p className="mt-0.5 text-sm text-muted">
            Received {formatMessageDate(item.date)}
          </p>
          <p
            dir="auto"
            lang="he"
            className="mt-2 text-sm leading-relaxed text-ink"
          >
            {smsBodySnippet(item.body)}
          </p>
        </div>
      </label>
    </Card>
  );
}
