import { getVoucher, markVoucherUsed, updateVoucher } from '../db';
import type { ToastOptions } from '../ui';

type ToastFn = (message: string, options?: ToastOptions) => void;

export async function markUsedWithUndo(
  id: string,
  toast: ToastFn,
): Promise<void> {
  const existing = await getVoucher(id);
  if (!existing) {
    toast('Could not update voucher', { tone: 'danger' });
    return;
  }

  const previous = {
    balance: existing.balance,
    status: existing.status,
  };

  await markVoucherUsed(id);
  toast('Marked as used', {
    tone: 'success',
    action: {
      label: 'Undo',
      onClick: () => {
        void updateVoucher(id, previous).then(
          () => {
            toast('Restored', { tone: 'success' });
          },
          () => {
            toast('Could not undo', { tone: 'danger' });
          },
        );
      },
    },
  });
}
