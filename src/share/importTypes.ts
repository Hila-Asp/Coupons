import type { Voucher } from '../db';
import type { ParsedVoucher } from '../parsers';

export type ScrapeStatus =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'success'; code: string }
  | { kind: 'choice'; codes: string[] }
  | { kind: 'failed'; message: string }
  | { kind: 'skipped' };

export interface ImportDraft {
  text: string;
  fingerprint: string;
  parserId: string;
  parserLabel?: string;
  parsed: ParsedVoucher;
  matched: boolean;
}

export type ImportPhase =
  | { kind: 'empty' }
  | { kind: 'preparing' }
  | { kind: 'duplicate'; fingerprint: string; voucher?: Voucher }
  | { kind: 'review'; draft: ImportDraft; scrape: ScrapeStatus }
  | { kind: 'saved'; voucher: Voucher; companyName: string };
