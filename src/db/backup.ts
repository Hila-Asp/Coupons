import { db } from './database';
import { BACKUP_VERSION, type Company, type ImportRecord, type Voucher } from './schema';

export interface SerializedBarcodeImage {
  type: string;
  base64: string;
}

export interface SerializedVoucher extends Omit<Voucher, 'barcodeImage'> {
  barcodeImage?: SerializedBarcodeImage;
}

export interface BackupPayload {
  version: typeof BACKUP_VERSION;
  exportedAt: number;
  companies: Company[];
  vouchers: SerializedVoucher[];
  importRecords: ImportRecord[];
}

export interface BackupImportResult {
  companiesAdded: number;
  companiesSkipped: number;
  vouchersAdded: number;
  vouchersSkipped: number;
  importRecordsAdded: number;
  importRecordsSkipped: number;
}

function blobToBase64(blob: Blob): Promise<SerializedBarcodeImage> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('Failed to encode barcode image'));
        return;
      }
      const comma = result.indexOf(',');
      resolve({
        type: blob.type || 'application/octet-stream',
        base64: comma === -1 ? result : result.slice(comma + 1),
      });
    };
    reader.onerror = () => {
      reject(reader.error ?? new Error('Failed to read barcode image'));
    };
    reader.readAsDataURL(blob);
  });
}

function base64ToBlob(image: SerializedBarcodeImage): Blob {
  const binary = atob(image.base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: image.type || 'application/octet-stream' });
}

async function serializeVoucher(voucher: Voucher): Promise<SerializedVoucher> {
  const { barcodeImage, ...rest } = voucher;
  if (!barcodeImage) {
    return rest;
  }
  return {
    ...rest,
    barcodeImage: await blobToBase64(barcodeImage),
  };
}

function deserializeVoucher(voucher: SerializedVoucher): Voucher {
  const { barcodeImage, ...rest } = voucher;
  if (!barcodeImage) {
    return rest;
  }
  return {
    ...rest,
    barcodeImage: base64ToBlob(barcodeImage),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseBackupPayload(value: unknown): BackupPayload {
  if (!isRecord(value)) {
    throw new Error('Backup file is not valid JSON');
  }
  if (value.version !== BACKUP_VERSION) {
    throw new Error(`Unsupported backup version: ${String(value.version)}`);
  }
  if (
    !Array.isArray(value.companies) ||
    !Array.isArray(value.vouchers) ||
    !Array.isArray(value.importRecords)
  ) {
    throw new Error('Backup file is missing required collections');
  }

  return {
    version: BACKUP_VERSION,
    exportedAt: typeof value.exportedAt === 'number' ? value.exportedAt : Date.now(),
    companies: value.companies as Company[],
    vouchers: value.vouchers as SerializedVoucher[],
    importRecords: value.importRecords as ImportRecord[],
  };
}

export async function buildBackupPayload(): Promise<BackupPayload> {
  const [companies, vouchers, importRecords] = await Promise.all([
    db.companies.toArray(),
    db.vouchers.toArray(),
    db.importRecords.toArray(),
  ]);

  return {
    version: BACKUP_VERSION,
    exportedAt: Date.now(),
    companies,
    vouchers: await Promise.all(vouchers.map(serializeVoucher)),
    importRecords,
  };
}

export async function exportBackup(): Promise<void> {
  const payload = await buildBackupPayload();
  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const href = URL.createObjectURL(blob);
  const stamp = new Date(payload.exportedAt).toISOString().slice(0, 10);
  const link = document.createElement('a');
  link.href = href;
  link.download = `vouchers-backup-${stamp}.json`;
  link.rel = 'noopener';
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(href);
}

export async function importBackup(
  source: File | string | BackupPayload,
): Promise<BackupImportResult> {
  let payload: BackupPayload;
  if (typeof source === 'string') {
    payload = parseBackupPayload(JSON.parse(source) as unknown);
  } else if (source instanceof File) {
    payload = parseBackupPayload(JSON.parse(await source.text()) as unknown);
  } else {
    payload = parseBackupPayload(source);
  }

  const result: BackupImportResult = {
    companiesAdded: 0,
    companiesSkipped: 0,
    vouchersAdded: 0,
    vouchersSkipped: 0,
    importRecordsAdded: 0,
    importRecordsSkipped: 0,
  };

  await db.transaction(
    'rw',
    db.companies,
    db.vouchers,
    db.importRecords,
    async () => {
      for (const company of payload.companies) {
        const existing = await db.companies.get(company.id);
        if (existing) {
          result.companiesSkipped += 1;
          continue;
        }
        await db.companies.add(company);
        result.companiesAdded += 1;
      }

      for (const serialized of payload.vouchers) {
        const existing = await db.vouchers.get(serialized.id);
        if (existing) {
          result.vouchersSkipped += 1;
          continue;
        }
        await db.vouchers.add(deserializeVoucher(serialized));
        result.vouchersAdded += 1;
      }

      for (const record of payload.importRecords) {
        const existing = await db.importRecords.get(record.fingerprint);
        if (existing) {
          result.importRecordsSkipped += 1;
          continue;
        }
        await db.importRecords.add(record);
        result.importRecordsAdded += 1;
      }
    },
  );

  return result;
}
