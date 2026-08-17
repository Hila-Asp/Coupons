export const PLUXEE_VOUCHER_HOST = 'myconsumers.pluxee.co.il';

export function isPluxeeVoucherUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:' && url.hostname === PLUXEE_VOUCHER_HOST;
  } catch {
    return false;
  }
}

export function isTwentyDigitCode(value: string): boolean {
  return /^\d{20}$/.test(value.trim());
}
