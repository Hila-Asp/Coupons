import type { Company, Voucher } from '../db';
import { updateVoucher } from '../db';
import { formatDate } from '../lib/dates';
import { formatShekel } from '../lib/money';
import { wasRecentlyNotified } from '../lib/expiry';
import { getNotificationPermission } from './permission';

function companyName(
  voucher: Voucher,
  companies: readonly Company[],
): string {
  return companies.find((company) => company.id === voucher.companyId)?.name ?? 'Voucher';
}

async function showNotification(title: string, body: string, tag: string): Promise<void> {
  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration?.showNotification) {
        await registration.showNotification(title, {
          body,
          tag,
          icon: '/icons/icon-192.png',
        });
        return;
      }
    }
    new Notification(title, { body, tag, icon: '/icons/icon-192.png' });
  } catch {
    return;
  }
}

export async function notifyExpiringVouchers(
  vouchers: readonly Voucher[],
  companies: readonly Company[],
  now = Date.now(),
): Promise<void> {
  if (getNotificationPermission() !== 'granted') {
    return;
  }

  for (const voucher of vouchers) {
    if (wasRecentlyNotified(voucher, now) || voucher.expiresAt === undefined) {
      continue;
    }

    const expired = voucher.expiresAt < now;
    const name = companyName(voucher, companies);
    const title = expired ? 'Voucher expired' : 'Voucher expiring soon';
    const body = `${name} · ${formatShekel(voucher.balance)} · ${formatDate(voucher.expiresAt)}`;

    await showNotification(title, body, `expiry-${voucher.id}`);

    try {
      await updateVoucher(voucher.id, { lastNotifiedAt: now });
    } catch {
      // Persistence failure must not block the remaining alerts.
    }
  }
}
