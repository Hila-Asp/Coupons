import { type ButtonHTMLAttributes, forwardRef } from 'react';
import { assertNever } from '../lib/assertNever';
import { cx } from '../lib/cx';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';
export type ButtonSize = 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
}

function variantClass(variant: ButtonVariant): string {
  switch (variant) {
    case 'primary':
      return 'bg-accent text-accent-fg shadow-[var(--shadow-sm)] hover:bg-accent-hover active:bg-accent-active';
    case 'secondary':
      return 'bg-surface text-ink border border-line hover:bg-surface-hover active:bg-surface-active';
    case 'ghost':
      return 'bg-transparent text-ink hover:bg-surface-hover active:bg-surface-active';
    case 'destructive':
      return 'bg-danger text-danger-fg shadow-[var(--shadow-sm)] hover:bg-danger-hover active:bg-danger-active';
    default:
      return assertNever(variant);
  }
}

function sizeClass(size: ButtonSize): string {
  switch (size) {
    case 'md':
      return 'min-h-11 px-4 text-sm gap-2';
    case 'lg':
      return 'min-h-13 px-5 text-base gap-2.5';
    default:
      return assertNever(size);
  }
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      loading = false,
      className,
      disabled,
      type = 'button',
      children,
      ...rest
    },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        className={cx(
          'inline-flex items-center justify-center rounded-md font-medium',
          'transition-[background-color,transform,box-shadow,opacity] duration-[var(--duration-fast)] ease-[var(--ease-out)]',
          'active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
          variantClass(variant),
          sizeClass(size),
          fullWidth && 'w-full',
          className,
        )}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...rest}
      >
        {loading ? (
          <span
            className="size-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent"
            aria-hidden="true"
          />
        ) : null}
        {children}
      </button>
    );
  },
);
