import { useState } from 'react';
import {
  deleteVoucher,
  useCompany,
  useVoucher,
  type Voucher,
} from '../db';
import { copyText } from '../lib/copyText';
import { formatExpiryLabel, isExpired } from '../lib/dates';
import { markUsedWithUndo } from '../lib/markUsed';
import { formatShekel } from '../lib/money';
import { canRenderBarcode } from '../lib/barcode';
import { Button, Sheet, useToast } from '../ui';
import { BalanceMeter } from './BalanceMeter';
import { ConfirmSheet } from './ConfirmSheet';
import { PageSpinner } from './PageSpinner';

export interface VoucherDetailSheetProps {
  voucherId: string | null;
  onClose: () => void;
  onEdit: (voucher: Voucher) => void;
  onShowBarcode: () => void;
}

export function VoucherDetailSheet({
  voucherId,
  onClose,
  onEdit,
  onShowBarcode,
}: VoucherDetailSheetProps) {
  const { toast } = useToast();
  const voucher = useVoucher(voucherId ?? undefined);
  const company = useCompany(voucher?.companyId);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const open = voucherId !== null;

  const copy = async (value: string, label: string) => {
    const ok = await copyText(value);
    toast(ok ? `${label} copied` : `Could not copy ${label.toLowerCase()}`, {
      tone: ok ? 'success' : 'danger',
    });
  };

  const onMarkUsed = async () => {
    if (!voucher) {
      return;
    }
    setBusy(true);
    try {
      await markUsedWithUndo(voucher.id, toast);
    } catch {
      toast('Could not update voucher', { tone: 'danger' });
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async () => {
    if (!voucher) {
      return;
    }
    setBusy(true);
    try {
      await deleteVoucher(voucher.id);
      toast('Voucher deleted', { tone: 'success' });
      setConfirmDelete(false);
      onClose();
    } catch {
      toast('Could not delete voucher', { tone: 'danger' });
    } finally {
      setBusy(false);
    }
  };

  const used = voucher?.status === 'used' || (voucher !== undefined && voucher.balance <= 0);
  const showBarcode =
    voucher !== undefined &&
    (canRenderBarcode(voucher.barcodeFormat) || voucher.barcodeFormat === 'image');

  return (
    <>
      <Sheet
        open={open && !confirmDelete}
        onClose={onClose}
        title={company?.name ?? 'Voucher'}
      >
        {voucher === undefined ? (
          <PageSpinner className="py-10" />
        ) : (
          <div className="flex flex-col gap-5">
            <button
              type="button"
              className="rounded-md px-1 py-2 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              onClick={() => void copy(voucher.code, 'Code')}
            >
              <p className="text-xs font-medium uppercase tracking-wide text-muted">
                Code
              </p>
              <p className="mt-1 break-all font-mono text-xl font-semibold tracking-wide text-ink">
                {voucher.code}
              </p>
              <p className="mt-1 text-xs text-muted">Tap to copy</p>
            </button>

            {voucher.cvv ? (
              <button
                type="button"
                className="rounded-md px-1 py-2 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                onClick={() => void copy(voucher.cvv ?? '', 'CVV')}
              >
                <p className="text-xs font-medium uppercase tracking-wide text-muted">
                  CVV
                </p>
                <p className="mt-1 font-mono text-lg font-semibold text-ink">
                  {voucher.cvv}
                </p>
              </button>
            ) : null}

            <BalanceMeter
              balance={voucher.balance}
              initialBalance={voucher.initialBalance}
            />

            {voucher.expiresAt !== undefined ? (
              <p
                className={
                  isExpired(voucher.expiresAt)
                    ? 'text-sm font-semibold text-danger'
                    : 'text-sm text-muted'
                }
              >
                {formatExpiryLabel(voucher.expiresAt)}
              </p>
            ) : null}

            {used ? (
              <p className="text-sm font-medium text-muted">This voucher is used.</p>
            ) : null}

            <div className="flex flex-col gap-2">
              {showBarcode ? (
                <Button size="lg" fullWidth onClick={onShowBarcode}>
                  Show barcode
                </Button>
              ) : null}
              {voucher.url ? (
                <Button
                  variant="secondary"
                  fullWidth
                  onClick={() => {
                    window.open(voucher.url, '_blank', 'noopener,noreferrer');
                  }}
                >
                  Open URL
                </Button>
              ) : null}
              <Button variant="secondary" fullWidth onClick={() => onEdit(voucher)}>
                Edit
              </Button>
              {!used ? (
                <Button
                  variant="secondary"
                  fullWidth
                  loading={busy}
                  onClick={() => void onMarkUsed()}
                >
                  Mark used
                </Button>
              ) : null}
              <Button
                variant="ghost"
                fullWidth
                className="text-danger hover:bg-danger-soft"
                onClick={() => setConfirmDelete(true)}
              >
                Delete
              </Button>
            </div>
          </div>
        )}
      </Sheet>
      <ConfirmSheet
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete voucher?"
        description={`This permanently removes ${voucher ? formatShekel(voucher.balance) : 'this voucher'}. You cannot undo this.`}
        confirmLabel="Delete"
        destructive
        loading={busy}
        onConfirm={() => void onDelete()}
      />
    </>
  );
}
