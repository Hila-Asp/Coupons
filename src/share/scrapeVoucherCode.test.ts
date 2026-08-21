import { describe, expect, it } from 'vitest';
import { resolveVoucherCodeApiUrl } from './scrapeVoucherCode';

describe('resolveVoucherCodeApiUrl', () => {
  it('uses VITE_API_BASE when set, with no trailing slash', () => {
    expect(
      resolveVoucherCodeApiUrl('https://vouchers.example.com/', false),
    ).toBe('https://vouchers.example.com/api/voucher-code');
  });

  it('keeps the relative API on web when the base is empty', () => {
    expect(resolveVoucherCodeApiUrl(undefined, false)).toBe('/api/voucher-code');
    expect(resolveVoucherCodeApiUrl('  ', false)).toBe('/api/voucher-code');
  });

  it('skips the relative API on native when the base is empty', () => {
    expect(resolveVoucherCodeApiUrl(undefined, true)).toBeNull();
    expect(resolveVoucherCodeApiUrl('', true)).toBeNull();
  });
});
