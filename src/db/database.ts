import Dexie, { type Table } from 'dexie';
import type { Company, ImportRecord, Voucher } from './schema';

export class VoucherDatabase extends Dexie {
  companies!: Table<Company, string>;
  vouchers!: Table<Voucher, string>;
  importRecords!: Table<ImportRecord, string>;

  constructor() {
    super('voucher-manager');
    this.version(1).stores({
      companies: 'id, name, createdAt',
      vouchers:
        'id, companyId, status, expiresAt, sourceUrl, createdAt, updatedAt',
      importRecords: 'fingerprint, parserId, importedAt',
    });
    this.version(2).stores({
      companies: 'id, name, createdAt',
      vouchers:
        'id, companyId, status, expiresAt, receivedAt, sourceUrl, createdAt, updatedAt',
      importRecords: 'fingerprint, parserId, importedAt',
    });
    this.version(3).stores({
      companies: 'id, name, createdAt',
      vouchers:
        'id, companyId, status, expiresAt, receivedAt, sourceUrl, createdAt, updatedAt',
      importRecords: 'fingerprint, parserId, voucherId, importedAt',
    });
  }
}

export const db = new VoucherDatabase();
