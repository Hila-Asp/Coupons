import { describe, expect, it } from 'vitest';
import { isUsedVoucher, type Voucher } from './schema';
import { applyVoucherPatch } from './vouchers';

const sample: Voucher = {
  id: 'v1',
  companyId: 'c1',
  code: '12345678901234567890',
  cvv: '123',
  balance: 50,
  initialBalance: 50,
  url: 'https://example.com',
  expiresAt: 1_775_606_399_999,
  receivedAt: 1_755_000_000_000,
  barcodeFormat: 'code128',
  status: 'active',
  createdAt: 1,
  updatedAt: 1,
};

describe('applyVoucherPatch', () => {
  it('leaves omitted fields unchanged', () => {
    const next = applyVoucherPatch(sample, { balance: 20 }, 99);
    expect(next.expiresAt).toBe(sample.expiresAt);
    expect(next.cvv).toBe('123');
    expect(next.url).toBe('https://example.com');
    expect(next.balance).toBe(20);
    expect(next.updatedAt).toBe(99);
  });

  it('clears expiresAt when the patch sends null', () => {
    const next = applyVoucherPatch(sample, { expiresAt: null }, 99);
    expect(next.expiresAt).toBeUndefined();
    expect(next.code).toBe(sample.code);
  });

  it('clears optional strings when the patch sends null', () => {
    const next = applyVoucherPatch(sample, { cvv: null, url: null }, 99);
    expect(next.cvv).toBeUndefined();
    expect(next.url).toBeUndefined();
  });

  it('keeps, replaces, and clears receivedAt', () => {
    expect(applyVoucherPatch(sample, { balance: 20 }, 99).receivedAt).toBe(
      sample.receivedAt,
    );
    expect(applyVoucherPatch(sample, { receivedAt: 5 }, 99).receivedAt).toBe(5);
    expect(
      applyVoucherPatch(sample, { receivedAt: null }, 99).receivedAt,
    ).toBeUndefined();
  });
});

describe('isUsedVoucher', () => {
  it('treats a used status or an empty balance as used', () => {
    expect(isUsedVoucher(sample)).toBe(false);
    expect(isUsedVoucher({ ...sample, status: 'used' })).toBe(true);
    expect(isUsedVoucher({ ...sample, balance: 0 })).toBe(true);
    expect(isUsedVoucher({ ...sample, balance: -1 })).toBe(true);
  });
});
