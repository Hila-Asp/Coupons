import { Capacitor } from '@capacitor/core';
import { isPluxeeVoucherUrl } from './pluxee';

export type ScrapeErrorCode =
  | 'invalid_url'
  | 'host_not_allowed'
  | 'https_required'
  | 'invalid_body'
  | 'fetch_failed'
  | 'timeout'
  | 'redirect_blocked'
  | 'code_not_found'
  | 'method_not_allowed'
  | 'network'
  | 'unknown';

export type ScrapeResult =
  | { ok: true; codes: string[] }
  | { ok: false; code: ScrapeErrorCode; message: string };

interface SuccessPayload {
  ok?: boolean;
  code?: string;
  codes?: unknown;
}

interface ErrorPayload {
  ok?: boolean;
  code?: string;
  error?: {
    code?: string;
    message?: string;
  };
}

const TWENTY_DIGIT_CODE = /(?:^|[^\d])(\d{20})(?!\d)/g;
const TEXT_READER_PREFIX = 'https://r.jina.ai/';

function asErrorCode(value: string | undefined): ScrapeErrorCode {
  switch (value) {
    case 'invalid_url':
    case 'host_not_allowed':
    case 'https_required':
    case 'invalid_body':
    case 'fetch_failed':
    case 'timeout':
    case 'redirect_blocked':
    case 'code_not_found':
    case 'method_not_allowed':
    case 'network':
    case 'unknown':
      return value;
    default:
      return 'unknown';
  }
}

function readCodes(payload: SuccessPayload): string[] {
  if (Array.isArray(payload.codes)) {
    return [
      ...new Set(
        payload.codes.filter(
          (value): value is string =>
            typeof value === 'string' && value.length > 0,
        ),
      ),
    ];
  }
  if (typeof payload.code === 'string' && payload.code.length > 0) {
    return [payload.code];
  }
  return [];
}

export function extractTwentyDigitCodes(source: string): string[] {
  const found = new Set<string>();
  const pattern = new RegExp(TWENTY_DIGIT_CODE.source, 'g');
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(source)) !== null) {
    found.add(match[1]);
  }
  if (found.size > 0) {
    return [...found];
  }
  const stripped = source.replace(/<[^>]+>/g, '');
  const strippedPattern = new RegExp(TWENTY_DIGIT_CODE.source, 'g');
  while ((match = strippedPattern.exec(stripped)) !== null) {
    found.add(match[1]);
  }
  return [...found];
}

function shouldTryClientReader(code: ScrapeErrorCode): boolean {
  switch (code) {
    case 'code_not_found':
    case 'fetch_failed':
    case 'timeout':
    case 'network':
      return true;
    case 'invalid_url':
    case 'host_not_allowed':
    case 'https_required':
    case 'invalid_body':
    case 'redirect_blocked':
    case 'method_not_allowed':
    case 'unknown':
      return false;
    default: {
      const _exhaustive: never = code;
      return _exhaustive;
    }
  }
}

export function resolveVoucherCodeApiUrl(
  apiBase: string | undefined,
  native: boolean,
): string | null {
  const base = apiBase?.trim().replace(/\/+$/, '') ?? '';
  if (base.length > 0) {
    return `${base}/api/voucher-code`;
  }
  if (native) {
    return null;
  }
  return '/api/voucher-code';
}

async function scrapeViaApi(
  url: string,
  endpoint: string,
  signal?: AbortSignal,
): Promise<ScrapeResult> {
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
      signal,
    });

    const payload = (await response.json().catch(() => null)) as
      | SuccessPayload
      | ErrorPayload
      | null;

    if (payload && payload.ok === true) {
      const codes = readCodes(payload);
      if (codes.length > 0) {
        return { ok: true, codes };
      }
    }

    const errorPayload = payload as ErrorPayload | null;
    return {
      ok: false,
      code: asErrorCode(errorPayload?.error?.code),
      message:
        errorPayload?.error?.message ??
        'We could not read a voucher code from that page.',
    };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return {
        ok: false,
        code: 'network',
        message: 'The lookup was cancelled.',
      };
    }
    return {
      ok: false,
      code: 'network',
      message: 'The lookup failed. You can paste the code instead.',
    };
  }
}

/**
 * Browser-side reader fallback. Pluxee blocks Vercel IPs, but jina reflects
 * CORS for our origin so the user's device can read the page.
 */
export async function scrapeViaClientTextReader(
  url: string,
  signal?: AbortSignal,
): Promise<ScrapeResult> {
  if (!isPluxeeVoucherUrl(url)) {
    return {
      ok: false,
      code: 'host_not_allowed',
      message: 'Only Pluxee voucher links can be looked up.',
    };
  }

  try {
    const readerUrl = `${TEXT_READER_PREFIX}${encodeURIComponent(url.trim())}`;
    const response = await fetch(readerUrl, {
      method: 'GET',
      signal,
      headers: { Accept: 'text/plain,*/*;q=0.8' },
    });
    if (!response.ok) {
      return {
        ok: false,
        code: 'fetch_failed',
        message: 'Could not read the voucher page.',
      };
    }
    const text = await response.text();
    const codes = extractTwentyDigitCodes(text);
    if (codes.length === 0) {
      return {
        ok: false,
        code: 'code_not_found',
        message: 'No 20-digit code was found on the page.',
      };
    }
    return { ok: true, codes };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return {
        ok: false,
        code: 'network',
        message: 'The lookup was cancelled.',
      };
    }
    return {
      ok: false,
      code: 'network',
      message: 'The lookup failed. You can paste the code instead.',
    };
  }
}

export async function scrapeVoucherCode(
  url: string,
  signal?: AbortSignal,
): Promise<ScrapeResult> {
  const endpoint = resolveVoucherCodeApiUrl(
    import.meta.env.VITE_API_BASE,
    Capacitor.isNativePlatform(),
  );
  if (!endpoint) {
    return scrapeViaClientTextReader(url, signal);
  }

  const apiResult = await scrapeViaApi(url, endpoint, signal);
  if (apiResult.ok) {
    return apiResult;
  }
  if (!shouldTryClientReader(apiResult.code)) {
    return apiResult;
  }

  const readerResult = await scrapeViaClientTextReader(url, signal);
  if (readerResult.ok) {
    return readerResult;
  }
  return apiResult;
}
