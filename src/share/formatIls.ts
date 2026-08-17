export function formatIls(amount: number): string {
  if (!Number.isFinite(amount)) {
    return '₪0.00';
  }
  return `₪${amount.toFixed(2)}`;
}

export function parseIlsInput(value: string): number | undefined {
  const normalized = value.replace(/,/g, '').trim();
  if (!normalized) {
    return undefined;
  }
  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : undefined;
}
