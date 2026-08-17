import { useEffect, useState } from 'react';
import {
  COMPANY_COLOR_PRESETS,
  useCompany,
  useVoucher,
  type BarcodeFormat,
} from '../db';
import { canRenderBarcode, contrastingInk } from '../lib/barcode';
import { formatShekel } from '../lib/money';
import { useObjectUrl } from '../lib/useObjectUrl';
import { useWakeLock } from '../lib/useWakeLock';
import { BarcodeGraphic } from './BarcodeGraphic';

export interface BarcodeFullscreenProps {
  voucherId: string | null;
  onClose: () => void;
}

export function BarcodeFullscreen({
  voucherId,
  onClose,
}: BarcodeFullscreenProps) {
  const open = voucherId !== null;
  const voucher = useVoucher(voucherId ?? undefined);
  const company = useCompany(voucher?.companyId);
  const imageUrl = useObjectUrl(voucher?.barcodeImage);
  useWakeLock(open);

  useEffect(() => {
    if (!open) {
      return;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  const headerColor = company?.color ?? COMPANY_COLOR_PRESETS[0];
  const headerInk = contrastingInk(headerColor);

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-barcode-canvas text-barcode-ink">
      <header
        className="flex items-center gap-2 px-2 pt-[env(safe-area-inset-top)]"
        style={{ backgroundColor: headerColor, color: headerInk }}
      >
        <button
          type="button"
          aria-label="Close barcode"
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          onClick={onClose}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path
              d="M5 5l10 10M15 5 5 15"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </button>
        <div className="min-w-0 flex-1 py-3 pr-3">
          <p className="truncate text-sm font-semibold">
            {company?.name ?? 'Voucher'}
          </p>
          {voucher ? (
            <p className="text-xs opacity-80">{formatShekel(voucher.balance)}</p>
          ) : null}
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-4 py-6">
        {!voucher ? (
          <p className="text-sm text-barcode-ink/50">Loading barcode…</p>
        ) : voucher.barcodeFormat === 'image' ? (
          imageUrl ? (
            <img
              src={imageUrl}
              alt="Voucher barcode"
              className="max-h-full max-w-full object-contain"
            />
          ) : (
            <p className="text-sm text-barcode-ink/50">No barcode photo stored.</p>
          )
        ) : canRenderBarcode(voucher.barcodeFormat) ? (
          <RenderedBarcode format={voucher.barcodeFormat} code={voucher.code} />
        ) : (
          <BarcodeFallback code={voucher.code} />
        )}
      </div>
    </div>
  );
}

function RenderedBarcode({
  format,
  code,
}: {
  format: BarcodeFormat;
  code: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return <BarcodeFallback code={code} error />;
  }

  return (
    <div className="flex max-h-full w-full max-w-lg items-center justify-center">
      <BarcodeGraphic format={format} value={code} onError={setFailed} />
    </div>
  );
}

function BarcodeFallback({
  code,
  error = false,
}: {
  code: string;
  error?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="flex max-w-lg flex-col items-center gap-3 text-center">
      {error ? (
        <p className="text-sm text-barcode-ink/60">
          Could not render this barcode. Show the code instead.
        </p>
      ) : null}
      <p className="break-all font-mono text-3xl font-semibold tracking-wider text-barcode-ink">
        {code}
      </p>
      <button
        type="button"
        className="min-h-11 px-3 text-sm font-medium text-barcode-ink/70 underline-offset-2 hover:underline"
        onClick={() => {
          void navigator.clipboard?.writeText(code).then(() => {
            setCopied(true);
          });
        }}
      >
        {copied ? 'Copied' : 'Copy code'}
      </button>
    </div>
  );
}
