import type { Voucher } from '../db';

export interface RemainingStats {
  count: number;
  total: number;
}

export function remainingStats(
  vouchers: readonly Voucher[],
): RemainingStats {
  let count = 0;
  let total = 0;
  for (const voucher of vouchers) {
    if (voucher.balance > 0) {
      count += 1;
      total += voucher.balance;
    }
  }
  return { count, total };
}
