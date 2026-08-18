import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getVoucherBySourceUrl,
  hasImportRecord,
  resolveImportFingerprint,
  type Voucher,
} from '../db';
import { MANUAL_PARSER_ID, parseSharedText } from '../parsers';
import type { ImportDraft, ImportPhase, ScrapeStatus } from './importTypes';
import { isPluxeeVoucherUrl } from './pluxee';
import { scrapeVoucherCode } from './scrapeVoucherCode';

function shouldAutoScrape(draft: ImportDraft): boolean {
  return draft.matched && Boolean(draft.parsed.url && isPluxeeVoucherUrl(draft.parsed.url));
}

export function useImportFlow(sharedText: string) {
  const [phase, setPhase] = useState<ImportPhase>(() =>
    sharedText ? { kind: 'preparing' } : { kind: 'empty' },
  );
  const fingerprintRef = useRef<string | null>(null);
  const skipRef = useRef(false);

  const applyScrape = useCallback((fingerprint: string, scrape: ScrapeStatus) => {
    if (fingerprintRef.current !== fingerprint) {
      return;
    }
    setPhase((current) => {
      if (current.kind !== 'review' || current.draft.fingerprint !== fingerprint) {
        return current;
      }
      if (skipRef.current && scrape.kind !== 'success') {
        return current;
      }
      const nextDraft =
        scrape.kind === 'success'
          ? {
              ...current.draft,
              parsed: { ...current.draft.parsed, code: scrape.code },
            }
          : current.draft;
      return { ...current, draft: nextDraft, scrape };
    });
  }, []);

  const runScrape = useCallback(
    async (fingerprint: string, url: string, signal: AbortSignal) => {
      const result = await scrapeVoucherCode(url, signal);
      if (signal.aborted) {
        return;
      }
      if (result.ok) {
        if (result.codes.length === 1) {
          applyScrape(fingerprint, { kind: 'success', code: result.codes[0] });
          return;
        }
        applyScrape(fingerprint, { kind: 'choice', codes: result.codes });
        return;
      }
      applyScrape(fingerprint, {
        kind: 'failed',
        message: result.message,
        code: result.code,
      });
    },
    [applyScrape],
  );

  useEffect(() => {
    if (!sharedText) {
      fingerprintRef.current = null;
      setPhase({ kind: 'empty' });
      return;
    }

    const controller = new AbortController();
    skipRef.current = false;
    setPhase({ kind: 'preparing' });

    void (async () => {
      const { parser, parsed } = parseSharedText(sharedText);
      const fingerprint = await resolveImportFingerprint({
        sourceUrl: parsed.url,
        text: sharedText,
      });
      if (controller.signal.aborted) {
        return;
      }

      fingerprintRef.current = fingerprint;
      const alreadyImported = await hasImportRecord(fingerprint);
      if (controller.signal.aborted) {
        return;
      }

      if (alreadyImported) {
        const voucher = parsed.url
          ? await getVoucherBySourceUrl(parsed.url)
          : undefined;
        if (controller.signal.aborted) {
          return;
        }
        setPhase({ kind: 'duplicate', fingerprint, voucher });
        return;
      }

      const draft: ImportDraft = {
        text: sharedText,
        fingerprint,
        parserId: parser?.id ?? MANUAL_PARSER_ID,
        parserLabel: parser?.label,
        parsed,
        matched: parser !== undefined,
      };

      if (shouldAutoScrape(draft) && draft.parsed.url) {
        setPhase({ kind: 'review', draft, scrape: { kind: 'loading' } });
        await runScrape(fingerprint, draft.parsed.url, controller.signal);
        return;
      }

      setPhase({ kind: 'review', draft, scrape: { kind: 'idle' } });
    })();

    return () => {
      controller.abort();
    };
  }, [runScrape, sharedText]);

  const skipScrape = useCallback(() => {
    skipRef.current = true;
    setPhase((current) => {
      if (current.kind !== 'review' || current.scrape.kind !== 'loading') {
        return current;
      }
      return { ...current, scrape: { kind: 'skipped' } };
    });
  }, []);

  const lookupCode = useCallback(
    (url: string) => {
      const fingerprint = fingerprintRef.current;
      if (!fingerprint || !isPluxeeVoucherUrl(url)) {
        return;
      }
      skipRef.current = false;
      setPhase((current) => {
        if (current.kind !== 'review') {
          return current;
        }
        return { ...current, scrape: { kind: 'loading' } };
      });
      void runScrape(fingerprint, url, new AbortController().signal);
    },
    [runScrape],
  );

  const markSaved = useCallback((voucher: Voucher, companyName: string) => {
    setPhase({ kind: 'saved', voucher, companyName });
  }, []);

  return { phase, skipScrape, lookupCode, markSaved };
}
