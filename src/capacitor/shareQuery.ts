export type ShareQuery = {
  title?: string;
  text?: string;
  url?: string;
};

export type SharePayload = {
  title?: string;
  texts?: readonly string[];
};

export function isHttpUrl(value: string | undefined): boolean {
  if (!value) {
    return false;
  }
  try {
    const parsed = new URL(value.trim());
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function sharePayloadToQuery(payload: SharePayload): ShareQuery {
  const title = payload.title?.trim() || undefined;
  const texts = (payload.texts ?? [])
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  const text = texts.join('\n') || undefined;
  const urlFromTexts = texts.find((part) => isHttpUrl(part));
  const url = urlFromTexts ?? (isHttpUrl(title) ? title : undefined);
  return { title, text, url };
}

export function hasShareContent(query: ShareQuery): boolean {
  return Boolean(query.title || query.text || query.url);
}

export function shareQueryToSearch(query: ShareQuery): string {
  const params = new URLSearchParams();
  if (query.title) {
    params.set('title', query.title);
  }
  if (query.text) {
    params.set('text', query.text);
  }
  if (query.url) {
    params.set('url', query.url);
  }
  return params.toString();
}

export function shareQueryFromAppUrl(rawUrl: string): ShareQuery | null {
  try {
    const parsed = new URL(rawUrl);
    const path = parsed.pathname.replace(/\/+$/, '') || '/';
    if (path !== '/share') {
      return null;
    }
    const title = parsed.searchParams.get('title')?.trim() || undefined;
    const text = parsed.searchParams.get('text')?.trim() || undefined;
    const url = parsed.searchParams.get('url')?.trim() || undefined;
    return { title, text, url };
  } catch {
    return null;
  }
}
