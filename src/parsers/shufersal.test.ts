import { describe, expect, it } from 'vitest';
import { parseSharedText, resolveParser } from './registry';
import { parseShufersalMessage, shufersalParser } from './shufersal';

const EXAMPLE = `היי Oren!
השובר שלך ל־שופרסל שלי סוקולוב - רמת השרון מחכה לך :) 
סכום: ₪50.00
נרכש ב־2026-08-08 
לצפייה ומימוש: https://myconsumers.pluxee.co.il/b?eyZzXraPfiObIv9Sd
לצפייה בתקנון: https://cibus.pluxee.co.il/terms/תקנון-שוברים-שופרסל`;

const TERMS_URL = 'https://cibus.pluxee.co.il/terms/תקנון-שוברים-שופרסל';
const VOUCHER_URL = 'https://myconsumers.pluxee.co.il/b?eyZzXraPfiObIv9Sd';

describe('shufersalParser.test', () => {
  it('matches the example Pluxee SMS', () => {
    expect(shufersalParser.test(EXAMPLE)).toBe(true);
  });

  it('rejects unrelated text', () => {
    expect(shufersalParser.test('Your Amazon order has shipped')).toBe(false);
  });

  it('rejects a terms-only Pluxee link without Shufersal content', () => {
    expect(shufersalParser.test(`See ${TERMS_URL}`)).toBe(false);
  });
});

describe('shufersalParser.parse', () => {
  it('extracts balance, purchase date, and the first myconsumers link', () => {
    const parsed = parseShufersalMessage(EXAMPLE);

    expect(parsed.companyName).toBe('Shufersal');
    expect(parsed.balance).toBe(50);
    expect(parsed.purchasedAt).toBe(Date.UTC(2026, 7, 8));
    expect(parsed.url).toBe(VOUCHER_URL);
    expect(parsed.barcodeFormat).toBe('code128');
    expect(parsed.url).not.toContain('cibus.pluxee.co.il');
  });

  it('parses amounts without agorot', () => {
    const parsed = parseShufersalMessage(
      `שופרסל\nסכום: ₪80\n${VOUCHER_URL}`,
    );
    expect(parsed.balance).toBe(80);
  });

  it('parses amounts with comma thousands separators', () => {
    const parsed = parseShufersalMessage(
      `שופרסל\nסכום: ₪1,250.50\n${VOUCHER_URL}`,
    );
    expect(parsed.balance).toBe(1250.5);
  });

  it('tolerates a regular hyphen in the purchase date', () => {
    const parsed = parseShufersalMessage(
      `שופרסל\nסכום: ₪50.00\nנרכש ב-2026-08-08\n${VOUCHER_URL}`,
    );
    expect(parsed.purchasedAt).toBe(Date.UTC(2026, 7, 8));
  });

  it('tolerates extra whitespace and a shekel sign after the amount', () => {
    const parsed = parseShufersalMessage(
      `שופרסל\nסכום:   ₪  50.00  \n${VOUCHER_URL}`,
    );
    expect(parsed.balance).toBe(50);
  });

  it('strips RTL/LTR marks embedded in the message', () => {
    const marked = EXAMPLE.replace('סכום', '\u200Fסכום\u200E').replace(
      '50.00',
      '\u202A50.00\u202C',
    );
    const parsed = parseShufersalMessage(marked);
    expect(parsed.balance).toBe(50);
    expect(parsed.url).toBe(VOUCHER_URL);
  });

  it('omits optional fields when they are missing', () => {
    const parsed = parseShufersalMessage(`השובר שלך ל־שופרסל\nסכום: ₪20`);
    expect(parsed.balance).toBe(20);
    expect(parsed.purchasedAt).toBeUndefined();
    expect(parsed.url).toBeUndefined();
  });

  it('does not pick up the terms link when it is the only URL', () => {
    const parsed = parseShufersalMessage(
      `שופרסל\nסכום: ₪50.00\n${TERMS_URL}`,
    );
    expect(parsed.url).toBeUndefined();
  });

  it('still finds the voucher URL when Chrome lifts it into a separate field', () => {
    const body = `היי Oren!\nהשובר שלך ל־שופרסל\nסכום: ₪50.00\nנרכש ב־2026-08-08`;
    const combined = [body, VOUCHER_URL].join('\n');
    const parsed = parseShufersalMessage(combined);
    expect(parsed.balance).toBe(50);
    expect(parsed.url).toBe(VOUCHER_URL);
  });
});

describe('parser registry', () => {
  it('resolves the Shufersal parser for the example message', () => {
    expect(resolveParser(EXAMPLE)?.id).toBe('shufersal-pluxee');
    const { parser, parsed } = parseSharedText(EXAMPLE);
    expect(parser?.id).toBe('shufersal-pluxee');
    expect(parsed.balance).toBe(50);
  });

  it('skips a disabled parser at resolution time', () => {
    expect(
      resolveParser(EXAMPLE, new Set(['shufersal-pluxee'])),
    ).toBeUndefined();
  });

  it('returns an empty draft when no parser matches', () => {
    const { parser, parsed } = parseSharedText('hello world');
    expect(parser).toBeUndefined();
    expect(parsed.companyName).toBe('');
    expect(parsed.barcodeFormat).toBe('none');
  });

  it('prefills a Pluxee URL even when no parser matches', () => {
    const { parser, parsed } = parseSharedText(VOUCHER_URL);
    expect(parser).toBeUndefined();
    expect(parsed.url).toBe(VOUCHER_URL);
  });
});
