import { describe, expect, it } from 'vitest';
import {
  buildAddressRegex,
  filterMessagesBySender,
  isNumericSender,
  israeliLocalSubscriber,
  senderMatches,
} from './smsSender';

const LOCAL = '0541234567';
const PLUS = '+972541234567';
const COUNTRY = '972541234567';

function regexFor(sender: string): RegExp {
  return new RegExp(buildAddressRegex(sender));
}

describe('isNumericSender', () => {
  it('accepts Israeli number forms and rejects names', () => {
    expect(isNumericSender(LOCAL)).toBe(true);
    expect(isNumericSender(PLUS)).toBe(true);
    expect(isNumericSender('054-123-4567')).toBe(true);
    expect(isNumericSender('PLUXEE')).toBe(false);
    expect(isNumericSender('BuyMe')).toBe(false);
    expect(isNumericSender('שופרסל')).toBe(false);
  });
});

describe('israeliLocalSubscriber', () => {
  it('strips 0 and 972 country prefixes', () => {
    expect(israeliLocalSubscriber('0541234567')).toBe('541234567');
    expect(israeliLocalSubscriber('972541234567')).toBe('541234567');
    expect(israeliLocalSubscriber('541234567')).toBe('541234567');
  });
});

describe('buildAddressRegex', () => {
  it('matches 054, 972, and +972 forms of the same mobile', () => {
    const pattern = regexFor(LOCAL);
    expect(pattern.test(LOCAL)).toBe(true);
    expect(pattern.test(PLUS)).toBe(true);
    expect(pattern.test(COUNTRY)).toBe(true);
    expect(pattern.test('0549999999')).toBe(false);
    expect(pattern.test('PLUXEE')).toBe(false);
  });

  it('uses an exact pattern for alphanumeric senders', () => {
    expect(buildAddressRegex('PLUXEE')).toBe('^PLUXEE$');
    expect(regexFor('PLUXEE').test('PLUXEE')).toBe(true);
    expect(regexFor('PLUXEE').test('pluxee')).toBe(false);
    expect(regexFor('BuyMe').test('BuyMe')).toBe(true);
  });
});

describe('senderMatches', () => {
  it('treats Israeli number variants as the same sender', () => {
    expect(senderMatches(PLUS, LOCAL)).toBe(true);
    expect(senderMatches(COUNTRY, LOCAL)).toBe(true);
    expect(senderMatches(LOCAL, PLUS)).toBe(true);
    expect(senderMatches('+972 54-123-4567', LOCAL)).toBe(true);
    expect(senderMatches('0549999999', LOCAL)).toBe(false);
  });

  it('matches alphanumeric senders case-insensitively', () => {
    expect(senderMatches('PLUXEE', 'pluxee')).toBe(true);
    expect(senderMatches('BuyMe', 'BuyMe')).toBe(true);
    expect(senderMatches('PLUXEE', 'BuyMe')).toBe(false);
    expect(senderMatches('שופרסל', 'שופרסל')).toBe(true);
  });
});

describe('filterMessagesBySender', () => {
  it('keeps only matching addresses', () => {
    const messages = [
      { address: PLUS, body: 'a' },
      { address: 'PLUXEE', body: 'b' },
      { address: LOCAL, body: 'c' },
    ];
    expect(filterMessagesBySender(messages, LOCAL).map((row) => row.body)).toEqual(
      ['a', 'c'],
    );
    expect(filterMessagesBySender(messages, 'pluxee').map((row) => row.body)).toEqual(
      ['b'],
    );
  });
});
