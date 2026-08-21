export const BARCODE_FORMATS = [
  'code128',
  'itf',
  'ean13',
  'qr',
  'image',
  'none',
] as const;

export type BarcodeFormat = (typeof BARCODE_FORMATS)[number];

export const VOUCHER_STATUSES = ['active', 'used'] as const;

export type VoucherStatus = (typeof VOUCHER_STATUSES)[number];

export interface Company {
  id: string;
  name: string;
  color: string;
  /** Sender remembered from the last SMS inbox import for this company. */
  smsSender?: string;
  createdAt: number;
}

export interface Voucher {
  id: string;
  companyId: string;
  code: string;
  cvv?: string;
  balance: number;
  initialBalance: number;
  url?: string;
  expiresAt?: number;
  /** When the voucher SMS arrived, so cards can be traced back to a message. */
  receivedAt?: number;
  barcodeFormat: BarcodeFormat;
  barcodeImage?: Blob;
  status: VoucherStatus;
  sourceUrl?: string;
  lastNotifiedAt?: number;
  createdAt: number;
  updatedAt: number;
}

/** A voucher counts as used once it is marked used or its balance runs out. */
export function isUsedVoucher(voucher: Voucher): boolean {
  return voucher.status === 'used' || voucher.balance <= 0;
}

export interface ImportRecord {
  fingerprint: string;
  parserId: string;
  importedAt: number;
}

export const COMPANY_COLOR_PRESETS = [
  '#0f6e56',
  '#1d4e89',
  '#9a3412',
  '#6b21a8',
  '#9f1239',
  '#854d0e',
] as const;

export const BACKUP_VERSION = 1 as const;
