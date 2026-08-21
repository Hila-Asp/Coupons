import { useEffect } from 'react';
import { cx } from '../lib/cx';

export interface ExpandingFabProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNewVoucher: () => void;
  onNewCompany: () => void;
  onImportSms?: () => void;
}

export function ExpandingFab({
  open,
  onOpenChange,
  onNewVoucher,
  onNewCompany,
  onImportSms,
}: ExpandingFabProps) {
  useEffect(() => {
    if (!open) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onOpenChange(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onOpenChange]);

  return (
    <div className="pointer-events-none fixed inset-0 z-30">
      {open ? (
        <button
          type="button"
          aria-label="Close actions"
          className="pointer-events-auto absolute inset-0 bg-ink/20"
          onClick={() => onOpenChange(false)}
        />
      ) : null}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 mx-auto max-w-lg">
      <div className="pointer-events-auto relative flex flex-col items-end gap-3 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div
          className={cx(
            'flex flex-col items-end gap-2',
            'transition-[opacity,transform] duration-[var(--duration-base)] ease-[var(--ease-out)]',
            open
              ? 'translate-y-0 opacity-100'
              : 'pointer-events-none translate-y-2 opacity-0',
          )}
        >
          <FabAction
            label="New voucher"
            onClick={() => {
              onOpenChange(false);
              onNewVoucher();
            }}
          />
          <FabAction
            label="New company"
            onClick={() => {
              onOpenChange(false);
              onNewCompany();
            }}
          />
          {onImportSms ? (
            <FabAction
              label="Import SMS"
              onClick={() => {
                onOpenChange(false);
                onImportSms();
              }}
            />
          ) : null}
        </div>
        <button
          type="button"
          aria-expanded={open}
          aria-label={open ? 'Close' : 'Add'}
          className={cx(
            'inline-flex size-14 items-center justify-center rounded-full bg-accent text-accent-fg',
            'shadow-[var(--shadow-md)]',
            'transition-[transform,background-color] duration-[var(--duration-fast)] ease-[var(--ease-out)]',
            'hover:bg-accent-hover active:scale-[0.96]',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
          )}
          onClick={() => onOpenChange(!open)}
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 22 22"
            fill="none"
            aria-hidden="true"
            className={cx(
              'transition-transform duration-[var(--duration-base)] ease-[var(--ease-out)]',
              open && 'rotate-45',
            )}
          >
            <path
              d="M11 4.5v13M4.5 11h13"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
      </div>
    </div>
  );
}

function FabAction({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={cx(
        'inline-flex min-h-11 items-center rounded-full bg-surface px-4 text-sm font-medium text-ink',
        'border border-line shadow-[var(--shadow-sm)]',
        'transition-[transform,background-color] duration-[var(--duration-fast)] ease-[var(--ease-out)]',
        'hover:bg-surface-hover active:scale-[0.98]',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
      )}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
