import { Button, Sheet } from '../ui';

export interface ConfirmSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  loading?: boolean;
  destructive?: boolean;
}

export function ConfirmSheet({
  open,
  onClose,
  title,
  description,
  confirmLabel,
  onConfirm,
  loading = false,
  destructive = false,
}: ConfirmSheetProps) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button
            variant={destructive ? 'destructive' : 'primary'}
            fullWidth
            loading={loading}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
          <Button variant="ghost" fullWidth onClick={onClose}>
            Cancel
          </Button>
        </>
      }
    >
      <p className="text-sm leading-relaxed text-muted">{description}</p>
    </Sheet>
  );
}
