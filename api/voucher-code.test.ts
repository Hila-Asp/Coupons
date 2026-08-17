import { describe, expect, it } from 'vitest';
import {
  assertAllowedVoucherUrl,
  extractTwentyDigitCode,
  extractTwentyDigitCodes,
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
