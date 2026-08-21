import { db } from './database';
import { EntityNotFoundError } from './errors';
import { senderMatches } from '../lib/smsSender';
import type { Company } from './schema';

export interface CompanyInput {
  name: string;
  color: string;
  smsSender?: string;
}

function requireName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error('Company name is required');
  }
  return trimmed;
}

function optionalTrim(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export async function listCompanies(): Promise<Company[]> {
  return db.companies.orderBy('name').toArray();
}

export async function getCompany(id: string): Promise<Company | undefined> {
  return db.companies.get(id);
}

export async function createCompany(input: CompanyInput): Promise<Company> {
  const now = Date.now();
  const company: Company = {
    id: crypto.randomUUID(),
    name: requireName(input.name),
    color: input.color,
    smsSender: optionalTrim(input.smsSender),
    createdAt: now,
  };
  await db.companies.add(company);
  return company;
}

export async function updateCompany(
  id: string,
  patch: Partial<CompanyInput>,
): Promise<Company> {
  const existing = await db.companies.get(id);
  if (!existing) {
    throw new EntityNotFoundError('Company', id);
  }

  const next: Company = {
    ...existing,
    name:
      patch.name === undefined ? existing.name : requireName(patch.name),
    color: patch.color ?? existing.color,
    smsSender:
      patch.smsSender === undefined
        ? existing.smsSender
        : optionalTrim(patch.smsSender),
  };

  await db.companies.put(next);
  return next;
}

/**
 * The sender a company's coupons arrive from, so the import form can offer it
 * instead of asking for the number again.
 */
export function findCompanyBySmsSender(
  companies: readonly Company[] | undefined,
  sender: string,
): Company | undefined {
  const needle = sender.trim();
  if (!needle || !companies) {
    return undefined;
  }
  return companies.find(
    (company) => company.smsSender && senderMatches(company.smsSender, needle),
  );
}

export function companiesWithSmsSender(
  companies: readonly Company[] | undefined,
): Company[] {
  return (companies ?? []).filter((company) => Boolean(company.smsSender));
}

/** Remembers the sender used for an inbox import so it is prefilled next time. */
export async function rememberCompanySmsSender(
  companyId: string,
  sender: string,
): Promise<void> {
  const trimmed = sender.trim();
  if (!trimmed) {
    return;
  }
  const existing = await db.companies.get(companyId);
  if (!existing || existing.smsSender === trimmed) {
    return;
  }
  await db.companies.put({ ...existing, smsSender: trimmed });
}

export async function deleteCompany(id: string): Promise<void> {
  const existing = await db.companies.get(id);
  if (!existing) {
    throw new EntityNotFoundError('Company', id);
  }

  await db.transaction('rw', db.companies, db.vouchers, async () => {
    await db.vouchers.where('companyId').equals(id).delete();
    await db.companies.delete(id);
  });
}
