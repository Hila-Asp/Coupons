import { cx } from '../lib/cx';

export interface AddFabProps {
  onClick: () => void;
  label?: string;
}

export function AddFab({ onClick, label = 'Add voucher' }: AddFabProps) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 mx-auto max-w-lg">
      <div className="flex justify-end px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <button
          type="button"
          aria-label={label}
          className={cx(
            'pointer-events-auto inline-flex size-14 items-center justify-center rounded-full bg-accent text-accent-fg',
            'shadow-[var(--shadow-md)]',
            'transition-[transform,background-color] duration-[var(--duration-fast)] ease-[var(--ease-out)]',
            'hover:bg-accent-hover active:scale-[0.96]',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
          )}
          onClick={onClick}
        >
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
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
  );
}
