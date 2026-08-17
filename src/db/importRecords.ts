import { db } from './database';
import type { ImportRecord } from './schema';

export interface ImportRecordInput {
  fingerprint: string;
  parserId: string;
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
    importedAt: Date.now(),
  };
  await db.importRecords.add(record);
  return record;
}
