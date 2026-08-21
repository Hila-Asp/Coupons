import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  deleteCompany,
  deleteUsedVouchersByCompany,
  isUsedVoucher,
  useCompanies,
  useCompany,
  useVouchersByCompany,
} from '../db';
import { AddFab } from '../components/AddFab';
import { CardSkeletonList } from '../components/PageSpinner';
import { ConfirmSheet } from '../components/ConfirmSheet';
import { Toggle } from '../components/Toggle';
import { VoucherCard } from '../components/VoucherCard';
import { VoucherFlow } from '../components/VoucherFlow';
import { formatShekel } from '../lib/money';
import { remainingStats } from '../lib/voucherStats';
import { usePageTitle } from '../layout/usePageTitle';
import { Button, EmptyState, useToast } from '../ui';

export function CompanyPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const companies = useCompanies();
  const company = useCompany(id);
  const vouchers = useVouchersByCompany(id);
  const [showUsed, setShowUsed] = useState(false);
  const [confirmDeleteFolder, setConfirmDeleteFolder] = useState(false);
  const [confirmDeleteUsed, setConfirmDeleteUsed] = useState(false);
  const [deleting, setDeleting] = useState(false);

  usePageTitle(company?.name);

  const visible = useMemo(() => {
    if (!vouchers) {
      return [];
    }
    return vouchers.filter((voucher) =>
      showUsed ? isUsedVoucher(voucher) : !isUsedVoucher(voucher),
    );
  }, [vouchers, showUsed]);

  if (!id) {
    return (
      <EmptyState
        title="Missing company"
        description="This folder link is incomplete."
      />
    );
  }

  if (vouchers === undefined || companies === undefined) {
    return <CardSkeletonList />;
  }

  if (!company) {
    return (
      <EmptyState
        title="Company not found"
        description="This folder may have been deleted."
        action={
          <Button fullWidth onClick={() => navigate('/')}>
            Back home
          </Button>
        }
      />
    );
  }

  const { count, total } = remainingStats(vouchers);
  const usedCount = vouchers.filter(isUsedVoucher).length;

  return (
    <VoucherFlow companies={companies} defaultCompanyId={company.id}>
      {(api) => (
        <div className="flex flex-col gap-5 pb-24">
          <section className="flex items-start gap-4">
            <span
              className="mt-0.5 size-11 shrink-0 rounded-md"
              style={{ backgroundColor: company.color }}
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1">
              <p className="text-2xl font-semibold tracking-tight text-ink">
                {formatShekel(total)}
              </p>
              <p className="mt-1 text-sm text-muted">
                {count === 1 ? '1 open voucher' : `${count} open vouchers`}
                {usedCount > 0 ? ` · ${usedCount} used` : ''}
              </p>
            </div>
          </section>

          <div className="flex w-full min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
            <p className="min-w-0 flex-1 truncate text-sm text-muted">
              {showUsed
                ? usedCount === 1
                  ? '1 used voucher'
                  : `${usedCount} used vouchers`
                : count === 1
                  ? '1 open'
                  : `${count} open`}
            </p>
            <Toggle
              checked={showUsed}
              onChange={setShowUsed}
              label="Used"
            />
          </div>

          {visible.length === 0 ? (
            <EmptyState
              title={showUsed ? 'No used vouchers' : 'No open vouchers'}
              description={
                showUsed
                  ? 'Used and zero-balance vouchers will appear here.'
                  : 'Add a voucher to this folder, or turn on Used to see spent ones.'
              }
              action={
                showUsed ? undefined : (
                  <Button fullWidth onClick={() => api.openCreate(company.id)}>
                    Add voucher
                  </Button>
                )
              }
            />
          ) : (
            <ul className="flex flex-col gap-3">
              {visible.map((voucher) => (
                <VoucherCard
                  key={voucher.id}
                  voucher={voucher}
                  onOpen={() => api.openDetail(voucher.id)}
                  onMarkUsed={() => void api.markUsed(voucher.id)}
                  onUpdateBalance={() => api.openBalance(voucher)}
                  onDelete={() => api.confirmDelete(voucher)}
                />
              ))}
            </ul>
          )}

          <div className="flex flex-col gap-2 pt-2">
            <Button
              variant="ghost"
              fullWidth
              onClick={() => api.openEditCompany(company)}
            >
              Edit folder
            </Button>
            {showUsed && usedCount > 0 ? (
              <Button
                variant="ghost"
                fullWidth
                className="text-danger hover:bg-danger-soft"
                onClick={() => setConfirmDeleteUsed(true)}
              >
                {usedCount === 1
                  ? 'Delete 1 used voucher'
                  : `Delete ${usedCount} used vouchers`}
              </Button>
            ) : null}
            <Button
              variant="ghost"
              fullWidth
              className="text-danger hover:bg-danger-soft"
              onClick={() => setConfirmDeleteFolder(true)}
            >
              Delete folder
            </Button>
          </div>

          <AddFab onClick={() => api.openCreate(company.id)} />

          <ConfirmSheet
            open={confirmDeleteUsed}
            onClose={() => setConfirmDeleteUsed(false)}
            title="Delete used vouchers?"
            description={`This permanently removes ${usedCount === 1 ? 'the used voucher' : `all ${usedCount} used vouchers`} in ${company.name}. Open vouchers are kept.`}
            confirmLabel="Delete used"
            destructive
            loading={deleting}
            onConfirm={() => {
              void (async () => {
                setDeleting(true);
                try {
                  const removed = await deleteUsedVouchersByCompany(company.id);
                  toast(
                    removed === 1
                      ? '1 used voucher deleted'
                      : `${removed} used vouchers deleted`,
                    { tone: 'success' },
                  );
                  setConfirmDeleteUsed(false);
                  setShowUsed(false);
                } catch {
                  toast('Could not delete used vouchers', { tone: 'danger' });
                } finally {
                  setDeleting(false);
                }
              })();
            }}
          />

          <ConfirmSheet
            open={confirmDeleteFolder}
            onClose={() => setConfirmDeleteFolder(false)}
            title="Delete folder?"
            description="This deletes the company and every voucher inside it. You cannot undo this."
            confirmLabel="Delete folder"
            destructive
            loading={deleting}
            onConfirm={() => {
              void (async () => {
                setDeleting(true);
                try {
                  await deleteCompany(company.id);
                  toast('Folder deleted', { tone: 'success' });
                  navigate('/');
                } catch {
                  toast('Could not delete folder', { tone: 'danger' });
                  setDeleting(false);
                }
              })();
            }}
          />
        </div>
      )}
    </VoucherFlow>
  );
}
