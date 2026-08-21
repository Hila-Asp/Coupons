import { db } from './database';
import type { ImportRecord } from './schema';

export interface ImportRecordInput {
  fingerprint: string;
  parserId: string;
  voucherId?: string;
}

/**
 * URL fingerprints are the source URL verbatim, so a record can be traced back
 * to its voucher even without a `voucherId`. Text fingerprints are SHA-256
 * hashes of a message body we do not keep, so they cannot be traced.
 */
export function isTraceableFingerprint(fingerprint: string): boolean {
  return /^https?:\/\//i.test(fingerprint.trim());
}

export async function listImportRecords(): Promise<ImportRecord[]> {
  return db.importRecords.orderBy('importedAt').reverse().toArray();
}

export async function getImportRecord(
  fingerprint: string,
): Promise<ImportRecord | undefined> {
  return db.importRecords.get(fingerprint);
}

export async function hasImportRecord(fingerprint: string): Promise<boolean> {
  const record = await db.importRecords.get(fingerprint);
  return record !== undefined;
}

export async function createImportRecord(
  input: ImportRecordInput,
): Promise<ImportRecord> {
  const fingerprint = input.fingerprint.trim();
  if (!fingerprint) {
    throw new Error('Import fingerprint is required');
  }
  const parserId = input.parserId.trim();
  if (!parserId) {
    throw new Error('Parser id is required');
  }

  const existing = await db.importRecords.get(fingerprint);
  if (existing) {
    return existing;
  }

  const record: ImportRecord = {
    fingerprint,
    parserId,
    voucherId: input.voucherId,
    importedAt: Date.now(),
  };
  await db.importRecords.add(record);
  return record;
}

export interface VoucherIdentity {
  id: string;
  sourceUrl?: string;
}

function sourceUrlSet(vouchers: readonly VoucherIdentity[]): Set<string> {
  return new Set(
    vouchers
      .map((voucher) => voucher.sourceUrl?.trim())
      .filter((url): url is string => Boolean(url)),
  );
}

/**
 * Picks the records belonging to vouchers that are being deleted. Records
 * written before `voucherId` existed are matched by source URL instead.
 */
export function selectRecordsForVouchers(
  records: readonly ImportRecord[],
  deleted: readonly VoucherIdentity[],
): ImportRecord[] {
  const ids = new Set(deleted.map((voucher) => voucher.id));
  const sourceUrls = sourceUrlSet(deleted);
  return records.filter((record) =>
    record.voucherId === undefined
      ? sourceUrls.has(record.fingerprint.trim())
      : ids.has(record.voucherId),
  );
}

/**
 * Picks the records whose voucher is provably gone. An untraceable record with
 * no `voucherId` is left alone, since its message body is not stored and so it
 * cannot be told apart from a genuine duplicate.
 */
export function selectOrphanedRecords(
  records: readonly ImportRecord[],
  surviving: readonly VoucherIdentity[],
): ImportRecord[] {
  const ids = new Set(surviving.map((voucher) => voucher.id));
  const sourceUrls = sourceUrlSet(surviving);
  return records.filter((record) => {
    if (record.voucherId !== undefined) {
      return !ids.has(record.voucherId);
    }
    if (!isTraceableFingerprint(record.fingerprint)) {
      return false;
    }
    return !sourceUrls.has(record.fingerprint.trim());
  });
}

/**
 * Retires the fingerprints of deleted vouchers so their messages can be
 * imported again. Callers already hold a write transaction on both tables.
 */
export async function deleteImportRecordsForVouchers(
  vouchers: readonly VoucherIdentity[],
): Promise<number> {
  if (vouchers.length === 0) {
    return 0;
  }
  const records = await db.importRecords.toArray();
  const stale = selectRecordsForVouchers(records, vouchers);
  await db.importRecords.bulkDelete(stale.map((record) => record.fingerprint));
  return stale.length;
}

/**
 * Clears fingerprints left behind by deletions that happened before records
 * were linked to their voucher, so those messages can be imported again.
 */
export async function pruneOrphanedImportRecords(): Promise<number> {
  return db.transaction('rw', db.importRecords, db.vouchers, async () => {
    const records = await db.importRecords.toArray();
    if (records.length === 0) {
      return 0;
    }
    const orphaned = selectOrphanedRecords(records, await db.vouchers.toArray());
    await db.importRecords.bulkDelete(
      orphaned.map((record) => record.fingerprint),
    );
    return orphaned.length;
  });
}
