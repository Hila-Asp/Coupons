import { type ReactNode, type SelectHTMLAttributes, forwardRef, useId } from 'react';
import { cx } from '../lib/cx';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  options: readonly SelectOption[];
  placeholder?: string;
  onChange: (value: string) => void;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  function Select(
    {
      label,
      hint,
      error,
      options,
      placeholder,
      className,
      id,
      disabled,
      value,
      onChange,
      ...rest
    },
    ref,
  ) {
    const generatedId = useId();
    const selectId = id ?? generatedId;
    const hintId = `${selectId}-hint`;
    const errorId = `${selectId}-error`;
    const describedBy = [
      hint ? hintId : undefined,
      error ? errorId : undefined,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div className="flex w-full flex-col gap-1.5">
        {label ? (
          <label htmlFor={selectId} className="text-sm font-medium text-ink">
            {label}
          </label>
        ) : null}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            disabled={disabled}
            value={value}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy || undefined}
            onChange={(event) => onChange(event.target.value)}
            className={cx(
              'min-h-11 w-full appearance-none rounded-md border bg-surface px-3 pr-11 text-base text-ink',
              'transition-[border-color,box-shadow] duration-[var(--duration-fast)] ease-[var(--ease-out)]',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
              'disabled:cursor-not-allowed disabled:opacity-45',
              error ? 'border-danger' : 'border-line focus:border-accent',
              className,
            )}
            {...rest}
          >
            {placeholder ? (
              <option value="" disabled>
                {placeholder}
              </option>
            ) : null}
            {options.map((option) => (
              <option
                key={option.value}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </option>
            ))}
          </select>
          <span
            className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-muted"
            aria-hidden="true"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M4 6.5 8 10.5 12 6.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </div>
        {error ? (
          <p id={errorId} className="text-sm text-danger" role="alert">
            {error}
          </p>
        ) : hint ? (
          <p id={hintId} className="text-sm text-muted">
            {hint}
          </p>
        ) : null}
      </div>
    );
  },
);
