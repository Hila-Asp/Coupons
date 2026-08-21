import { isPluxeeVoucherUrl } from './pluxee';

export type SmsImportBadge =
  | 'ready'
  | 'duplicate'
  | 'needs_review'
  | 'no_voucher';

export interface SmsImportClassification {
  badge: SmsImportBadge;
  selected: boolean;
  disabled: boolean;
}

const VOUCHER_SIGNAL =
  /שובר|סכום|pluxee|voucher|coupon|buyme|cibus/i;

export function hasVoucherSignal(
  body: string,
  parsed: { balance?: number; url?: string; code?: string },
): boolean {
  if (parsed.balance !== undefined || parsed.code?.trim() || parsed.url?.trim()) {
    return true;
  }
  return VOUCHER_SIGNAL.test(body);
}

export function classifySmsImportRow(input: {
  matched: boolean;
  alreadyImported: boolean;
  body: string;
  parsed: { balance?: number; url?: string; code?: string };
}): SmsImportClassification {
  if (input.alreadyImported) {
    return { badge: 'duplicate', selected: false, disabled: true };
  }

  const pluxeeUrl = Boolean(
    input.parsed.url && isPluxeeVoucherUrl(input.parsed.url),
  );
  if (input.matched || pluxeeUrl) {
    return { badge: 'ready', selected: true, disabled: false };
  }

  if (hasVoucherSignal(input.body, input.parsed)) {
    return { badge: 'needs_review', selected: false, disabled: false };
  }

  return { badge: 'no_voucher', selected: false, disabled: false };
}

export function toggleSmsRowSelection<
  T extends { id: string; selected: boolean; disabled: boolean },
>(items: readonly T[], id: string): T[] {
  return items.map((item) => {
    if (item.id !== id || item.disabled) {
      return item;
    }
    return { ...item, selected: !item.selected };
  });
}

export function selectedSmsRowCount(
  items: readonly { selected: boolean }[],
): number {
  return items.filter((item) => item.selected).length;
}

export function smsBodySnippet(body: string, max = 120): string {
  const compact = body.replace(/\s+/g, ' ').trim();
  if (compact.length <= max) {
    return compact;
  }
  return `${compact.slice(0, max - 1)}…`;
}

export function defaultCompanyNameFromRows(
  items: readonly { badge: SmsImportBadge; parsed: { companyName: string } }[],
): string {
  const ready = items.find(
    (item) => item.badge === 'ready' && item.parsed.companyName.trim(),
  );
  if (ready) {
    return ready.parsed.companyName.trim();
  }
  const any = items.find((item) => item.parsed.companyName.trim());
  return any?.parsed.companyName.trim() || 'Shufersal';
}
