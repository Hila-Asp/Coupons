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

export async function scrapeVoucherCode(
  url: string,
  signal?: AbortSignal,
): Promise<ScrapeResult> {
  try {
    const response = await fetch('/api/voucher-code', {
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
