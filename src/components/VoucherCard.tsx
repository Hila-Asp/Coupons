import { type PointerEvent, useRef, useState } from 'react';
import { isUsedVoucher, type Company, type Voucher } from '../db';
import { cx } from '../lib/cx';
import { formatExpiryLabel, formatReceivedLabel, isExpired } from '../lib/dates';
import { isExpiringSoon } from '../lib/expiry';
import { formatShekel } from '../lib/money';
import { Card } from '../ui';

const ACTION_WIDTH = 168;
const AXIS_LOCK = 8;

export interface VoucherCardProps {
  voucher: Voucher;
  company?: Company;
  onOpen: () => void;
  onMarkUsed: () => void;
  onUpdateBalance: () => void;
  onDelete: () => void;
}

export function VoucherCard({
  voucher,
  company,
  onOpen,
  onMarkUsed,
  onUpdateBalance,
  onDelete,
}: VoucherCardProps) {
  const [offset, setOffset] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [dragging, setDragging] = useState(false);
  const offsetRef = useRef(0);
  const startX = useRef(0);
  const startY = useRef(0);
  const startOffset = useRef(0);
  const axis = useRef<'h' | 'v' | null>(null);
  const used = isUsedVoucher(voucher);

  const moveTo = (next: number) => {
    offsetRef.current = next;
    setOffset(next);
  };

  const snap = (next: boolean) => {
    setRevealed(next);
    moveTo(next ? -ACTION_WIDTH : 0);
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    startX.current = event.clientX;
    startY.current = event.clientY;
    startOffset.current = offsetRef.current;
    axis.current = null;
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const dx = event.clientX - startX.current;
    const dy = event.clientY - startY.current;

    if (axis.current === null) {
      if (Math.abs(dx) < AXIS_LOCK && Math.abs(dy) < AXIS_LOCK) {
        return;
      }
      axis.current = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v';
      if (axis.current === 'h') {
        setDragging(true);
        event.currentTarget.setPointerCapture(event.pointerId);
      }
    }

    if (axis.current !== 'h') {
      return;
    }

    event.preventDefault();
    const next = Math.min(0, Math.max(-ACTION_WIDTH, startOffset.current + dx));
    moveTo(next);
  };

  const onPointerUp = () => {
    if (axis.current === 'h') {
      snap(offsetRef.current < -ACTION_WIDTH / 2);
    }
    axis.current = null;
    setDragging(false);
  };

  return (
    <li className="relative overflow-hidden rounded-lg">
      <div
        className={cx(
          'absolute inset-y-0 right-0 flex',
          !revealed && !dragging && 'invisible',
        )}
        aria-hidden={!revealed}
      >
        <button
          type="button"
          className="flex w-[84px] flex-col items-center justify-center gap-1 bg-accent-soft text-sm font-medium text-ink"
          onClick={onUpdateBalance}
        >
          Balance
        </button>
        {used ? (
          <button
            type="button"
            className="flex w-[84px] flex-col items-center justify-center gap-1 bg-danger-soft text-sm font-medium text-danger"
            onClick={onDelete}
          >
            Delete
          </button>
        ) : (
          <button
            type="button"
            className="flex w-[84px] flex-col items-center justify-center gap-1 bg-warning-soft text-sm font-medium text-ink"
            onClick={onMarkUsed}
          >
            Used
          </button>
        )}
      </div>
      <div
        className="relative touch-pan-y"
        style={{
          transform: `translateX(${offset}px)`,
          transition: dragging
            ? 'none'
            : 'transform var(--duration-base) var(--ease-out)',
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <Card
          as="article"
          interactive
          className={cx(
            'flex min-w-0 items-center gap-3',
            used && 'text-muted',
            !used &&
              voucher.expiresAt !== undefined &&
              isExpired(voucher.expiresAt) &&
              'border-danger/40 bg-danger-soft/40',
          )}
        >
          <button
            type="button"
            className="min-w-0 flex-1 text-left"
            onClick={onOpen}
          >
            {company ? (
              <p className="mb-1 flex min-w-0 items-center gap-2 text-xs font-medium text-muted">
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: company.color }}
                  aria-hidden="true"
                />
                <span className="min-w-0 truncate">{company.name}</span>
              </p>
            ) : null}
            <p className="truncate font-mono text-sm tracking-wide text-ink">
              {voucher.code}
            </p>
            <div className="mt-1 flex min-w-0 flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
              <div className="flex min-w-0 items-baseline gap-2">
                <p className="shrink-0 text-lg font-semibold tracking-tight">
                  {formatShekel(voucher.balance)}
                </p>
                {voucher.receivedAt !== undefined ? (
                  <p className="min-w-0 truncate text-xs text-muted">
                    {formatReceivedLabel(voucher.receivedAt)}
                  </p>
                ) : null}
              </div>
              {voucher.expiresAt !== undefined ? (
                <p
                  className={cx(
                    'min-w-0 text-right text-xs leading-tight',
                    !used && isExpired(voucher.expiresAt)
                      ? 'font-semibold text-danger'
                      : !used && isExpiringSoon(voucher.expiresAt)
                        ? 'font-medium text-warning'
                        : 'text-muted',
                  )}
                >
                  {formatExpiryLabel(voucher.expiresAt)}
                </p>
              ) : used ? (
                <p className="text-xs font-medium text-muted">Used</p>
              ) : null}
            </div>
          </button>
          <button
            type="button"
            aria-expanded={revealed}
            aria-label={revealed ? 'Hide actions' : 'Show actions'}
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-md text-muted hover:bg-surface-hover hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            onClick={() => snap(!revealed)}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <circle cx="9" cy="4.5" r="1.2" fill="currentColor" />
              <circle cx="9" cy="9" r="1.2" fill="currentColor" />
              <circle cx="9" cy="13.5" r="1.2" fill="currentColor" />
            </svg>
          </button>
        </Card>
      </div>
    </li>
  );
}
