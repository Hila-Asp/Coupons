import { describe, expect, it } from 'vitest';
import { formatReceivedLabel, startOfDayFromDateInput } from './dates';

const AUG_20_2026 = new Date(2026, 7, 20, 17, 33).getTime();
const DEC_02_2025 = new Date(2025, 11, 2, 9, 5).getTime();

describe('formatReceivedLabel', () => {
  it('omits the year while it matches the current one', () => {
    expect(formatReceivedLabel(AUG_20_2026, AUG_20_2026)).toBe('Received 20 Aug');
  });

  it('keeps the year for older messages', () => {
    expect(formatReceivedLabel(DEC_02_2025, AUG_20_2026)).toBe(
      'Received 2 Dec 2025',
    );
  });
});

describe('startOfDayFromDateInput', () => {
  it('returns local midnight for a date input value', () => {
    expect(startOfDayFromDateInput('2026-08-20')).toBe(
      new Date(2026, 7, 20).getTime(),
    );
  });

  it('returns undefined for blank or malformed input', () => {
    expect(startOfDayFromDateInput('')).toBeUndefined();
    expect(startOfDayFromDateInput('not-a-date')).toBeUndefined();
  });
});
