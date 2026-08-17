import { findPluxeeVoucherUrl, stripInvisibleChars } from './text';
import type { ParsedVoucher, VoucherParser } from './types';

const HYPHEN = '[\u05BE\\-]';

const AMOUNT_RE = new RegExp(
  String.raw`סכום\s*:\s*₪?\s*([\d,]+(?:\.\d{1,2})?)\s*₪?`,
);

const PURCHASED_RE = new RegExp(
  String.raw`נרכש\s+ב${HYPHEN}?\s*(\d{4})${HYPHEN}(\d{2})${HYPHEN}(\d{2})`,
);

function parseAmount(raw: string): number | undefined {
  const normalized = raw.replace(/,/g, '');
  const value = Number(normalized);
  if (!Number.isFinite(value)) {
    return undefined;
  }
  return value;
}

function parsePurchasedAt(text: string): number | undefined {
  const match = text.match(PURCHASED_RE);
  if (!match) {
    return undefined;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!year || !month || !day) {
    return undefined;
  }
  return Date.UTC(year, month - 1, day);
}

export function testShufersalMessage(text: string): boolean {
  const cleaned = stripInvisibleChars(text);
  const hasRetailer = /שופרסל/u.test(cleaned);
  const hasVoucherSignal =
    /myconsumers\.pluxee\.co\.il/i.test(cleaned) || /סכום/u.test(cleaned);
  return hasRetailer && hasVoucherSignal;
}

export function parseShufersalMessage(text: string): ParsedVoucher {
  const cleaned = stripInvisibleChars(text);
  const amountMatch = cleaned.match(AMOUNT_RE);
  const balance = amountMatch ? parseAmount(amountMatch[1]) : undefined;

  return {
    companyName: 'Shufersal',
    balance,
    purchasedAt: parsePurchasedAt(cleaned),
    url: findPluxeeVoucherUrl(cleaned),
    barcodeFormat: 'code128',
  };
}

export const shufersalParser: VoucherParser = {
  id: 'shufersal-pluxee',
  label: 'Shufersal (Pluxee)',
  companyName: 'Shufersal',
  test: testShufersalMessage,
  parse: parseShufersalMessage,
};
