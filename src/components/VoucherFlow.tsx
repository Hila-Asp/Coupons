import { type ReactNode, useCallback, useState } from 'react';
import { type Company, type Voucher } from '../db';
import { markUsedWithUndo } from '../lib/markUsed';
import { useToast } from '../ui';
import { BarcodeFullscreen } from './BarcodeFullscreen';
import { CompanyForm } from './CompanyForm';
import { UpdateBalanceSheet } from './UpdateBalanceSheet';
import { VoucherDetailSheet } from './VoucherDetailSheet';
import { VoucherForm } from './VoucherForm';

export interface VoucherFlowApi {
  openDetail: (id: string) => void;
  openCreate: (companyId?: string) => void;
  openEdit: (voucher: Voucher) => void;
  openCreateCompany: () => void;
  openEditCompany: (company: Company) => void;
  openBarcode: (id: string) => void;
  openBalance: (voucher: Voucher) => void;
  markUsed: (id: string) => Promise<void>;
}

export interface VoucherFlowProps {
  companies: readonly Company[];
  defaultCompanyId?: string;
  children: (api: VoucherFlowApi) => ReactNode;
}

export function VoucherFlow({
  companies,
  defaultCompanyId,
  children,
}: VoucherFlowProps) {
  const { toast } = useToast();
  const [detailId, setDetailId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [createCompanyId, setCreateCompanyId] = useState<string>();
  const [editing, setEditing] = useState<Voucher>();
  const [companyForm, setCompanyForm] = useState<Company | 'new' | null>(null);
  const [barcodeId, setBarcodeId] = useState<string | null>(null);
  const [balanceVoucher, setBalanceVoucher] = useState<Voucher>();

  const markUsed = useCallback(
    async (id: string) => {
      try {
        await markUsedWithUndo(id, toast);
      } catch {
        toast('Could not update voucher', { tone: 'danger' });
      }
    },
    [toast],
  );

  const api: VoucherFlowApi = {
    openDetail: (id) => setDetailId(id),
    openCreate: (companyId) => {
      setCreateCompanyId(companyId ?? defaultCompanyId);
      setEditing(undefined);
      setCreating(true);
    },
    openEdit: (voucher) => {
      setCreating(false);
      setEditing(voucher);
    },
    openCreateCompany: () => setCompanyForm('new'),
    openEditCompany: (company) => setCompanyForm(company),
    openBarcode: (id) => setBarcodeId(id),
    openBalance: (voucher) => setBalanceVoucher(voucher),
    markUsed,
  };

  return (
    <>
      {children(api)}
      <VoucherDetailSheet
        voucherId={detailId}
        onClose={() => setDetailId(null)}
        onEdit={(voucher) => {
          setDetailId(null);
          setCreating(false);
          setEditing(voucher);
        }}
        onShowBarcode={() => {
          if (detailId) {
            setBarcodeId(detailId);
          }
        }}
      />
      <VoucherForm
        open={creating || editing !== undefined}
        onClose={() => {
          setCreating(false);
          setEditing(undefined);
        }}
        companies={companies}
        voucher={editing}
        defaultCompanyId={createCompanyId ?? defaultCompanyId}
      />
      <CompanyForm
        open={companyForm !== null}
        onClose={() => setCompanyForm(null)}
        company={companyForm === 'new' || companyForm === null ? undefined : companyForm}
      />
      <UpdateBalanceSheet
        open={balanceVoucher !== undefined}
        onClose={() => setBalanceVoucher(undefined)}
        voucher={balanceVoucher}
      />
      <BarcodeFullscreen
        voucherId={barcodeId}
        onClose={() => setBarcodeId(null)}
      />
    </>
  );
}
