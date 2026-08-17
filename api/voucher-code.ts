const ALLOWED_HOST = 'myconsumers.pluxee.co.il';
const FETCH_TIMEOUT_MS = 8_000;
const MAX_REDIRECTS = 3;
const MAX_BODY_BYTES = 1_500_000;

export const config = {
  runtime: 'nodejs',
  maxDuration: 15,
};

export type VoucherCodeErrorCode =
  | 'invalid_url'
  | 'host_not_allowed'
  | 'https_required'
  | 'invalid_body'
  | 'fetch_failed'
  | 'timeout'
  | 'redirect_blocked'
  | 'code_not_found'
  | 'method_not_allowed';

export interface VoucherCodeSuccess {
  ok: true;
  code?: string;
  codes: string[];
}

export interface VoucherCodeFailure {
  ok: false;
  error: {
    code: VoucherCodeErrorCode;
    message: string;
  };
}

export function extractTwentyDigitCodes(html: string): string[] {
  const matches = html.match(/(?<!\d)\d{20}(?!\d)/g);
  if (!matches) {
    return [];
  }
  return [...new Set(matches)];
}

export function extractTwentyDigitCode(html: string): string | null {
  const codes = extractTwentyDigitCodes(html);
  return codes.length === 1 ? codes[0] : null;
}

export function assertAllowedVoucherUrl(value: string):
  | { ok: true; url: URL }
  | { ok: false; status: number; code: VoucherCodeErrorCode; message: string } {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return {
      ok: false,
      status: 400,
      code: 'invalid_url',
      message: 'The voucher URL is not valid.',
    };
  }

  if (url.protocol !== 'https:') {
    return {
      ok: false,
      status: 400,
      code: 'https_required',
      message: 'The voucher URL must use HTTPS.',
    };
  }

  if (url.hostname !== ALLOWED_HOST) {
    return {
      ok: false,
      status: 403,
      code: 'host_not_allowed',
      message: 'Only myconsumers.pluxee.co.il URLs can be fetched.',
    };
  }

  return { ok: true, url };
}

function jsonError(
  status: number,
  code: VoucherCodeErrorCode,
  message: string,
): Response {
  const body: VoucherCodeFailure = { ok: false, error: { code, message } };
  return Response.json(body, { status });
}

function jsonOk(codes: string[]): Response {
  const body: VoucherCodeSuccess =
    codes.length === 1
      ? { ok: true, code: codes[0], codes }
      : { ok: true, codes };
  return Response.json(body);
}

function isTimeoutError(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    (error.name === 'TimeoutError' || error.name === 'AbortError')
  );
}

async function readRequestedUrl(
  request: Request,
): Promise<
  | { ok: true; value: string }
  | { ok: false; status: number; code: VoucherCodeErrorCode; message: string }
> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return {
      ok: false,
      status: 400,
      code: 'invalid_body',
      message: 'Request body must be JSON with a url field.',
    };
  }

  if (typeof body === 'string' && body.trim()) {
    return { ok: true, value: body.trim() };
  }

  if (
    body &&
    typeof body === 'object' &&
    'url' in body &&
    typeof body.url === 'string' &&
    body.url.trim()
  ) {
    return { ok: true, value: body.url.trim() };
  }

  return {
    ok: false,
    status: 400,
    code: 'invalid_body',
    message: 'Request body must include a url string.',
  };
}

async function fetchSameHost(
  start: URL,
  signal: AbortSignal,
): Promise<
  | { ok: true; body: string }
  | { ok: false; status: number; code: VoucherCodeErrorCode; message: string }
> {
  let current = start;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    let response: Response;
    try {
      response = await fetch(current, {
        method: 'GET',
        redirect: 'manual',
        signal,
        headers: {
          Accept:
            'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
          'User-Agent':
            'Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
        },
      });
    } catch (error) {
      if (isTimeoutError(error)) {
        return {
          ok: false,
          status: 504,
          code: 'timeout',
          message: 'The voucher page took too long to respond.',
        };
      }
      console.error('voucher-code fetch failed', error);
      return {
        ok: false,
        status: 502,
        code: 'fetch_failed',
        message: 'Could not load the voucher page.',
      };
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) {
        return {
          ok: false,
          status: 502,
          code: 'fetch_failed',
          message: 'The voucher page redirected without a location.',
        };
      }

      let next: URL;
      try {
        next = new URL(location, current);
      } catch {
        return {
          ok: false,
          status: 502,
          code: 'fetch_failed',
          message: 'The voucher page redirected to an invalid URL.',
        };
      }

      if (next.protocol !== 'https:') {
        return {
          ok: false,
          status: 403,
          code: 'redirect_blocked',
          message: 'Refusing to follow a non-HTTPS redirect.',
        };
      }

      if (next.hostname !== ALLOWED_HOST) {
        return {
          ok: false,
          status: 403,
          code: 'redirect_blocked',
          message: 'Refusing to follow a redirect to another host.',
        };
      }

      current = next;
      continue;
    }

    if (!response.ok) {
      return {
        ok: false,
        status: 502,
        code: 'fetch_failed',
        message: `The voucher page returned ${response.status}.`,
      };
    }

    const buffer = await response.arrayBuffer();
    const slice =
      buffer.byteLength > MAX_BODY_BYTES
        ? buffer.slice(0, MAX_BODY_BYTES)
        : buffer;
    return {
      ok: true,
      body: new TextDecoder('utf-8', { fatal: false }).decode(slice),
    };
  }

  return {
    ok: false,
    status: 502,
    code: 'fetch_failed',
    message: 'Too many redirects from the voucher page.',
  };
}

export async function POST(request: Request): Promise<Response> {
  const requested = await readRequestedUrl(request);
  if (!requested.ok) {
    return jsonError(requested.status, requested.code, requested.message);
  }

  const allowed = assertAllowedVoucherUrl(requested.value);
  if (!allowed.ok) {
    return jsonError(allowed.status, allowed.code, allowed.message);
  }

  const timeout = AbortSignal.timeout(FETCH_TIMEOUT_MS);
  const signal = request.signal
    ? AbortSignal.any([request.signal, timeout])
    : timeout;

  const fetched = await fetchSameHost(allowed.url, signal);
  if (!fetched.ok) {
    return jsonError(fetched.status, fetched.code, fetched.message);
  }

  const codes = extractTwentyDigitCodes(fetched.body);
  if (codes.length === 0) {
    return jsonError(
      422,
      'code_not_found',
      'No 20-digit code was found on the page.',
    );
  }

  return jsonOk(codes);
}

export function GET(): Response {
  return new Response(
    JSON.stringify({
      ok: false,
      error: {
        code: 'method_not_allowed',
        message: 'Use POST with a JSON url field.',
      },
    }),
    {
      status: 405,
      headers: {
        Allow: 'POST',
        'Content-Type': 'application/json',
      },
    },
  );
}
