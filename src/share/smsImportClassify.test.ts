import { describe, expect, it } from 'vitest';
import {
  classifySmsImportRow,
  defaultCompanyNameFromRows,
  selectedSmsRowCount,
  smsBodySnippet,
  toggleSmsRowSelection,
} from './smsImportClassify';

const PLUXEE_URL = 'https://myconsumers.pluxee.co.il/b?abc';

describe('classifySmsImportRow', () => {
  it('selects parser matches as ready', () => {
    const row = classifySmsImportRow({
      matched: true,
      alreadyImported: false,
      body: 'שופרסל סכום: ₪50',
      parsed: { balance: 50, url: PLUXEE_URL },
    });
    expect(row).toEqual({ badge: 'ready', selected: true, disabled: false });
  });

  it('selects unmatched Pluxee URLs as ready', () => {
    const row = classifySmsImportRow({
      matched: false,
      alreadyImported: false,
      body: PLUXEE_URL,
      parsed: { url: PLUXEE_URL },
    });
    expect(row.badge).toBe('ready');
    expect(row.selected).toBe(true);
  });

  it('leaves duplicates unchecked and disabled', () => {
    const row = classifySmsImportRow({
      matched: true,
      alreadyImported: true,
      body: 'שופרסל',
      parsed: { balance: 50, url: PLUXEE_URL },
    });
    expect(row).toEqual({
      badge: 'duplicate',
      selected: false,
      disabled: true,
    });
  });

  it('marks voucher-like text without a parser as needs review', () => {
    const row = classifySmsImportRow({
      matched: false,
      alreadyImported: false,
      body: 'יש לך שובר על סכום 80',
      parsed: { balance: 80 },
    });
    expect(row).toEqual({
      badge: 'needs_review',
      selected: false,
      disabled: false,
    });
  });

  it('skips unrelated messages as no voucher', () => {
    const row = classifySmsImportRow({
      matched: false,
      alreadyImported: false,
      body: 'Your package is on the way',
      parsed: {},
    });
    expect(row).toEqual({
      badge: 'no_voucher',
      selected: false,
      disabled: false,
    });
  });
});

describe('toggleSmsRowSelection', () => {
  const rows = [
    { id: 'ready', selected: true, disabled: false },
    { id: 'dup', selected: false, disabled: true },
    { id: 'skip', selected: false, disabled: false },
  ];

  it('toggles a ready row off', () => {
    const next = toggleSmsRowSelection(rows, 'ready');
    expect(next.find((row) => row.id === 'ready')?.selected).toBe(false);
  });

  it('does not select a duplicate', () => {
    const next = toggleSmsRowSelection(rows, 'dup');
    expect(next.find((row) => row.id === 'dup')?.selected).toBe(false);
  });

  it('can select a non-voucher for import', () => {
    const next = toggleSmsRowSelection(rows, 'skip');
    expect(next.find((row) => row.id === 'skip')?.selected).toBe(true);
  });
});

describe('selectedSmsRowCount', () => {
  it('counts selected rows only', () => {
    expect(
      selectedSmsRowCount([
        { selected: true },
        { selected: false },
        { selected: true },
      ]),
    ).toBe(2);
  });
});

describe('smsBodySnippet', () => {
  it('collapses whitespace and truncates', () => {
    expect(smsBodySnippet('hello\nworld')).toBe('hello world');
    expect(smsBodySnippet('x'.repeat(200)).endsWith('…')).toBe(true);
    expect(smsBodySnippet('x'.repeat(200)).length).toBe(120);
  });
});

describe('defaultCompanyNameFromRows', () => {
  it('prefers a ready parser company, else Shufersal', () => {
    expect(
      defaultCompanyNameFromRows([
        { badge: 'no_voucher', parsed: { companyName: '' } },
        { badge: 'ready', parsed: { companyName: 'Shufersal' } },
      ]),
    ).toBe('Shufersal');
    expect(defaultCompanyNameFromRows([])).toBe('Shufersal');
  });
});
