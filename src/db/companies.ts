import { db } from './database';
import { EntityNotFoundError } from './errors';
import type { Company } from './schema';

export interface CompanyInput {
  name: string;
  color: string;
}

function requireName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error('Company name is required');
  }
  return trimmed;
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
  };

  await db.companies.put(next);
  return next;
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
