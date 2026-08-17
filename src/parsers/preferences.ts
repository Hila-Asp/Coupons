const STORAGE_KEY = 'voucher-manager-disabled-parsers';

function readStorage(): Storage | undefined {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

export function getDisabledParserIds(): Set<string> {
  const storage = readStorage();
  if (!storage) {
    return new Set();
  }
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) {
      return new Set();
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return new Set();
    }
    return new Set(
      parsed.filter((value): value is string => typeof value === 'string'),
    );
  } catch {
    return new Set();
  }
}

export function isParserEnabled(
  id: string,
  disabledIds = getDisabledParserIds(),
): boolean {
  return !disabledIds.has(id);
}

export function setParserEnabled(id: string, enabled: boolean): void {
  const disabled = getDisabledParserIds();
  if (enabled) {
    disabled.delete(id);
  } else {
    disabled.add(id);
  }
  const storage = readStorage();
  if (!storage) {
    return;
  }
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify([...disabled]));
  } catch {
    return;
  }
}
