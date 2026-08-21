import { useCallback, useState } from 'react';
import {
  DEFAULT_VOUCHER_SORT,
  parseVoucherSort,
  VOUCHER_SORT_STORAGE_KEY,
  type SortDirection,
  type VoucherSort,
  type VoucherSortField,
} from '../lib/sortVouchers';

function readVoucherSort(): VoucherSort {
  try {
    const stored = localStorage.getItem(VOUCHER_SORT_STORAGE_KEY);
    if (!stored) {
      return { ...DEFAULT_VOUCHER_SORT };
    }
    return parseVoucherSort(JSON.parse(stored) as unknown);
  } catch {
    return { ...DEFAULT_VOUCHER_SORT };
  }
}

function writeVoucherSort(sort: VoucherSort): void {
  try {
    localStorage.setItem(VOUCHER_SORT_STORAGE_KEY, JSON.stringify(sort));
  } catch {
    return;
  }
}

export function useVoucherSort(): {
  field: VoucherSortField;
  direction: SortDirection;
  setField: (field: VoucherSortField) => void;
  setDirection: (direction: SortDirection) => void;
} {
  const [sort, setSort] = useState<VoucherSort>(readVoucherSort);

  const setField = useCallback((field: VoucherSortField) => {
    setSort((current) => {
      const next = { ...current, field };
      writeVoucherSort(next);
      return next;
    });
  }, []);

  const setDirection = useCallback((direction: SortDirection) => {
    setSort((current) => {
      const next = { ...current, direction };
      writeVoucherSort(next);
      return next;
    });
  }, []);

  return {
    field: sort.field,
    direction: sort.direction,
    setField,
    setDirection,
  };
}
