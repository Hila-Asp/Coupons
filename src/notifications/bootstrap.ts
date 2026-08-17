import { listCompanies, listVouchers } from '../db';
import { listRelevantExpiries } from '../lib/expiry';
import { setAppBadge } from './badge';
import { notifyExpiringVouchers } from './notify';
import { registerPeriodicSync } from './periodicsync';

export async function bootstrapNotifications(): Promise<void> {
  try {
    const [vouchers, companies] = await Promise.all([
      listVouchers(),
      listCompanies(),
    ]);
    const expiring = listRelevantExpiries(vouchers);
    await setAppBadge(expiring.length);
    await notifyExpiringVouchers(expiring, companies);
    await registerPeriodicSync();
  } catch {
    return;
  }
}
