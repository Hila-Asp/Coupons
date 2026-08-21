import { describe, expect, it } from 'vitest';
import { companiesWithSmsSender, findCompanyBySmsSender } from './companies';
import type { Company } from './schema';

function company(partial: Partial<Company> & { id: string }): Company {
  return {
    name: partial.id,
    color: '#0f6e56',
    createdAt: 1,
    ...partial,
  };
}

const shufersal = company({ id: 'shufersal', smsSender: '0541234567' });
const pluxee = company({ id: 'pluxee', smsSender: 'PLUXEE' });
const manual = company({ id: 'manual' });
const companies = [shufersal, pluxee, manual];

describe('findCompanyBySmsSender', () => {
  it('matches Israeli number variants of a saved sender', () => {
    expect(findCompanyBySmsSender(companies, '+972541234567')).toBe(shufersal);
    expect(findCompanyBySmsSender(companies, '054-123-4567')).toBe(shufersal);
  });

  it('matches alphanumeric senders case-insensitively', () => {
    expect(findCompanyBySmsSender(companies, 'pluxee')).toBe(pluxee);
  });

  it('returns nothing for unknown senders, blanks, or missing companies', () => {
    expect(findCompanyBySmsSender(companies, '0549999999')).toBeUndefined();
    expect(findCompanyBySmsSender(companies, '   ')).toBeUndefined();
    expect(findCompanyBySmsSender(undefined, '0541234567')).toBeUndefined();
  });
});

describe('companiesWithSmsSender', () => {
  it('keeps only companies that remembered a sender', () => {
    expect(companiesWithSmsSender(companies)).toEqual([shufersal, pluxee]);
    expect(companiesWithSmsSender(undefined)).toEqual([]);
  });
});
