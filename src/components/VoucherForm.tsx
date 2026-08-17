import { useEffect, useId, useRef, useState } from 'react';
import {
  BARCODE_FORMATS,
  COMPANY_COLOR_PRESETS,
  createCompany,
  createVoucher,
  updateVoucher,
  type BarcodeFormat,
  type Company,
  type Voucher,
} from '../db';
import { assertNever } from '../lib/assertNever';
import { fromDateInputValue, toDateInputValue } from '../lib/dates';
import { useObjectUrl } from '../lib/useObjectUrl';
import { Button, Input, Select, Sheet, useToast } from '../ui';
import { ColorSwatches } from './ColorSwatches';

const BARCODE_OPTIONS = BARCODE_FORMATS.map((value) => ({
  value,
  label: barcodeLabel(value),
}));

function barcodeLabel(format: BarcodeFormat): string {
  switch (format) {
    case 'code128':
      return 'Code 128';
    case 'itf':
      return 'ITF';
    case 'ean13':
      return 'EAN-13';
    case 'qr':
      return 'QR code';
    case 'image':
      return 'Photo of barcode';
    case 'none':
      return 'None';
    default:
      return assertNever(format);
  }
}

function isBarcodeFormat(value: string): value is BarcodeFormat {
  return (BARCODE_FORMATS as readonly string[]).includes(value);
}

interface FormErrors {
  companyId?: string;
  newCompanyName?: string;
  code?: string;
  balance?: string;
  initialBalance?: string;
  url?: string;
  barcodeImage?: string;
}

export interface VoucherFormProps {
  open: boolean;
  onClose: () => void;
  companies: readonly Company[];
  voucher?: Voucher;
  defaultCompanyId?: string;
}

export function VoucherForm({
  open,
  onClose,
  companies,
  voucher,
  defaultCompanyId,
}: VoucherFormProps) {
  const { toast } = useToast();
  const fileId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const isEdit = voucher !== undefined;
  const needsInlineCompany = !isEdit && companies.length === 0;

  const [companyId, setCompanyId] = useState('');
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newCompanyColor, setNewCompanyColor] = useState<string>(
    COMPANY_COLOR_PRESETS[0],
  );
  const [code, setCode] = useState('');
  const [cvv, setCvv] = useState('');
  const [balance, setBalance] = useState('');
  const [initialBalance, setInitialBalance] = useState('');
  const [url, setUrl] = useState('');
  const [expiresOn, setExpiresOn] = useState('');
  const [barcodeFormat, setBarcodeFormat] = useState<BarcodeFormat>('code128');
  const [barcodeImage, setBarcodeImage] = useState<Blob>();
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);
  const previewUrl = useObjectUrl(barcodeImage);

  useEffect(() => {
    if (!open) {
      return;
    }
    setCompanyId(voucher?.companyId ?? defaultCompanyId ?? companies[0]?.id ?? '');
    setNewCompanyName('');
    setNewCompanyColor(COMPANY_COLOR_PRESETS[0]);
    setCode(voucher?.code ?? '');
    setCvv(voucher?.cvv ?? '');
    setBalance(voucher ? String(voucher.balance) : '');
    setInitialBalance(voucher ? String(voucher.initialBalance) : '');
    setUrl(voucher?.url ?? '');
    setExpiresOn(
      voucher?.expiresAt !== undefined ? toDateInputValue(voucher.expiresAt) : '',
    );
    setBarcodeFormat(voucher?.barcodeFormat ?? 'code128');
    setBarcodeImage(voucher?.barcodeImage);
    setErrors({});
    setSaving(false);
  }, [open, voucher, defaultCompanyId, companies]);

  const validate = (): FormErrors => {
    const next: FormErrors = {};

    if (needsInlineCompany) {
      if (!newCompanyName.trim()) {
        next.newCompanyName = 'Company name is required';
      }
    } else if (!companyId) {
      next.companyId = 'Select a company';
    }

    const trimmedCode = code.trim();
    if (!trimmedCode) {
      next.code = 'Code is required';
    } else if (barcodeFormat === 'ean13') {
      const digits = trimmedCode.replace(/\D/g, '');
      if (digits.length !== 12 && digits.length !== 13) {
        next.code = 'EAN-13 needs 12 or 13 digits';
      }
    } else if (barcodeFormat === 'itf') {
      const digits = trimmedCode.replace(/\D/g, '');
      if (digits.length < 2 || digits.length % 2 !== 0) {
        next.code = 'ITF needs an even number of digits';
      }
    }

    const parsedBalance = Number(balance);
    if (balance.trim() === '' || !Number.isFinite(parsedBalance) || parsedBalance < 0) {
      next.balance = 'Enter a valid amount';
    }

    if (initialBalance.trim() !== '') {
      const parsedInitial = Number(initialBalance);
      if (!Number.isFinite(parsedInitial) || parsedInitial < 0) {
        next.initialBalance = 'Enter a valid amount';
      } else if (
        Number.isFinite(parsedBalance) &&
        parsedInitial < parsedBalance
      ) {
        next.initialBalance = 'Initial balance cannot be less than remaining';
      }
    }

    if (url.trim()) {
      try {
        new URL(url.trim());
      } catch {
        next.url = 'Enter a valid URL';
      }
    }

    if (barcodeFormat === 'image' && !barcodeImage) {
      next.barcodeImage = 'Take or choose a photo of the barcode';
    }

    return next;
  };

  const onSubmit = async () => {
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setSaving(true);
    try {
      let resolvedCompanyId = companyId;
      if (needsInlineCompany) {
        const created = await createCompany({
          name: newCompanyName.trim(),
          color: newCompanyColor,
        });
        resolvedCompanyId = created.id;
      }

      const parsedBalance = Number(balance);
      const parsedInitial =
        initialBalance.trim() === ''
          ? parsedBalance
          : Number(initialBalance);

      if (isEdit) {
        await updateVoucher(voucher.id, {
          companyId: resolvedCompanyId,
          code: code.trim(),
          cvv: cvv.trim() ? cvv.trim() : null,
          balance: parsedBalance,
          initialBalance: parsedInitial,
          url: url.trim() ? url.trim() : null,
          expiresAt: expiresOn ? fromDateInputValue(expiresOn) : null,
          barcodeFormat,
          barcodeImage: barcodeFormat === 'image' ? (barcodeImage ?? null) : null,
        });
        toast('Voucher updated', { tone: 'success' });
      } else {
        await createVoucher({
          companyId: resolvedCompanyId,
          code: code.trim(),
          cvv: cvv.trim() || undefined,
          balance: parsedBalance,
          initialBalance: parsedInitial,
          url: url.trim() || undefined,
          expiresAt: expiresOn ? fromDateInputValue(expiresOn) : undefined,
          barcodeFormat,
          barcodeImage: barcodeFormat === 'image' ? barcodeImage : undefined,
        });
        toast('Voucher saved', { tone: 'success' });
      }
      onClose();
    } catch {
      toast('Could not save voucher', { tone: 'danger' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit voucher' : 'New voucher'}
      footer={
        <Button fullWidth loading={saving} onClick={() => void onSubmit()}>
          {isEdit ? 'Save changes' : 'Save voucher'}
        </Button>
      }
    >
      <form
        className="flex flex-col gap-5"
        onSubmit={(event) => {
          event.preventDefault();
          void onSubmit();
        }}
      >
        {needsInlineCompany ? (
          <>
            <Input
              label="Company"
              value={newCompanyName}
              onChange={(event) => setNewCompanyName(event.target.value)}
              error={errors.newCompanyName}
              placeholder="Shufersal"
              autoComplete="off"
            />
            <ColorSwatches
              value={newCompanyColor}
              onChange={setNewCompanyColor}
            />
          </>
        ) : (
          <Select
            label="Company"
            value={companyId}
            onChange={setCompanyId}
            options={companies.map((company) => ({
              value: company.id,
              label: company.name,
            }))}
            placeholder="Select a company"
            error={errors.companyId}
          />
        )}
        <Input
          label="Code"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          error={errors.code}
          autoComplete="off"
          inputMode="text"
          spellCheck={false}
        />
        <Input
          label="CVV"
          value={cvv}
          onChange={(event) => setCvv(event.target.value)}
          hint="Optional"
          autoComplete="off"
          inputMode="numeric"
        />
        <Input
          label="Balance"
          value={balance}
          onChange={(event) => setBalance(event.target.value)}
          error={errors.balance}
          inputMode="decimal"
          type="number"
          step="0.01"
          min="0"
        />
        <Input
          label="Initial balance"
          value={initialBalance}
          onChange={(event) => setInitialBalance(event.target.value)}
          error={errors.initialBalance}
          hint={isEdit ? undefined : 'Defaults to the current balance'}
          inputMode="decimal"
          type="number"
          step="0.01"
          min="0"
        />
        <Input
          label="Expires"
          type="date"
          value={expiresOn}
          onChange={(event) => setExpiresOn(event.target.value)}
          hint="Optional"
        />
        <Input
          label="Redemption URL"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          error={errors.url}
          hint="Optional"
          inputMode="url"
          type="url"
          placeholder="https://"
        />
        <Select
          label="Barcode"
          value={barcodeFormat}
          onChange={(value) => {
            if (isBarcodeFormat(value)) {
              setBarcodeFormat(value);
            }
          }}
          options={BARCODE_OPTIONS}
        />
        {barcodeFormat === 'image' ? (
          <div className="flex flex-col gap-2">
            <input
              ref={fileRef}
              id={fileId}
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  setBarcodeImage(file);
                  setErrors((current) => ({
                    ...current,
                    barcodeImage: undefined,
                  }));
                }
              }}
            />
            <Button
              variant="secondary"
              fullWidth
              onClick={() => fileRef.current?.click()}
            >
              {barcodeImage ? 'Replace photo' : 'Take or choose photo'}
            </Button>
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Barcode preview"
                className="max-h-40 w-full rounded-md border border-line object-contain bg-canvas"
              />
            ) : null}
            {errors.barcodeImage ? (
              <p className="text-sm text-danger" role="alert">
                {errors.barcodeImage}
              </p>
            ) : null}
          </div>
        ) : null}
      </form>
    </Sheet>
  );
}
