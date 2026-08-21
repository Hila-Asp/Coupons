import { assertNever } from '../lib/assertNever';
import { cx } from '../lib/cx';
import type { SortDirection, VoucherSortField } from '../lib/sortVouchers';
import { Button, SegmentedControl } from '../ui';

const SORT_FIELD_OPTIONS = [
  { value: 'date', label: 'Date' },
  { value: 'amount', label: 'Amount' },
] as const satisfies readonly { value: VoucherSortField; label: string }[];

export interface VoucherSortControlProps {
  field: VoucherSortField;
  direction: SortDirection;
  onFieldChange: (field: VoucherSortField) => void;
  onDirectionChange: (direction: SortDirection) => void;
  className?: string;
}

function directionLabel(
  field: VoucherSortField,
  direction: SortDirection,
): string {
  switch (field) {
    case 'date':
      switch (direction) {
        case 'desc':
          return 'Newest';
        case 'asc':
          return 'Oldest';
        default:
          return assertNever(direction);
      }
    case 'amount':
      switch (direction) {
        case 'desc':
          return 'High to low';
        case 'asc':
          return 'Low to high';
        default:
          return assertNever(direction);
      }
    default:
      return assertNever(field);
  }
}

function toggleDirection(direction: SortDirection): SortDirection {
  switch (direction) {
    case 'asc':
      return 'desc';
    case 'desc':
      return 'asc';
    default:
      return assertNever(direction);
  }
}

export function VoucherSortControl({
  field,
  direction,
  onFieldChange,
  onDirectionChange,
  className,
}: VoucherSortControlProps) {
  const label = directionLabel(field, direction);

  return (
    <div
      role="group"
      aria-label="Sort vouchers"
      className={cx('flex min-w-0 flex-wrap items-center gap-2', className)}
    >
      <div className="min-w-[10rem] flex-1">
        <SegmentedControl
          value={field}
          onChange={onFieldChange}
          options={SORT_FIELD_OPTIONS}
          ariaLabel="Sort by"
        />
      </div>
      <Button
        variant="secondary"
        className="min-w-[8.5rem] shrink-0 whitespace-nowrap px-3"
        aria-label={`Sort order, ${label}`}
        onClick={() => onDirectionChange(toggleDirection(direction))}
      >
        {label}
      </Button>
    </div>
  );
}
