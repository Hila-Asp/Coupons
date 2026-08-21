import type { ParsedVoucher } from '../parsers';
import type { SmsImportBadge } from './smsImportClassify';

export interface SmsImportRow {
  id: string;
  address: string;
  date: number;
  body: string;
  fingerprint: string;
  parserId: string;
  parserLabel?: string;
  parsed: ParsedVoucher;
  matched: boolean;
  badge: SmsImportBadge;
  selected: boolean;
  disabled: boolean;
}

export type SmsImportPhase =
  | { kind: 'unavailable' }
  | { kind: 'form' }
  | { kind: 'permission' }
  | { kind: 'loading' }
  | { kind: 'review'; items: SmsImportRow[]; sender: string; sinceMs: number }
  | { kind: 'saving'; current: number; total: number }
  | { kind: 'done'; imported: number; skipped?: number }
  | { kind: 'denied' }
  | { kind: 'error'; message: string };
