import type { Voucher } from '../db';
import { assertNever } from './assertNever';

export type VoucherSortField = 'date' | 'amount';
export type SortDirection = 'asc' | 'desc';

export interface VoucherSort {
  field: VoucherSortField;
  direction: SortDirection;
}

export const DEFAULT_VOUCHER_SORT: VoucherSort = {
  field: 'date',
  direction: 'desc',
};

export const VOUCHER_SORT_STORAGE_KEY = 'voucher-manager-voucher-sort';

function isSortField(value: unknown): value is VoucherSortField {
  return value === 'date' || value === 'amount';
}

function isSortDirection(value: unknown): value is SortDirection {
  return value === 'asc' || value === 'desc';
}

export function parseVoucherSort(value: unknown): VoucherSort {
  if (typeof value !== 'object' || value === null) {
    return { ...DEFAULT_VOUCHER_SORT };
  }

  const record = value as { field?: unknown; direction?: unknown };
  if (!isSortField(record.field) || !isSortDirection(record.direction)) {
    return { ...DEFAULT_VOUCHER_SORT };
  }

  return { field: record.field, direction: record.direction };
}

function sortKey(voucher: Voucher, field: VoucherSortField): number {
  switch (field) {
    case 'date':
      return voucher.createdAt;
    case 'amount':
      return voucher.balance;
    default:
      return assertNever(field);
  }
}

function directionSign(direction: SortDirection): number {
  switch (direction) {
    case 'asc':
      return 1;
    case 'desc':
      return -1;
    default:
      return assertNever(direction);
  }
}

export function sortVouchers(
  vouchers: readonly Voucher[],
  field: VoucherSortField,
  direction: SortDirection,
): Voucher[] {
  const sign = directionSign(direction);
  return vouchers.slice().sort((left, right) => {
    return (sortKey(left, field) - sortKey(right, field)) * sign;
  });
}
