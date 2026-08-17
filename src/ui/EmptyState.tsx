import { type ReactNode } from 'react';
import { cx } from '../lib/cx';

export interface EmptyStateProps {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  description,
  action,
  icon,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cx(
        'flex flex-col items-center justify-center px-6 py-16 text-center',
        className,
      )}
    >
      {icon ? (
        <div className="mb-4 text-muted" aria-hidden="true">
          {icon}
        </div>
      ) : (
        <div
          className="mb-4 flex size-12 items-center justify-center rounded-lg border border-line bg-surface text-muted shadow-[var(--shadow-sm)]"
          aria-hidden="true"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <rect
              x="4"
              y="7"
              width="16"
              height="11"
              rx="2.5"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <path
              d="M4 11.5h16"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <circle cx="8" cy="8.5" r="1" fill="currentColor" />
          </svg>
        </div>
      )}
      <h2 className="text-lg font-semibold tracking-tight text-ink">{title}</h2>
      {description ? (
        <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-5 w-full max-w-xs">{action}</div> : null}
    </div>
  );
}
