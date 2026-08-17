import { formatShekel } from '../lib/money';
import { cx } from '../lib/cx';

export interface BalanceMeterProps {
  balance: number;
  initialBalance: number;
  className?: string;
}

export function BalanceMeter({
  balance,
  initialBalance,
  className,
}: BalanceMeterProps) {
  const ceiling = Math.max(initialBalance, balance, 0);
  const ratio = ceiling === 0 ? 0 : Math.min(1, Math.max(0, balance / ceiling));
  const percent = Math.round(ratio * 100);

  return (
    <div className={cx('flex flex-col gap-2', className)}>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-2xl font-semibold tracking-tight text-ink">
          {formatShekel(balance)}
        </p>
        <p className="text-sm text-muted">of {formatShekel(initialBalance)}</p>
      </div>
      <div
        className="h-1.5 overflow-hidden rounded-full bg-line"
        role="meter"
        aria-label="Remaining balance"
        aria-valuemin={0}
        aria-valuemax={ceiling}
        aria-valuenow={balance}
      >
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-[var(--duration-base)] ease-[var(--ease-out)]"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
