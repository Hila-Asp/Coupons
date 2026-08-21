import { describe, expect, it } from 'vitest';
import {
  isTraceableFingerprint,
  selectOrphanedRecords,
  selectRecordsForVouchers,
  type VoucherIdentity,
} from './importRecords';
import type { ImportRecord } from './schema';

const url = 'https://pluxee.co.il/v/abc';
const textHash = 'a'.repeat(64);

function record(partial: Partial<ImportRecord>): ImportRecord {
  return {
    fingerprint: url,
    parserId: 'pluxee',
    importedAt: 1,
    ...partial,
  };
}

function voucher(partial: Partial<VoucherIdentity>): VoucherIdentity {
  return { id: 'v1', ...partial };
}

describe('isTraceableFingerprint', () => {
  it('recognises source URLs but not text hashes', () => {
    expect(isTraceableFingerprint(url)).toBe(true);
    expect(isTraceableFingerprint('  http://example.com  ')).toBe(true);
    expect(isTraceableFingerprint(textHash)).toBe(false);
    expect(isTraceableFingerprint('')).toBe(false);
  });
});

describe('selectRecordsForVouchers', () => {
  it('matches linked records by voucher id', () => {
    const mine = record({ fingerprint: textHash, voucherId: 'v1' });
    const other = record({ fingerprint: url, voucherId: 'v2' });
    expect(selectRecordsForVouchers([mine, other], [voucher({ id: 'v1' })])).toEqual([
      mine,
    ]);
  });

  it('matches legacy records by source URL', () => {
    const legacy = record({ fingerprint: url });
    const unrelated = record({ fingerprint: 'https://example.com/other' });
    expect(
      selectRecordsForVouchers([legacy, unrelated], [voucher({ sourceUrl: url })]),
    ).toEqual([legacy]);
  });

  it('ignores a legacy record when the deleted voucher has no source URL', () => {
    const legacy = record({ fingerprint: textHash });
    expect(selectRecordsForVouchers([legacy], [voucher({})])).toEqual([]);
  });
});

describe('selectOrphanedRecords', () => {
  it('drops a linked record whose voucher is gone', () => {
    const orphan = record({ fingerprint: textHash, voucherId: 'gone' });
    const live = record({ fingerprint: url, voucherId: 'v1' });
    expect(selectOrphanedRecords([orphan, live], [voucher({ id: 'v1' })])).toEqual([
      orphan,
    ]);
  });

  it('drops a legacy URL record with no surviving voucher', () => {
    const orphan = record({ fingerprint: url });
    expect(selectOrphanedRecords([orphan], [])).toEqual([orphan]);
    expect(
      selectOrphanedRecords([orphan], [voucher({ sourceUrl: url })]),
    ).toEqual([]);
  });

  it('keeps an untraceable legacy record so real duplicates stay blocked', () => {
    const unknown = record({ fingerprint: textHash });
    expect(selectOrphanedRecords([unknown], [])).toEqual([]);
  });
});
