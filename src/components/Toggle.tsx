import { cx } from '../lib/cx';

export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}

export function Toggle({ checked, onChange, label }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className={cx(
        'inline-flex shrink-0 min-h-11 items-center gap-2 rounded-md px-1',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
      )}
      onClick={() => onChange(!checked)}
    >
      <span className="text-sm font-medium text-ink">{label}</span>
      <span
        className={cx(
          'relative isolate h-6 w-11 shrink-0 overflow-hidden rounded-full transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)]',
          checked ? 'bg-accent' : 'bg-line-strong',
        )}
      >
        <span
          className={cx(
            'absolute top-0.5 left-0.5 size-5 rounded-full bg-surface shadow-[var(--shadow-sm)]',
            'transition-transform duration-[var(--duration-fast)] ease-[var(--ease-out)]',
            checked ? 'translate-x-5' : 'translate-x-0',
          )}
        />
      </span>
    </button>
  );
}
