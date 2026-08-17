import { useLiveQuery } from 'dexie-react-hooks';
import { listCompanies, getCompany } from './companies';
import { getImportRecord, listImportRecords } from './importRecords';
import {
  getVoucher,
  listVouchers,
  listVouchersByCompany,
} from './vouchers';
import type { Company, ImportRecord, Voucher } from './schema';

export function useCompanies(): Company[] | undefined {
  return useLiveQuery(() => listCompanies(), []);
}

export function useCompany(id: string | undefined): Company | undefined {
  return useLiveQuery(() => (id ? getCompany(id) : undefined), [id]);
}

export function useVouchers(): Voucher[] | undefined {
  return useLiveQuery(() => listVouchers(), []);
}

export function useVouchersByCompany(
  companyId: string | undefined,
): Voucher[] | undefined {
  return useLiveQuery(
    () => (companyId ? listVouchersByCompany(companyId) : []),
    [companyId],
  );
}

export function useVoucher(id: string | undefined): Voucher | undefined {
  return useLiveQuery(() => (id ? getVoucher(id) : undefined), [id]);
}

export function useImportRecords(): ImportRecord[] | undefined {
  return useLiveQuery(() => listImportRecords(), []);
}

export function useImportRecord(
  fingerprint: string | undefined,
): ImportRecord | undefined {
  return useLiveQuery(
    () => (fingerprint ? getImportRecord(fingerprint) : undefined),
    [fingerprint],
  );
}
