import { useCallback, useRef, useState } from 'react';
import {
  createImportRecord,
  createVoucher,
  hasImportRecord,
  pruneOrphanedImportRecords,
  rememberCompanySmsSender,
  resolveImportFingerprint,
} from '../db';
import { MANUAL_PARSER_ID, parseSharedText } from '../parsers';
import {
  isSmsInboxAvailable,
  querySmsInbox,
  requestSmsInboxPermission,
} from '../capacitor/smsInbox';
import { startOfDayFromDateInput, toDateInputValue } from '../lib/dates';
import { classifySmsImportRow, toggleSmsRowSelection } from './smsImportClassify';
import { isPluxeeVoucherUrl, isTwentyDigitCode } from './pluxee';
import { scrapeVoucherCode } from './scrapeVoucherCode';
import type { SmsImportPhase, SmsImportRow } from './smsImportTypes';

export function defaultSmsSinceInput(now = new Date()): string {
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
  return toDateInputValue(date.getTime());
}

async function rowsFromInbox(sender: string, minDate: number): Promise<SmsImportRow[]> {
  await pruneOrphanedImportRecords();
  const messages = await querySmsInbox({ sender, minDate });
  const rows = await Promise.all(
    messages.map(async (sms) => {
      const { parser, parsed } = parseSharedText(sms.body);
      const fingerprint = await resolveImportFingerprint({
        sourceUrl: parsed.url,
        text: sms.body,
      });
      const alreadyImported = await hasImportRecord(fingerprint);
      const classified = classifySmsImportRow({
        matched: parser !== undefined,
        alreadyImported,
        body: sms.body,
        parsed,
      });
      const row: SmsImportRow = {
        id: String(sms.id),
        address: sms.address,
        date: sms.date,
        body: sms.body,
        fingerprint,
        parserId: parser?.id ?? MANUAL_PARSER_ID,
        parserLabel: parser?.label,
        parsed,
        matched: parser !== undefined,
        ...classified,
      };
      return row;
    }),
  );
  return rows.sort((left, right) => right.date - left.date);
}

async function resolveCode(
  row: SmsImportRow,
  signal: AbortSignal,
): Promise<string | undefined> {
  const existing = row.parsed.code?.trim();
  const url = row.parsed.url?.trim();
  const needsScrape =
    Boolean(url && isPluxeeVoucherUrl(url)) &&
    (!existing || !isTwentyDigitCode(existing));
  if (!needsScrape) {
    return existing;
  }
  if (!url) {
    return existing;
  }
  const result = await scrapeVoucherCode(url, signal);
  if (signal.aborted) {
    return existing;
  }
  if (result.ok && result.codes.length > 0) {
    return result.codes[0];
  }
  return existing;
}

export function useSmsImportFlow() {
  const [phase, setPhase] = useState<SmsImportPhase>(() =>
    isSmsInboxAvailable() ? { kind: 'form' } : { kind: 'unavailable' },
  );
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const abortRef = useRef<AbortController | null>(null);

  const cancelWork = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  const backToForm = useCallback(() => {
    cancelWork();
    if (!isSmsInboxAvailable()) {
      setPhase({ kind: 'unavailable' });
      return;
    }
    setPhase({ kind: 'form' });
  }, [cancelWork]);

  const loadMessages = useCallback(async (sender: string, sinceInput: string) => {
    if (!isSmsInboxAvailable()) {
      setPhase({ kind: 'unavailable' });
      return;
    }

    const trimmed = sender.trim();
    const sinceMs = startOfDayFromDateInput(sinceInput);
    if (!trimmed) {
      setPhase({ kind: 'error', message: 'Enter a sender number or name.' });
      return;
    }
    if (sinceMs === undefined) {
      setPhase({ kind: 'error', message: 'Pick a start date.' });
      return;
    }

    cancelWork();
    const controller = new AbortController();
    abortRef.current = controller;

    setPhase({ kind: 'permission' });
    let permission;
    try {
      permission = await requestSmsInboxPermission();
    } catch (error) {
      if (controller.signal.aborted) {
        return;
      }
      setPhase({
        kind: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Could not request SMS permission.',
      });
      return;
    }

    if (controller.signal.aborted) {
      return;
    }

    switch (permission) {
      case 'unavailable':
        setPhase({ kind: 'unavailable' });
        return;
      case 'denied':
        setPhase({ kind: 'denied' });
        return;
      case 'granted':
        break;
      default: {
        const _exhaustive: never = permission;
        setPhase({ kind: 'error', message: `Unhandled permission: ${_exhaustive}` });
        return;
      }
    }

    setPhase({ kind: 'loading' });
    try {
      const items = await rowsFromInbox(trimmed, sinceMs);
      if (controller.signal.aborted) {
        return;
      }
      setPhase({ kind: 'review', items, sender: trimmed, sinceMs });
    } catch (error) {
      if (controller.signal.aborted) {
        return;
      }
      setPhase({
        kind: 'error',
        message:
          error instanceof Error ? error.message : 'Could not read SMS messages.',
      });
    }
  }, [cancelWork]);

  const toggleRow = useCallback((id: string) => {
    setPhase((current) => {
      if (current.kind !== 'review') {
        return current;
      }
      return { ...current, items: toggleSmsRowSelection(current.items, id) };
    });
  }, []);

  const importSelected = useCallback(async (companyId: string) => {
    const current = phaseRef.current;
    if (current.kind !== 'review') {
      return;
    }
    const selected = current.items.filter((item) => item.selected);
    if (selected.length === 0) {
      return;
    }
    const { sender } = current;

    cancelWork();
    const controller = new AbortController();
    abortRef.current = controller;

    setPhase({ kind: 'saving', current: 0, total: selected.length });
    let imported = 0;
    let skipped = 0;

    try {
      for (const [index, row] of selected.entries()) {
        if (controller.signal.aborted) {
          return;
        }
        setPhase({ kind: 'saving', current: index + 1, total: selected.length });

        const code = await resolveCode(row, controller.signal);
        if (controller.signal.aborted) {
          return;
        }
        const balance = row.parsed.balance;
        if (!code || balance === undefined) {
          skipped += 1;
          continue;
        }

        const url = row.parsed.url?.trim();
        const barcodeFormat =
          row.parsed.barcodeFormat === 'none' && isTwentyDigitCode(code)
            ? 'code128'
            : row.parsed.barcodeFormat;
        const voucher = await createVoucher({
          companyId,
          code,
          cvv: row.parsed.cvv,
          balance,
          initialBalance: balance,
          url,
          expiresAt: row.parsed.expiresAt,
          receivedAt: row.date,
          barcodeFormat,
          sourceUrl: url,
        });
        await createImportRecord({
          fingerprint: row.fingerprint,
          parserId: row.parserId,
          voucherId: voucher.id,
        });
        imported += 1;
      }

      if (controller.signal.aborted) {
        return;
      }

      if (imported === 0) {
        setPhase({
          kind: 'error',
          message:
            'None of the selected messages could be saved. Codes or amounts may be missing after lookup. You can still share one message to this app.',
        });
        return;
      }
      await rememberCompanySmsSender(companyId, sender);
      setPhase({
        kind: 'done',
        imported,
        ...(skipped > 0 ? { skipped } : {}),
      });
    } catch (error) {
      if (controller.signal.aborted) {
        return;
      }
      setPhase({
        kind: 'error',
        message:
          error instanceof Error ? error.message : 'Could not save the selected coupons.',
      });
    }
  }, [cancelWork]);

  return {
    phase,
    loadMessages,
    toggleRow,
    importSelected,
    backToForm,
  };
}
