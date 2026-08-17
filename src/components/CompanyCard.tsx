import { Link } from 'react-router-dom';
import type { Company, Voucher } from '../db';
import { formatShekel } from '../lib/money';
import { remainingStats } from '../lib/voucherStats';
import { Card } from '../ui';

export interface CompanyCardProps {
  company: Company;
  vouchers: readonly Voucher[];
}

export function CompanyCard({ company, vouchers }: CompanyCardProps) {
  const { count, total } = remainingStats(vouchers);
  const countLabel = count === 1 ? '1 voucher' : `${count} vouchers`;

  return (
    <li>
      <Link
        to={`/company/${company.id}`}
        className="block rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <Card interactive className="flex items-center gap-4">
          <span
            className="size-11 shrink-0 rounded-md"
            style={{ backgroundColor: company.color }}
            aria-hidden="true"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold tracking-tight text-ink">
              {company.name}
            </p>
            <p className="mt-0.5 text-sm text-muted">
              {countLabel}
              <span className="mx-1.5 text-line-strong">·</span>
              {formatShekel(total)}
            </p>
          </div>
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            className="shrink-0 text-muted"
            aria-hidden="true"
          >
            <path
              d="M6 3.5 11 8 6 12.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Card>
      </Link>
    </li>
  );
}
