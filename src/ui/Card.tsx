import { type HTMLAttributes } from 'react';
import { assertNever } from '../lib/assertNever';
import { cx } from '../lib/cx';

export type CardPadding = 'none' | 'sm' | 'md' | 'lg';
export type CardElement = 'div' | 'article' | 'section' | 'li';

export interface CardProps extends HTMLAttributes<HTMLElement> {
  as?: CardElement;
  padding?: CardPadding;
  interactive?: boolean;
}

function paddingClass(padding: CardPadding): string {
  switch (padding) {
    case 'none':
      return 'p-0';
    case 'sm':
      return 'p-3';
    case 'md':
      return 'p-4';
    case 'lg':
      return 'p-5';
    default:
      return assertNever(padding);
  }
}

export function Card({
  as: Component = 'div',
  padding = 'md',
  interactive = false,
  className,
  ...rest
}: CardProps) {
  return (
    <Component
      className={cx(
        'rounded-lg border border-line bg-surface shadow-[var(--shadow-sm)]',
        paddingClass(padding),
        interactive &&
          'transition-[transform,box-shadow,border-color] duration-[var(--duration-fast)] ease-[var(--ease-out)] hover:border-line-strong hover:shadow-[var(--shadow-md)] active:scale-[0.99]',
        className,
      )}
      {...rest}
    />
  );
}
