import { type ReactNode } from 'react';
import { assertNever } from '../lib/assertNever';
import { cx } from '../lib/cx';

export type BannerTone = 'info' | 'warning' | 'success' | 'danger';

export interface BannerAction {
  label: string;
  onClick: () => void;
}

export interface BannerProps {
  tone?: BannerTone;
  title?: ReactNode;
  children: ReactNode;
  onDismiss?: () => void;
  action?: BannerAction;
  className?: string;
}

function toneClass(tone: BannerTone): string {
  switch (tone) {
    case 'info':
      return 'bg-accent-soft text-ink border-accent/25';
    case 'warning':
      return 'bg-warning-soft text-ink border-warning/30';
    case 'success':
      return 'bg-success-soft text-ink border-success/30';
    case 'danger':
      return 'bg-danger-soft text-ink border-danger/30';
    default:
      return assertNever(tone);
  }
}

export function Banner({
  tone = 'info',
  title,
  children,
  onDismiss,
  action,
  className,
}: BannerProps) {
  return (
    <div
      role="status"
      className={cx(
        'flex gap-3 rounded-lg border px-4 py-3',
        toneClass(tone),
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        {title ? (
          <p className="text-sm font-semibold text-ink">{title}</p>
        ) : null}
        <div className="text-sm text-ink/80">{children}</div>
        {action ? (
          <button
            type="button"
            className="mt-2 min-h-11 text-sm font-medium text-ink underline-offset-2 hover:underline"
            onClick={action.onClick}
          >
            {action.label}
          </button>
        ) : null}
      </div>
      {onDismiss ? (
        <button
          type="button"
          aria-label="Dismiss"
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-md text-ink/70 hover:bg-black/5 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          onClick={onDismiss}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d="M4 4l8 8M12 4l-8 8"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      ) : null}
    </div>
  );
}
