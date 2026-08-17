import { getDisabledParserIds } from './preferences';
import { shufersalParser } from './shufersal';
import { findPluxeeVoucherUrl } from './text';
import type { ParsedVoucher, VoucherParser } from './types';

export const MANUAL_PARSER_ID = 'manual';

export const parsers: readonly VoucherParser[] = [shufersalParser];

export function listParsers(): readonly VoucherParser[] {
  return parsers;
}

export function resolveParser(
  text: string,
  disabledIds: ReadonlySet<string> = getDisabledParserIds(),
): VoucherParser | undefined {
  for (const parser of parsers) {
    if (disabledIds.has(parser.id)) {
      continue;
    }
    try {
      if (parser.test(text)) {
        return parser;
      }
    } catch {
      continue;
    }
  }
  return undefined;
}

export function emptyParsedVoucher(text = ''): ParsedVoucher {
  return {
    companyName: '',
    url: findPluxeeVoucherUrl(text),
    barcodeFormat: 'none',
  };
}

export function parseSharedText(text: string): {
  parser: VoucherParser | undefined;
  parsed: ParsedVoucher;
} {
  const parser = resolveParser(text);
  if (!parser) {
    return { parser: undefined, parsed: emptyParsedVoucher(text) };
  }

  try {
    return { parser, parsed: parser.parse(text) };
  } catch {
    return {
      parser,
      parsed: {
        companyName: parser.companyName,
        url: findPluxeeVoucherUrl(text),
        barcodeFormat: 'code128',
      },
    };
  }
}
