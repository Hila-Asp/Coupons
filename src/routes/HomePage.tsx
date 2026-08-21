import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { isSmsInboxAvailable } from '../capacitor/smsInbox';
import { isUsedVoucher, useCompanies, useVouchers } from '../db';
import { CardSkeletonList } from '../components/PageSpinner';
import { CompanyCard } from '../components/CompanyCard';
import { ExpandingFab } from '../components/ExpandingFab';
import { ExpiryBanner } from '../components/ExpiryBanner';
import { VoucherCard } from '../components/VoucherCard';
import { VoucherFlow } from '../components/VoucherFlow';
import { VoucherSortControl } from '../components/VoucherSortControl';
import { useVoucherSort } from '../hooks/useVoucherSort';
import { listRelevantExpiries } from '../lib/expiry';
import { sortVouchers } from '../lib/sortVouchers';
import { Button, EmptyState, SegmentedControl } from '../ui';

const HOME_VIEWS = [
  { value: 'folders', label: 'Folders' },
  { value: 'all', label: 'All vouchers' },
] as const;

type HomeView = (typeof HOME_VIEWS)[number]['value'];

export function HomePage() {
  const navigate = useNavigate();
  const companies = useCompanies();
  const vouchers = useVouchers();
  const [view, setView] = useState<HomeView>('folders');
  const [fabOpen, setFabOpen] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const { field, direction, setField, setDirection } = useVoucherSort();
  const smsInboxAvailable = isSmsInboxAvailable();

  const openVouchers = useMemo(() => {
    if (!vouchers) {
      return [];
    }
    return sortVouchers(
      vouchers.filter((voucher) => !isUsedVoucher(voucher)),
      field,
      direction,
    );
  }, [vouchers, field, direction]);

  if (companies === undefined || vouchers === undefined) {
    return (
      <div className="flex flex-col gap-4">
        <div className="h-11 animate-pulse rounded-md border border-line bg-surface" />
        <CardSkeletonList />
      </div>
    );
  }

  const companyById = new Map(companies.map((company) => [company.id, company]));
  const expiring = listRelevantExpiries(vouchers);

  return (
    <VoucherFlow companies={companies}>
      {(api) => (
        <div className="flex flex-col gap-4 pb-24">
          {!bannerDismissed && expiring.length > 0 ? (
            <ExpiryBanner
              vouchers={expiring}
              companies={companies}
              onDismiss={() => setBannerDismissed(true)}
              onOpenSoonest={api.openDetail}
            />
          ) : null}

          <SegmentedControl
            value={view}
            onChange={setView}
            options={HOME_VIEWS}
            ariaLabel="Home view"
          />

          {view === 'all' ? (
            <VoucherSortControl
              field={field}
              direction={direction}
              onFieldChange={setField}
              onDirectionChange={setDirection}
            />
          ) : null}

          {view === 'folders' ? (
            companies.length === 0 ? (
              <EmptyState
                title="No companies yet"
                description="Create a folder for each store, then add vouchers to it."
                action={
                  <Button fullWidth onClick={api.openCreateCompany}>
                    New company
                  </Button>
                }
              />
            ) : (
              <ul className="flex flex-col gap-3">
                {companies.map((company) => (
                  <CompanyCard
                    key={company.id}
                    company={company}
                    vouchers={vouchers.filter(
                      (voucher) => voucher.companyId === company.id,
                    )}
                  />
                ))}
              </ul>
            )
          ) : openVouchers.length === 0 ? (
            <EmptyState
              title={vouchers.length === 0 ? 'No vouchers yet' : 'No open vouchers'}
              description={
                vouchers.length === 0
                  ? 'Add a voucher to start tracking balances and expiry dates.'
                  : 'Used vouchers live in each company folder, behind the Used toggle.'
              }
              action={
                vouchers.length === 0 ? (
                  <Button fullWidth onClick={() => api.openCreate()}>
                    New voucher
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <ul className="flex flex-col gap-3">
              {openVouchers.map((voucher) => (
                <VoucherCard
                  key={voucher.id}
                  voucher={voucher}
                  company={companyById.get(voucher.companyId)}
                  onOpen={() => api.openDetail(voucher.id)}
                  onMarkUsed={() => void api.markUsed(voucher.id)}
                  onUpdateBalance={() => api.openBalance(voucher)}
                  onDelete={() => api.confirmDelete(voucher)}
                />
              ))}
            </ul>
          )}

          <ExpandingFab
            open={fabOpen}
            onOpenChange={setFabOpen}
            onNewVoucher={() => api.openCreate()}
            onNewCompany={api.openCreateCompany}
            onImportSms={
              smsInboxAvailable ? () => navigate('/import/sms') : undefined
            }
          />
        </div>
      )}
    </VoucherFlow>
  );
}
