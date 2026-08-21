export function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

export function isNumericSender(sender: string): boolean {
  const stripped = sender.trim().replace(/[\s\-().]/g, '');
  return /^\+?\d+$/.test(stripped);
}

/**
 * Israeli subscriber digits without a leading 0 or 972 country code.
 * `0541234567`, `+972541234567`, and `972541234567` all become `541234567`.
 */
export function israeliLocalSubscriber(digits: string): string | undefined {
  let local = digits;
  if (local.startsWith('972')) {
    local = local.slice(3);
  }
  if (local.startsWith('0')) {
    local = local.slice(1);
  }
  if (local.length >= 7 && local.length <= 10) {
    return local;
  }
  return undefined;
}

export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Java `String.matches` regex for the SMS inbox plugin. Numeric senders match
 * 054 / 972 / +972. Alphanumeric senders (PLUXEE, Hebrew names) match the
 * trimmed string exactly.
 */
export function buildAddressRegex(sender: string): string {
  const trimmed = sender.trim();
  if (!isNumericSender(trimmed)) {
    return `^${escapeRegex(trimmed)}$`;
  }
  const local =
    israeliLocalSubscriber(digitsOnly(trimmed)) ??
    digitsOnly(trimmed).replace(/^0+/, '');
  return `^\\+?(?:0|972)?${escapeRegex(local)}$`;
}

export function senderMatches(address: string, sender: string): boolean {
  const needle = sender.trim();
  const haystack = address.trim();
  if (!needle) {
    return false;
  }
  if (!isNumericSender(needle)) {
    return haystack.toLowerCase() === needle.toLowerCase();
  }
  const addressLocal = israeliLocalSubscriber(digitsOnly(haystack));
  const senderLocal = israeliLocalSubscriber(digitsOnly(needle));
  if (addressLocal && senderLocal) {
    return addressLocal === senderLocal;
  }
  return digitsOnly(haystack) === digitsOnly(needle);
}

export function filterMessagesBySender<T extends { address: string }>(
  messages: readonly T[],
  sender: string,
): T[] {
  return messages.filter((message) => senderMatches(message.address, sender));
}
