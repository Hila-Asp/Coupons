import { describe, expect, it } from 'vitest';
import type { Voucher } from '../db';
import {
  parseVoucherSort,
  sortVouchers,
  type VoucherSort,
} from './sortVouchers';

function voucher(partial: Pick<Voucher, 'id' | 'createdAt' | 'balance'>): Voucher {
  return {
    companyId: 'c1',
    code: '12345678901234567890',
    initialBalance: partial.balance,
    barcodeFormat: 'code128',
    status: 'active',
    updatedAt: partial.createdAt,
    ...partial,
  };
}

const olderLow = voucher({ id: 'older-low', createdAt: 100, balance: 20 });
const newerHigh = voucher({ id: 'newer-high', createdAt: 300, balance: 80 });
const midMid = voucher({ id: 'mid-mid', createdAt: 200, balance: 50 });

describe('sortVouchers', () => {
  it('sorts by createdAt descending without mutating the input', () => {
    const input = [olderLow, newerHigh, midMid];
    const sorted = sortVouchers(input, 'date', 'desc');

    expect(sorted.map((item) => item.id)).toEqual([
      'newer-high',
      'mid-mid',
      'older-low',
    ]);
    expect(input.map((item) => item.id)).toEqual([
      'older-low',
      'newer-high',
      'mid-mid',
    ]);
  });

  it('sorts by createdAt ascending', () => {
    expect(
      sortVouchers([newerHigh, olderLow, midMid], 'date', 'asc').map(
        (item) => item.id,
      ),
    ).toEqual(['older-low', 'mid-mid', 'newer-high']);
  });

  it('sorts by balance and ignores expiresAt and initialBalance', () => {
    const highInitial = voucher({
      id: 'high-initial',
      createdAt: 50,
      balance: 10,
    });
    highInitial.initialBalance = 999;
    highInitial.expiresAt = 9_999_999;

    const list = [highInitial, newerHigh, olderLow];
    expect(sortVouchers(list, 'amount', 'desc').map((item) => item.id)).toEqual([
      'newer-high',
      'older-low',
      'high-initial',
    ]);
    expect(sortVouchers(list, 'amount', 'asc').map((item) => item.id)).toEqual([
      'high-initial',
      'older-low',
      'newer-high',
    ]);
  });

  it('keeps equal keys in their original order', () => {
    const first = voucher({ id: 'first', createdAt: 100, balance: 40 });
    const second = voucher({ id: 'second', createdAt: 100, balance: 40 });
    expect(sortVouchers([first, second], 'date', 'desc').map((item) => item.id)).toEqual([
      'first',
      'second',
    ]);
  });
});

describe('parseVoucherSort', () => {
  it('returns newest-first date sort for missing or invalid values', () => {
    const fallback: VoucherSort = { field: 'date', direction: 'desc' };
    expect(parseVoucherSort(null)).toEqual(fallback);
    expect(parseVoucherSort(undefined)).toEqual(fallback);
    expect(parseVoucherSort('date')).toEqual(fallback);
    expect(parseVoucherSort({ field: 'expiresAt', direction: 'desc' })).toEqual(
      fallback,
    );
    expect(parseVoucherSort({ field: 'date', direction: 'up' })).toEqual(fallback);
  });

  it('accepts a valid stored pair', () => {
    expect(parseVoucherSort({ field: 'amount', direction: 'asc' })).toEqual({
      field: 'amount',
      direction: 'asc',
    });
  });
});
