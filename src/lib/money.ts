export function formatShekel(amount: number): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  return `₪${safe.toFixed(2)}`;
}
