import type { Voucher } from '../db';

export const EXPIRY_WARNING_DAYS = 60;
export const EXPIRY_WARNING_MS = EXPIRY_WARNING_DAYS * 24 * 60 * 60 * 1000;
export const NOTIFY_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export function isExpiringSoon(
  expiresAt: number,
  now = Date.now(),
): boolean {
  return expiresAt > now && expiresAt <= now + EXPIRY_WARNING_MS;
}

export function isExpiryRelevant(
  voucher: Voucher,
  now = Date.now(),
): boolean {
  if (voucher.status !== 'active' || voucher.balance <= 0) {
    return false;
  }
  if (voucher.expiresAt === undefined) {
    return false;
  }
  return voucher.expiresAt <= now + EXPIRY_WARNING_MS;
}

export function listRelevantExpiries(
  vouchers: readonly Voucher[],
  now = Date.now(),
): Voucher[] {
  return vouchers
    .filter((voucher) => isExpiryRelevant(voucher, now))
    .sort((a, b) => (a.expiresAt ?? 0) - (b.expiresAt ?? 0));
}

export function wasRecentlyNotified(
  voucher: Voucher,
  now = Date.now(),
): boolean {
  if (voucher.lastNotifiedAt === undefined) {
    return false;
  }
  return now - voucher.lastNotifiedAt < NOTIFY_COOLDOWN_MS;
}
