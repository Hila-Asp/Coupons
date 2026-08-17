import type { Company, Voucher } from '../db';
import { formatExpiryLabel } from '../lib/dates';
import { Banner } from '../ui';
import { useNotificationPermission } from '../notifications';

export interface ExpiryBannerProps {
  vouchers: readonly Voucher[];
  companies: readonly Company[];
  onDismiss: () => void;
  onOpenSoonest?: (voucherId: string) => void;
}

export function ExpiryBanner({
  vouchers,
  companies,
  onDismiss,
  onOpenSoonest,
}: ExpiryBannerProps) {
  const { permission, request } = useNotificationPermission();
  const soonest = vouchers[0];
  if (!soonest || soonest.expiresAt === undefined) {
    return null;
  }

  const now = Date.now();
  const expiredCount = vouchers.filter(
    (voucher) => voucher.expiresAt !== undefined && voucher.expiresAt < now,
  ).length;
  const companyName =
    companies.find((company) => company.id === soonest.companyId)?.name ??
    'A voucher';

  const title =
    expiredCount > 0
      ? expiredCount === 1
        ? '1 voucher has expired'
        : `${expiredCount} vouchers have expired`
      : vouchers.length === 1
        ? '1 voucher expires soon'
        : `${vouchers.length} vouchers expire within 60 days`;

  const showEnable = permission === 'default';

  return (
    <Banner
      tone={expiredCount > 0 ? 'danger' : 'warning'}
      title={title}
      onDismiss={onDismiss}
      action={
        showEnable
          ? { label: 'Enable alerts', onClick: () => void request() }
          : onOpenSoonest
            ? {
                label: 'View soonest',
                onClick: () => onOpenSoonest(soonest.id),
              }
            : undefined
      }
    >
      {companyName} · {formatExpiryLabel(soonest.expiresAt, now)}
    </Banner>
  );
}
