import JsBarcode from 'jsbarcode';
import { useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import type { BarcodeFormat } from '../db';
import { barcodeTokenColors, jsbarcodeFormat } from '../lib/barcode';

export interface BarcodeGraphicProps {
  format: BarcodeFormat;
  value: string;
  onError?: (failed: boolean) => void;
}

export function BarcodeGraphic({ format, value, onError }: BarcodeGraphicProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [failed, setFailed] = useState(false);
  const linear = jsbarcodeFormat(format);

  useEffect(() => {
    if (!linear || !svgRef.current) {
      return;
    }
    const colors = barcodeTokenColors();
    try {
      JsBarcode(svgRef.current, value, {
        format: linear,
        displayValue: true,
        background: colors.canvas,
        lineColor: colors.ink,
        margin: 8,
        fontSize: 16,
        textMargin: 6,
      });
      setFailed(false);
    } catch {
      setFailed(true);
      onError?.(true);
    }
  }, [linear, onError, value]);

  if (format === 'qr') {
    const colors = barcodeTokenColors();
    return (
      <QRCodeSVG
        value={value}
        size={256}
        level="M"
        bgColor={colors.canvas}
        fgColor={colors.ink}
        className="h-auto w-full max-w-xs"
      />
    );
  }

  if (failed) {
    return null;
  }

  return <svg ref={svgRef} className="h-auto max-h-[min(70dvh,520px)] w-full" />;
}
