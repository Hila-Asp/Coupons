import { useNavigate } from 'react-router-dom';
import type { Company, Voucher } from '../db';
import { Button, Card, EmptyState } from '../ui';
import { formatIls } from './formatIls';

export function ImportEmpty() {
  const navigate = useNavigate();

  return (
    <EmptyState
      title="Nothing shared"
      description="Share a voucher SMS to this app to review and import it. Nothing is saved until you confirm."
      action={
        <Button variant="secondary" fullWidth onClick={() => navigate('/')}>
          Back to vouchers
        </Button>
      }
    />
  );
}

export function ImportPreparing() {
  return (
    <div
      className="flex flex-col gap-4"
      aria-busy="true"
      aria-live="polite"
      aria-label="Reading shared message"
    >
      <div className="h-20 animate-pulse rounded-lg bg-surface-hover motion-reduce:animate-none" />
      <div className="h-40 animate-pulse rounded-lg bg-surface-hover motion-reduce:animate-none" />
      <div className="h-28 animate-pulse rounded-lg bg-surface-hover motion-reduce:animate-none" />
    </div>
  );
}

export function ImportDuplicate({
  voucher,
  company,
}: {
  voucher?: Voucher;
  company?: Company;
}) {
  const navigate = useNavigate();
  const destination = voucher ? `/company/${voucher.companyId}` : '/';

  return (
    <div className="flex flex-col gap-4">
      <EmptyState
        title="Already imported"
        description="This message is already in your wallet. Nothing new was saved."
        icon={
          <div className="flex size-12 items-center justify-center rounded-lg border border-line bg-warning-soft text-warning">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="8.25" stroke="currentColor" strokeWidth="1.5" />
              <path
                d="M12 8v4.5M12 16.25h.01"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
        }
      />
      {voucher ? (
        <Card>
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            {company?.name ?? 'Voucher'}
          </p>
          <p className="mt-1 font-mono text-lg tracking-wide text-ink">{voucher.code}</p>
          <p className="mt-2 text-sm text-muted">
            {formatIls(voucher.balance)} remaining
          </p>
        </Card>
      ) : null}
      <div className="flex flex-col gap-2">
        <Button fullWidth size="lg" onClick={() => navigate(destination)}>
          {voucher ? 'View voucher' : 'Back to vouchers'}
        </Button>
        {voucher ? (
          <Button variant="secondary" fullWidth onClick={() => navigate('/')}>
            Home
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export function ImportSuccess({
  companyName,
  balance,
  companyId,
}: {
  companyName: string;
  balance: number;
  companyId: string;
}) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center px-2 pt-6 text-center">
      <div
        className="flex size-14 items-center justify-center rounded-full bg-success-soft text-success shadow-[var(--shadow-sm)]"
        aria-hidden="true"
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          <path
            d="M6.5 12.5 10 16l7.5-8"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <h2 className="mt-5 text-2xl font-semibold tracking-tight text-ink">
        Voucher saved
      </h2>
      <p className="mt-2 text-lg tabular-nums text-ink">{formatIls(balance)}</p>
      <p className="mt-1 text-sm text-muted">Added to {companyName}</p>
      <div className="mt-8 flex w-full max-w-xs flex-col gap-2">
        <Button fullWidth size="lg" onClick={() => navigate(`/company/${companyId}`)}>
          View in folder
        </Button>
        <Button variant="secondary" fullWidth onClick={() => navigate('/')}>
          Done
        </Button>
      </div>
    </div>
  );
}
