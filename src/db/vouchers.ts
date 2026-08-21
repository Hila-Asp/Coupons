import { db } from './database';
import { EntityNotFoundError } from './errors';
import {
  isUsedVoucher,
  type BarcodeFormat,
  type Voucher,
  type VoucherStatus,
} from './schema';

export interface VoucherInput {
  companyId: string;
  code: string;
  cvv?: string;
  balance: number;
  initialBalance: number;
  url?: string;
  expiresAt?: number;
  receivedAt?: number;
  barcodeFormat: BarcodeFormat;
  barcodeImage?: Blob;
  status?: VoucherStatus;
  sourceUrl?: string;
  lastNotifiedAt?: number;
}

export type VoucherPatch = {
  companyId?: string;
  code?: string;
  cvv?: string | null;
  balance?: number;
  initialBalance?: number;
  url?: string | null;
  expiresAt?: number | null;
  receivedAt?: number | null;
  barcodeFormat?: BarcodeFormat;
  barcodeImage?: Blob | null;
  status?: VoucherStatus;
  sourceUrl?: string | null;
  lastNotifiedAt?: number | null;
};

function clearableString(value: string | null): string | undefined {
  return optionalTrim(value ?? undefined);
}

export function applyVoucherPatch(
  existing: Voucher,
  patch: VoucherPatch,
  now = Date.now(),
): Voucher {
  return {
    ...existing,
    companyId: patch.companyId ?? existing.companyId,
    code: patch.code === undefined ? existing.code : requireCode(patch.code),
    cvv:
      patch.cvv === undefined ? existing.cvv : clearableString(patch.cvv),
    balance:
      patch.balance === undefined
        ? existing.balance
        : requireAmount(patch.balance, 'balance'),
    initialBalance:
      patch.initialBalance === undefined
        ? existing.initialBalance
        : requireAmount(patch.initialBalance, 'initialBalance'),
    url:
      patch.url === undefined ? existing.url : clearableString(patch.url),
    expiresAt:
      patch.expiresAt === undefined
        ? existing.expiresAt
        : (patch.expiresAt ?? undefined),
    receivedAt:
      patch.receivedAt === undefined
        ? existing.receivedAt
        : (patch.receivedAt ?? undefined),
    barcodeFormat: patch.barcodeFormat ?? existing.barcodeFormat,
    barcodeImage:
      patch.barcodeImage === undefined
        ? existing.barcodeImage
        : (patch.barcodeImage ?? undefined),
    status: patch.status ?? existing.status,
    sourceUrl:
      patch.sourceUrl === undefined
        ? existing.sourceUrl
        : clearableString(patch.sourceUrl),
    lastNotifiedAt:
      patch.lastNotifiedAt === undefined
        ? existing.lastNotifiedAt
        : (patch.lastNotifiedAt ?? undefined),
    updatedAt: now,
  };
}

function requireCode(code: string): string {
  const trimmed = code.trim();
  if (!trimmed) {
    throw new Error('Voucher code is required');
  }
  return trimmed;
}

function requireAmount(value: number, field: string): number {
  if (!Number.isFinite(value)) {
    throw new Error(`${field} must be a finite number`);
  }
  return value;
}

function optionalTrim(value: string | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

export async function listVouchers(): Promise<Voucher[]> {
  return db.vouchers.orderBy('createdAt').reverse().toArray();
}

export async function listVouchersByCompany(
  companyId: string,
): Promise<Voucher[]> {
  const vouchers = await db.vouchers
    .where('companyId')
    .equals(companyId)
    .sortBy('createdAt');
  return vouchers.reverse();
}

export async function getVoucher(id: string): Promise<Voucher | undefined> {
  return db.vouchers.get(id);
}

export async function getVoucherBySourceUrl(
  sourceUrl: string,
): Promise<Voucher | undefined> {
  return db.vouchers.where('sourceUrl').equals(sourceUrl).first();
}

export async function createVoucher(input: VoucherInput): Promise<Voucher> {
  const now = Date.now();
  const voucher: Voucher = {
    id: crypto.randomUUID(),
    companyId: input.companyId,
    code: requireCode(input.code),
    cvv: optionalTrim(input.cvv),
    balance: requireAmount(input.balance, 'balance'),
    initialBalance: requireAmount(input.initialBalance, 'initialBalance'),
    url: optionalTrim(input.url),
    expiresAt: input.expiresAt,
    receivedAt: input.receivedAt,
    barcodeFormat: input.barcodeFormat,
    barcodeImage: input.barcodeImage,
    status: input.status ?? 'active',
    sourceUrl: optionalTrim(input.sourceUrl),
    lastNotifiedAt: input.lastNotifiedAt,
    createdAt: now,
    updatedAt: now,
  };
  await db.vouchers.add(voucher);
  return voucher;
}

export async function updateVoucher(
  id: string,
  patch: VoucherPatch,
): Promise<Voucher> {
  const existing = await db.vouchers.get(id);
  if (!existing) {
    throw new EntityNotFoundError('Voucher', id);
  }

  const next = applyVoucherPatch(existing, patch);
  await db.vouchers.put(next);
  return next;
}

export async function deleteVoucher(id: string): Promise<void> {
  const existing = await db.vouchers.get(id);
  if (!existing) {
    throw new EntityNotFoundError('Voucher', id);
  }
  await db.vouchers.delete(id);
}

/** Clears out spent vouchers in one folder. Returns how many were removed. */
export async function deleteUsedVouchersByCompany(
  companyId: string,
): Promise<number> {
  return db.transaction('rw', db.vouchers, async () => {
    const vouchers = await db.vouchers
      .where('companyId')
      .equals(companyId)
      .toArray();
    const ids = vouchers.filter(isUsedVoucher).map((voucher) => voucher.id);
    await db.vouchers.bulkDelete(ids);
    return ids.length;
  });
}

export async function markVoucherUsed(id: string): Promise<Voucher> {
  return updateVoucher(id, { status: 'used', balance: 0 });
}
