export { db, VoucherDatabase } from './database';
export {
  BACKUP_VERSION,
  BARCODE_FORMATS,
  COMPANY_COLOR_PRESETS,
  VOUCHER_STATUSES,
  isUsedVoucher,
} from './schema';
export type {
  BarcodeFormat,
  Company,
  ImportRecord,
  Voucher,
  VoucherStatus,
} from './schema';
export { EntityNotFoundError } from './errors';
export {
  companiesWithSmsSender,
  createCompany,
  deleteCompany,
  findCompanyBySmsSender,
  getCompany,
  listCompanies,
  rememberCompanySmsSender,
  updateCompany,
} from './companies';
export type { CompanyInput } from './companies';
export {
  createVoucher,
  deleteUsedVouchersByCompany,
  deleteVoucher,
  getVoucher,
  getVoucherBySourceUrl,
  listVouchers,
  listVouchersByCompany,
  markVoucherUsed,
  updateVoucher,
  applyVoucherPatch,
} from './vouchers';
export type { VoucherInput, VoucherPatch } from './vouchers';
export {
  createImportRecord,
  getImportRecord,
  hasImportRecord,
  listImportRecords,
} from './importRecords';
export type { ImportRecordInput } from './importRecords';
export {
  buildBackupPayload,
  exportBackup,
  importBackup,
} from './backup';
export type {
  BackupImportResult,
  BackupPayload,
  SerializedBarcodeImage,
  SerializedVoucher,
} from './backup';
export {
  computeTextFingerprint,
  fingerprintFromSourceUrl,
  normalizeImportText,
  resolveImportFingerprint,
} from './fingerprint';
export {
  useCompanies,
  useCompany,
  useImportRecord,
  useImportRecords,
  useVoucher,
  useVouchers,
  useVouchersByCompany,
} from './hooks';
