import type { BarcodeFormat } from '../db';
import { assertNever } from './assertNever';

export function canRenderBarcode(format: BarcodeFormat): boolean {
  switch (format) {
    case 'code128':
    case 'itf':
    case 'ean13':
    case 'qr':
      return true;
    case 'image':
    case 'none':
      return false;
    default:
      return assertNever(format);
  }
}

export function jsbarcodeFormat(format: BarcodeFormat): string | null {
  switch (format) {
    case 'code128':
      return 'CODE128';
    case 'itf':
      return 'ITF';
    case 'ean13':
      return 'EAN13';
    case 'qr':
    case 'image':
    case 'none':
      return null;
    default:
      return assertNever(format);
  }
}

export function contrastingInk(hex: string): '#ffffff' | '#000000' {
  const raw = hex.replace('#', '');
  if (raw.length < 6) {
    return '#ffffff';
  }
  const r = Number.parseInt(raw.slice(0, 2), 16);
  const g = Number.parseInt(raw.slice(2, 4), 16);
  const b = Number.parseInt(raw.slice(4, 6), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 140 ? '#000000' : '#ffffff';
}

export function barcodeTokenColors(): { canvas: string; ink: string } {
  const style = getComputedStyle(document.documentElement);
  return {
    canvas: style.getPropertyValue('--barcode-canvas').trim() || '#ffffff',
    ink: style.getPropertyValue('--barcode-ink').trim() || '#000000',
  };
}
