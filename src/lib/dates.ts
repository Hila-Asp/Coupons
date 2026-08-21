const DATE_FORMAT = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const DAY_MONTH_FORMAT = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
});

export function formatDate(timestamp: number): string {
  return DATE_FORMAT.format(new Date(timestamp));
}

/** Drops the year while it matches today's, to keep voucher cards narrow. */
export function formatReceivedLabel(timestamp: number, now = Date.now()): string {
  const date = new Date(timestamp);
  if (date.getFullYear() === new Date(now).getFullYear()) {
    return `Received ${DAY_MONTH_FORMAT.format(date)}`;
  }
  return `Received ${DATE_FORMAT.format(date)}`;
}

export function toDateInputValue(timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function fromDateInputValue(value: string): number {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day, 23, 59, 59, 999).getTime();
}

/** Local midnight, for dates that mark when something happened. */
export function startOfDayFromDateInput(value: string): number | undefined {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) {
    return undefined;
  }
  return new Date(year, month - 1, day).getTime();
}

export function startOfLocalDay(timestamp: number): number {
  const date = new Date(timestamp);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

export function isExpired(expiresAt: number, now = Date.now()): boolean {
  return startOfLocalDay(expiresAt) < startOfLocalDay(now);
}

export function formatExpiryLabel(expiresAt: number, now = Date.now()): string {
  const expiryDay = startOfLocalDay(expiresAt);
  const today = startOfLocalDay(now);
  const dayMs = 24 * 60 * 60 * 1000;
  const deltaDays = Math.round((expiryDay - today) / dayMs);

  if (deltaDays < 0) {
    const ago = Math.abs(deltaDays);
    return ago === 1 ? 'Expired yesterday' : `Expired ${ago} days ago`;
  }
  if (deltaDays === 0) {
    return 'Expires today';
  }
  if (deltaDays === 1) {
    return 'Expires tomorrow';
  }
  return `Expires in ${deltaDays} days`;
}
