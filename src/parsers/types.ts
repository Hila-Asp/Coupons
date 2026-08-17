import type { BarcodeFormat } from '../db';

export interface ParsedVoucher {
  companyName: string;
  balance?: number;
  purchasedAt?: number;
  url?: string;
  code?: string;
  cvv?: string;
  expiresAt?: number;
  barcodeFormat: BarcodeFormat;
}

/** Add one file that implements this, then register it in `parsers`. */
export interface VoucherParser {
  id: string;
  label: string;
  companyName: string;
  test: (text: string) => boolean;
  parse: (text: string) => ParsedVoucher;
}
