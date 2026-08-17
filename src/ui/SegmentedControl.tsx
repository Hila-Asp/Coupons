import { cx } from '../lib/cx';

export interface SegmentedControlOption<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedControlProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: readonly SegmentedControlOption<T>[];
  ariaLabel?: string;
  className?: string;
}

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cx(
        'grid min-h-11 w-full grid-flow-col rounded-md bg-canvas p-1',
        'border border-line',
        className,
      )}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={selected}
            className={cx(
              'min-h-11 min-w-0 truncate rounded-sm px-2 text-sm font-medium',
              'transition-[background-color,color,box-shadow] duration-[var(--duration-fast)] ease-[var(--ease-out)]',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
              selected
                ? 'bg-surface text-ink shadow-[var(--shadow-sm)]'
                : 'text-muted hover:text-ink',
            )}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
