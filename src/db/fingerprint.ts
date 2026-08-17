export function normalizeImportText(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, ' ');
}

export async function computeTextFingerprint(text: string): Promise<string> {
  const encoded = new TextEncoder().encode(normalizeImportText(text));
  const digest = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
}

export function fingerprintFromSourceUrl(sourceUrl: string): string {
  return sourceUrl.trim();
}

export async function resolveImportFingerprint(input: {
  sourceUrl?: string;
  text: string;
}): Promise<string> {
  const sourceUrl = input.sourceUrl?.trim();
  if (sourceUrl) {
    return fingerprintFromSourceUrl(sourceUrl);
  }
  return computeTextFingerprint(input.text);
}
