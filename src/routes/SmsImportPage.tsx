import { useNavigate } from 'react-router-dom';
import { findCompanyBySmsSender, useCompanies } from '../db';
import { usePageTitle } from '../layout/usePageTitle';
import { assertNever } from '../lib/assertNever';
import { SmsImportForm } from '../share/SmsImportForm';
import { SmsImportResults } from '../share/SmsImportResults';
import { defaultCompanyNameFromRows } from '../share/smsImportClassify';
import { useSmsImportFlow } from '../share/useSmsImportFlow';
import { Banner, Button, Card, EmptyState } from '../ui';

export function SmsImportPage() {
  usePageTitle('Import SMS');
  const navigate = useNavigate();
  const companies = useCompanies();
  const { phase, loadMessages, toggleRow, importSelected, backToForm } =
    useSmsImportFlow();

  switch (phase.kind) {
    case 'unavailable':
      return (
        <EmptyState
          title="Android APK only"
          description="SMS inbox import runs in the sideloaded Android app. On the web, share one voucher message at a time."
          action={
            <Button variant="secondary" fullWidth onClick={() => navigate('/')}>
              Back to vouchers
            </Button>
          }
        />
      );
    case 'form':
      return (
        <SmsImportForm
          companies={companies}
          onSubmit={(sender, since) => void loadMessages(sender, since)}
        />
      );
    case 'permission':
      return (
        <StatusBlock
          title="SMS permission"
          body="Waiting for access to read inbox messages on this device."
        />
      );
    case 'loading':
      return (
        <StatusBlock
          title="Reading inbox"
          body="Loading messages from that sender. This stays on your phone."
        />
      );
    case 'review':
      return (
        <SmsImportResults
          items={phase.items}
          companies={companies}
          suggestedCompany={defaultCompanyNameFromRows(phase.items)}
          senderCompanyId={
            findCompanyBySmsSender(companies, phase.sender)?.id
          }
          onToggle={toggleRow}
          onImport={(companyId) => importSelected(companyId)}
        />
      );
    case 'saving':
      return (
        <StatusBlock
          title="Saving coupons"
          body={`Looking up codes and saving ${phase.current} of ${phase.total}. You can keep the URL if a lookup fails.`}
        />
      );
    case 'done':
      return <SmsImportDone imported={phase.imported} skipped={phase.skipped} />;
    case 'denied':
      return (
        <div className="flex flex-col gap-4">
          <Banner tone="warning" title="SMS access was denied">
            Enable it in Settings → Apps → Voucher Manager → Permissions. You can
            still share one message to this app.
          </Banner>
          <Button fullWidth onClick={backToForm}>
            Try again
          </Button>
          <Button variant="secondary" fullWidth onClick={() => navigate('/')}>
            Back to vouchers
          </Button>
        </div>
      );
    case 'error':
      return (
        <div className="flex flex-col gap-4">
          <Banner tone="danger" title="Import failed">
            {phase.message}
          </Banner>
          <Button fullWidth onClick={backToForm}>
            Back to form
          </Button>
        </div>
      );
    default:
      return assertNever(phase);
  }
}

function StatusBlock({ title, body }: { title: string; body: string }) {
  return (
    <div
      className="flex flex-col gap-4"
      aria-busy="true"
      aria-live="polite"
      aria-label={title}
    >
      <Card>
        <div className="flex items-start gap-3">
          <span
            className="mt-0.5 size-5 shrink-0 animate-spin rounded-full border-2 border-accent border-t-transparent motion-reduce:animate-none"
            aria-hidden="true"
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-ink">{title}</p>
            <p className="mt-1 text-sm text-muted">{body}</p>
          </div>
        </div>
      </Card>
      <div className="h-28 animate-pulse rounded-lg bg-surface-hover motion-reduce:animate-none" />
    </div>
  );
}

function SmsImportDone({
  imported,
  skipped,
}: {
  imported: number;
  skipped?: number;
}) {
  const navigate = useNavigate();
  const title = `Imported ${imported} coupon${imported === 1 ? '' : 's'}`;
  const body =
    skipped !== undefined && skipped > 0
      ? `${skipped} skipped because a code or amount was missing after lookup.`
      : 'Added to your wallet on this device.';
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
        {title}
      </h2>
      <p className="mt-2 text-sm text-muted">{body}</p>
      <div className="mt-8 flex w-full max-w-xs flex-col gap-2">
        <Button fullWidth size="lg" onClick={() => navigate('/')}>
          Done
        </Button>
      </div>
    </div>
  );
}
