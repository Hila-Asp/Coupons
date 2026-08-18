import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  assertAllowedVoucherUrl,
  describeFetchedBody,
  extractTwentyDigitCode,
  extractTwentyDigitCodes,
  POST,
  redactVoucherCodes,
} from './voucher-code';

describe('assertAllowedVoucherUrl', () => {
  it('accepts an exact myconsumers.pluxee.co.il HTTPS URL', () => {
    const result = assertAllowedVoucherUrl(
      'https://myconsumers.pluxee.co.il/b?eyZzXraPfiObIv9Sd',
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.url.hostname).toBe('myconsumers.pluxee.co.il');
    }
  });

  it('rejects the terms host even though it is also Pluxee', () => {
    const result = assertAllowedVoucherUrl(
      'https://cibus.pluxee.co.il/terms/תקנון-שוברים-שופרסל',
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('host_not_allowed');
    }
  });

  it('rejects a lookalike host that merely contains the allowed name', () => {
    const result = assertAllowedVoucherUrl(
      'https://evil-myconsumers.pluxee.co.il.example/b?x',
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('host_not_allowed');
    }
  });

  it('rejects http', () => {
    const result = assertAllowedVoucherUrl(
      'http://myconsumers.pluxee.co.il/b?token',
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('https_required');
    }
  });

  it('rejects an unparseable string', () => {
    const result = assertAllowedVoucherUrl('not a url');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('invalid_url');
    }
  });
});

describe('extractTwentyDigitCodes', () => {
  it('returns a single isolated 20-digit run', () => {
    expect(
      extractTwentyDigitCodes('<div>code: 12345678901234567890 thank you</div>'),
    ).toEqual(['12345678901234567890']);
  });

  it('returns every distinct 20-digit candidate', () => {
    expect(
      extractTwentyDigitCodes(
        '<div>code: 12345678901234567890 thank you 00001111222233334444 and 12345678901234567890</div>',
      ),
    ).toEqual(['12345678901234567890', '00001111222233334444']);
  });

  it('ignores longer digit runs', () => {
    expect(extractTwentyDigitCodes('123456789012345678901')).toEqual([]);
  });

  it('returns an empty list when nothing matches', () => {
    expect(extractTwentyDigitCodes('<html>no code here</html>')).toEqual([]);
  });

  it('joins a 20-digit run split across tags', () => {
    expect(
      extractTwentyDigitCodes(
        '<span>1234567890</span><span>1234567890</span>',
      ),
    ).toEqual(['12345678901234567890']);
  });
});

describe('redactVoucherCodes', () => {
  it('replaces 20-digit runs so logs never contain a full code', () => {
    expect(redactVoucherCodes('שובר 12345678901234567890')).toBe('שובר [CODE]');
  });
});

describe('describeFetchedBody', () => {
  it('flags a small HTML voucher page without exposing digits', () => {
    const html =
      '<!DOCTYPE html><html><head><title>שובר 12345678901234567890</title></head></html>';
    expect(describeFetchedBody(html)).toEqual({
      bodyLength: html.length,
      looksHtml: true,
      hasTitle: true,
      hasHebrewVoucherWord: true,
    });
  });
});

describe('extractTwentyDigitCode', () => {
  it('returns the code when it is unambiguous', () => {
    expect(extractTwentyDigitCode('code 12345678901234567890')).toBe(
      '12345678901234567890',
    );
  });

  it('returns null when several distinct candidates exist', () => {
    expect(
      extractTwentyDigitCode(
        '12345678901234567890 and 00001111222233334444',
      ),
    ).toBeNull();
  });

  it('returns null when nothing matches', () => {
    expect(extractTwentyDigitCode('<html>no code here</html>')).toBeNull();
  });
});

const START_URL = 'https://myconsumers.pluxee.co.il/b?token';
const VOUCHER_HTML = '<div>code: 12345678901234567890 thank you</div>';

function voucherRequest(url: string): Request {
  return new Request('http://localhost/api/voucher-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
}

function hrefOf(input: RequestInfo | URL): string {
  if (typeof input === 'string') {
    return input;
  }
  if (input instanceof URL) {
    return input.href;
  }
  return input.url;
}

describe('POST voucher-code fetchSameHost redirects', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('upgrades an HTTP same-host redirect to HTTPS and succeeds', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const href = hrefOf(input);
      if (href === START_URL) {
        return new Response(null, {
          status: 302,
          headers: {
            Location: 'http://myconsumers.pluxee.co.il/voucher',
          },
        });
      }
      if (href === 'https://myconsumers.pluxee.co.il/voucher?token') {
        return new Response(VOUCHER_HTML, { status: 200 });
      }
      throw new Error(`unexpected fetch: ${href}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    const response = await POST(voucherRequest(START_URL));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      code: '12345678901234567890',
      codes: ['12345678901234567890'],
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(hrefOf(fetchMock.mock.calls[1][0] as RequestInfo | URL)).toBe(
      'https://myconsumers.pluxee.co.il/voucher?token',
    );
  });

  it('refuses an HTTP redirect to a different host', async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(null, {
        status: 302,
        headers: { Location: 'http://evil.example/steal' },
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    const response = await POST(voucherRequest(START_URL));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toMatchObject({
      ok: false,
      error: {
        code: 'redirect_blocked',
        message: 'Refusing to follow a non-HTTPS redirect.',
      },
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('fetches a same-host HTTPS page with no redirect', async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(VOUCHER_HTML, { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);

    const response = await POST(voucherRequest(START_URL));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      code: '12345678901234567890',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('sends browser-like headers including Hebrew Accept-Language', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      expect(headers.get('accept-language')).toContain('he-IL');
      expect(headers.get('user-agent') ?? '').toContain('Chrome/');
      expect(headers.get('accept') ?? '').toContain('text/html');
      return new Response(VOUCHER_HTML, { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);

    const response = await POST(voucherRequest(START_URL));
    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('restores a dropped token query on a same-host slash redirect', async () => {
    const startWithToken = 'https://myconsumers.pluxee.co.il/b?eI4I7h1vkL9RFkT6u';
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const href = hrefOf(input);
      if (href === startWithToken) {
        return new Response(null, {
          status: 301,
          headers: {
            Location: 'http://myconsumers.pluxee.co.il/b/',
          },
        });
      }
      if (href === 'https://myconsumers.pluxee.co.il/b/?eI4I7h1vkL9RFkT6u') {
        return new Response(VOUCHER_HTML, { status: 200 });
      }
      throw new Error(`unexpected fetch: ${href}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    const response = await POST(voucherRequest(startWithToken));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      code: '12345678901234567890',
    });
    expect(hrefOf(fetchMock.mock.calls[1][0] as RequestInfo | URL)).toBe(
      'https://myconsumers.pluxee.co.il/b/?eI4I7h1vkL9RFkT6u',
    );
  });

  it('forwards Set-Cookie from a redirect onto the next same-host hop', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const href = hrefOf(input);
      if (href === START_URL) {
        return new Response(null, {
          status: 302,
          headers: {
            Location: 'http://myconsumers.pluxee.co.il/voucher',
            'Set-Cookie': 'lbsessid=abc123; Path=/',
          },
        });
      }
      if (href === 'https://myconsumers.pluxee.co.il/voucher?token') {
        const headers = new Headers(init?.headers);
        expect(headers.get('cookie')).toContain('lbsessid=abc123');
        expect(headers.get('referer')).toBe(START_URL);
        return new Response(VOUCHER_HTML, { status: 200 });
      }
      throw new Error(`unexpected fetch: ${href}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    const response = await POST(voucherRequest(START_URL));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      code: '12345678901234567890',
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('falls back to the text reader when the direct page has no code', async () => {
    const encodedReader = `https://r.jina.ai/${encodeURIComponent(START_URL)}`;
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const href = hrefOf(input);
      if (href === encodedReader) {
        return new Response(
          'Title: שובר 12345678901234567890\n\n12345678901234567890\n',
          { status: 200 },
        );
      }
      if (href === START_URL) {
        return new Response('<html><body>blocked</body></html>', {
          status: 200,
        });
      }
      throw new Error(`unexpected fetch: ${href}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    const response = await POST(voucherRequest(START_URL));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      code: '12345678901234567890',
      codes: ['12345678901234567890'],
    });
    expect(hrefOf(fetchMock.mock.calls[1][0] as RequestInfo | URL)).toBe(
      encodedReader,
    );
  });
});
