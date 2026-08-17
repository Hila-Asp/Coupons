import { useEffect, useState } from 'react';
import { updateVoucher, type Voucher } from '../db';
import { formatShekel } from '../lib/money';
import { Button, Input, Sheet, useToast } from '../ui';

export interface UpdateBalanceSheetProps {
  open: boolean;
  onClose: () => void;
  voucher?: Voucher;
}

export function UpdateBalanceSheet({
  open,
  onClose,
  voucher,
}: UpdateBalanceSheetProps) {
  const { toast } = useToast();
  const [value, setValue] = useState('');
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !voucher) {
      return;
    }
    setValue(String(voucher.balance));
    setError(undefined);
    setSaving(false);
  }, [open, voucher]);

  const onSubmit = async () => {
    if (!voucher) {
      return;
    }
    const parsed = Number(value);
    if (value.trim() === '' || !Number.isFinite(parsed) || parsed < 0) {
      setError('Enter a valid amount');
      return;
    }

    setSaving(true);
    try {
      await updateVoucher(voucher.id, { balance: parsed });
      toast(`Balance updated to ${formatShekel(parsed)}`, { tone: 'success' });
      onClose();
    } catch {
      toast('Could not update balance', { tone: 'danger' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Update balance"
      footer={
        <Button fullWidth loading={saving} onClick={() => void onSubmit()}>
          Save balance
        </Button>
      }
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          void onSubmit();
        }}
      >
        {voucher ? (
          <p className="text-sm text-muted">
            Current balance is {formatShekel(voucher.balance)}.
          </p>
        ) : null}
        <Input
          label="New balance"
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setError(undefined);
          }}
          error={error}
          inputMode="decimal"
          type="number"
          step="0.01"
          min="0"
        />
      </form>
    </Sheet>
  );
}
