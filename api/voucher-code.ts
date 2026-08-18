import { setDefaultResultOrder } from 'node:dns';
import { request as httpsRequest } from 'node:https';

setDefaultResultOrder('ipv4first');

const ALLOWED_HOST = 'myconsumers.pluxee.co.il';
const FETCH_TIMEOUT_MS = 12_000;
const MAX_REDIRECTS = 3;
const MAX_BODY_BYTES = 1_500_000;
/** Pluxee often serves an empty shell to datacenter IPs; text readers still see the page. */
const TEXT_READER_PREFIX = 'https://r.jina.ai/';

const BROWSER_HEADERS: Record<string, string> = {
  Accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7',
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Upgrade-Insecure-Requests': '1',
  'Cache-Control': 'no-cache',
  Pragma: 'no-cache',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
};

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

export interface FetchedBodyDiagnostics {
  bodyLength: number;
  looksHtml: boolean;
  hasTitle: boolean;
  hasHebrewVoucherWord: boolean;
}

const TWENTY_DIGIT_CODE = /(?:^|[^\d])(\d{20})(?!\d)/g;

function collectTwentyDigitCodes(source: string): string[] {
  const found = new Set<string>();
  const pattern = new RegExp(TWENTY_DIGIT_CODE.source, 'g');
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(source)) !== null) {
    found.add(match[1]);
  }
  return [...found];
}

export function extractTwentyDigitCodes(html: string): string[] {
  const fromRaw = collectTwentyDigitCodes(html);
  if (fromRaw.length > 0) {
    return fromRaw;
  }
  return collectTwentyDigitCodes(html.replace(/<[^>]+>/g, ''));
}

export function extractTwentyDigitCode(html: string): string | null {
  const codes = extractTwentyDigitCodes(html);
  return codes.length === 1 ? codes[0] : null;
}

export function redactVoucherCodes(text: string): string {
  return text.replace(/\d{20}/g, '[CODE]');
}

export function describeFetchedBody(body: string): FetchedBodyDiagnostics {
  return {
    bodyLength: body.length,
    looksHtml: /<html[\s>]|<!doctype html/i.test(body),
    hasTitle: /<title[\s>]/i.test(body),
    hasHebrewVoucherWord: body.includes('שובר'),
  };
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
  if (typeof error !== 'object' || error === null || !('name' in error)) {
    return false;
  }
  return error.name === 'TimeoutError' || error.name === 'AbortError';
}

function readSetCookies(headers: Headers): string[] {
  if (typeof headers.getSetCookie === 'function') {
    return headers.getSetCookie();
  }
  const single = headers.get('set-cookie');
  return single ? [single] : [];
}

function storeCookies(store: Map<string, string>, setCookieHeaders: string[]): void {
  for (const header of setCookieHeaders) {
    const pair = header.split(';')[0] ?? '';
    const eq = pair.indexOf('=');
    if (eq <= 0) {
      continue;
    }
    const name = pair.slice(0, eq).trim();
    const value = pair.slice(eq + 1).trim();
    if (name) {
      store.set(name, value);
    }
  }
}

function cookieHeader(store: Map<string, string>): string | undefined {
  if (store.size === 0) {
    return undefined;
  }
  return [...store.entries()].map(([name, value]) => `${name}=${value}`).join('; ');
}

function requestHeaders(
  cookies: Map<string, string>,
  referer?: string,
): Record<string, string> {
  const headers: Record<string, string> = { ...BROWSER_HEADERS };
  const cookie = cookieHeader(cookies);
  if (cookie) {
    headers.Cookie = cookie;
  }
  if (referer) {
    headers.Referer = referer;
    headers['Sec-Fetch-Site'] = 'same-origin';
  }
  return headers;
}

function createDeadline(ms: number, parent?: AbortSignal): {
  signal: AbortSignal;
  dispose: () => void;
} {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, ms);

  const onParentAbort = (): void => {
    clearTimeout(timer);
    controller.abort();
  };

  if (parent) {
    if (parent.aborted) {
      clearTimeout(timer);
      controller.abort();
    } else {
      parent.addEventListener('abort', onParentAbort, { once: true });
    }
  }

  return {
    signal: controller.signal,
    dispose: () => {
      clearTimeout(timer);
      parent?.removeEventListener('abort', onParentAbort);
    },
  };
}

interface LoadedPage {
  status: number;
  headers: Headers;
  body: Uint8Array;
}

type PageLoader = (
  url: URL,
  headers: Record<string, string>,
  signal: AbortSignal,
) => Promise<LoadedPage>;

function isEmptyShell(body: string): boolean {
  return body.replace(/\s+/g, '') === '<html></html>';
}

/**
 * Fetch voucher page text via a public HTTPS reader. Only call with URLs that
 * already passed assertAllowedVoucherUrl (allowlisted HTTPS Pluxee host).
 */
export async function fetchViaTextReader(
  allowedUrl: URL,
  signal: AbortSignal,
): Promise<
  | { ok: true; body: string; status: number }
  | {
      ok: false;
      status: number;
      code: VoucherCodeErrorCode;
      message: string;
    }
> {
  if (allowedUrl.protocol !== 'https:' || allowedUrl.hostname !== ALLOWED_HOST) {
    return {
      ok: false,
      status: 403,
      code: 'host_not_allowed',
      message: 'Text reader fallback is limited to the allowlisted voucher host.',
    };
  }

  const readerUrl = `${TEXT_READER_PREFIX}${allowedUrl.href}`;
  try {
    const response = await fetch(readerUrl, {
      method: 'GET',
      redirect: 'follow',
      signal,
      headers: {
        Accept: 'text/plain,*/*;q=0.8',
        'User-Agent': BROWSER_HEADERS['User-Agent'],
      },
    });
    if (!response.ok) {
      return {
        ok: false,
        status: 502,
        code: 'fetch_failed',
        message: 'Could not read the voucher page via the text reader.',
      };
    }
    const buffer = await response.arrayBuffer();
    const slice =
      buffer.byteLength > MAX_BODY_BYTES
        ? buffer.slice(0, MAX_BODY_BYTES)
        : buffer;
    const body = new TextDecoder('utf-8', { fatal: false }).decode(slice);
    return { ok: true, body, status: response.status };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        ok: false,
        status: 504,
        code: 'timeout',
        message: 'Timed out while reading the voucher page.',
      };
    }
    return {
      ok: false,
      status: 502,
      code: 'fetch_failed',
      message: 'Could not reach the voucher page via the text reader.',
    };
  }
}

function headersFromNode(
  incoming: Record<string, string | string[] | undefined>,
): Headers {
  const headers = new Headers();
  for (const [key, value] of Object.entries(incoming)) {
    if (value === undefined) {
      continue;
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        headers.append(key, item);
      }
    } else {
      headers.append(key, value);
    }
  }
  return headers;
}

async function loadViaFetch(
  url: URL,
  headers: Record<string, string>,
  signal: AbortSignal,
): Promise<LoadedPage> {
  const response = await fetch(url, {
    method: 'GET',
    redirect: 'manual',
    signal,
    headers,
  });
  const buffer = await response.arrayBuffer();
  return {
    status: response.status,
    headers: response.headers,
    body: new Uint8Array(buffer),
  };
}

function loadViaHttpsIpv4(
  url: URL,
  headers: Record<string, string>,
  signal: AbortSignal,
): Promise<LoadedPage> {
  return new Promise((resolve, reject) => {
    const request = httpsRequest(
      {
        protocol: 'https:',
        hostname: ALLOWED_HOST,
        port: 443,
        path: `${url.pathname}${url.search}`,
        method: 'GET',
        family: 4,
        servername: ALLOWED_HOST,
        headers: {
          ...headers,
          Host: ALLOWED_HOST,
          Connection: 'close',
          'Accept-Encoding': 'identity',
        },
      },
      (incoming) => {
        const chunks: Buffer[] = [];
        incoming.on('data', (chunk: Buffer) => {
          chunks.push(chunk);
        });
        incoming.on('end', () => {
          resolve({
            status: incoming.statusCode ?? 0,
            headers: headersFromNode(incoming.headers),
            body: new Uint8Array(Buffer.concat(chunks)),
          });
        });
      },
    );

    const onAbort = (): void => {
      request.destroy();
      reject(Object.assign(new Error('Aborted'), { name: 'AbortError' }));
    };
    if (signal.aborted) {
      onAbort();
      return;
    }
    signal.addEventListener('abort', onAbort, { once: true });
    request.on('error', reject);
    request.setTimeout(FETCH_TIMEOUT_MS, () => {
      request.destroy();
      reject(Object.assign(new Error('Timeout'), { name: 'TimeoutError' }));
    });
    request.end();
  });
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
  loader: PageLoader,
): Promise<
  | {
      ok: true;
      body: string;
      finalPath: string;
      hasQuery: boolean;
      status: number;
      contentType: string | null;
      cookieNameCount: number;
    }
  | { ok: false; status: number; code: VoucherCodeErrorCode; message: string }
> {
  let current = start;
  let referer: string | undefined;
  const cookies = new Map<string, string>();

  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    let page: LoadedPage;
    try {
      page = await loader(current, requestHeaders(cookies, referer), signal);
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

    storeCookies(cookies, readSetCookies(page.headers));

    if (page.status >= 300 && page.status < 400) {
      const location = page.headers.get('location');
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

      // Pluxee sometimes issues an HTTP Location on the same allowlisted host.
      // The start URL is already HTTPS + allowlisted; upgrade that hop to HTTPS
      // instead of following plaintext HTTP. Off-host and other non-HTTPS
      // redirects are still refused.
      if (next.protocol === 'http:' && next.hostname === ALLOWED_HOST) {
        next.protocol = 'https:';
      }

      // Pluxee's 301 is often `/b/` (or http://host/b/) and drops the token
      // query. Keep the original allowlisted search string so the voucher
      // page is not fetched as an empty shell.
      if (!next.search && start.search) {
        next.search = start.search;
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

      referer = current.href;
      current = next;
      continue;
    }

    if (page.status < 200 || page.status >= 300) {
      return {
        ok: false,
        status: 502,
        code: 'fetch_failed',
        message: `The voucher page returned ${page.status}.`,
      };
    }

    const slice =
      page.body.byteLength > MAX_BODY_BYTES
        ? page.body.slice(0, MAX_BODY_BYTES)
        : page.body;
    const body = new TextDecoder('utf-8', { fatal: false }).decode(slice);
    if (isEmptyShell(body) && !current.search && start.search) {
      const retry = new URL(current.href);
      retry.search = start.search;
      referer = current.href;
      current = retry;
      continue;
    }
    return {
      ok: true,
      body,
      finalPath: current.pathname,
      hasQuery: Boolean(current.search),
      status: page.status,
      contentType: page.headers.get('content-type'),
      cookieNameCount: cookies.size,
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

  const deadline = createDeadline(FETCH_TIMEOUT_MS, request.signal);
  try {
    const preferIpv4 = Boolean(process.env.VERCEL);
    const primary = preferIpv4 ? loadViaHttpsIpv4 : loadViaFetch;
    const fallback = preferIpv4 ? loadViaFetch : loadViaHttpsIpv4;
    let via = preferIpv4 ? 'https-ipv4' : 'fetch';
    let fetched = await fetchSameHost(allowed.url, deadline.signal, primary);
    if (
      fetched.ok &&
      extractTwentyDigitCodes(fetched.body).length === 0 &&
      isEmptyShell(fetched.body)
    ) {
      via = preferIpv4 ? 'fetch' : 'https-ipv4';
      fetched = await fetchSameHost(allowed.url, deadline.signal, fallback);
    }
    if (!fetched.ok) {
      return jsonError(fetched.status, fetched.code, fetched.message);
    }

    let codes = extractTwentyDigitCodes(fetched.body);
    let resolvedVia = via;

    // Datacenter IPs often get an empty Pluxee shell; reader fallback still works.
    if (codes.length === 0) {
      console.info('voucher-code: trying_text_reader', {
        via,
        path: fetched.finalPath,
        hasQuery: fetched.hasQuery,
        ...describeFetchedBody(fetched.body),
      });
      const reader = await fetchViaTextReader(allowed.url, deadline.signal);
      if (reader.ok) {
        const readerCodes = extractTwentyDigitCodes(reader.body);
        if (readerCodes.length > 0) {
          codes = readerCodes;
          resolvedVia = 'text-reader';
        } else {
          console.info('voucher-code: code_not_found', {
            via: 'text-reader',
            status: reader.status,
            ...describeFetchedBody(reader.body),
            snippet: redactVoucherCodes(reader.body)
              .replace(/\s+/g, ' ')
              .slice(0, 160),
          });
        }
      } else {
        console.info('voucher-code: text_reader_failed', {
          code: reader.code,
          status: reader.status,
        });
      }
    }

    if (codes.length === 0) {
      console.info('voucher-code: code_not_found', {
        via: resolvedVia,
        path: fetched.finalPath,
        hasQuery: fetched.hasQuery,
        cookieNameCount: fetched.cookieNameCount,
        status: fetched.status,
        contentType: fetched.contentType,
        ...describeFetchedBody(fetched.body),
        snippet: redactVoucherCodes(fetched.body)
          .replace(/\s+/g, ' ')
          .slice(0, 160),
      });
      return jsonError(
        422,
        'code_not_found',
        'No 20-digit code was found on the page.',
      );
    }

    if (resolvedVia === 'text-reader') {
      console.info('voucher-code: scraped_via_text_reader', {
        codeCount: codes.length,
      });
    }

    return jsonOk(codes);
  } finally {
    deadline.dispose();
  }
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
