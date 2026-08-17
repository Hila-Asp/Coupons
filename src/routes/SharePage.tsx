import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useCompanies, useCompany, type Voucher } from '../db';
import { assertNever } from '../lib/assertNever';
import { combineShareParams } from '../share/combineShareParams';
import { ImportReviewForm } from '../share/ImportReviewForm';
import {
  ImportDuplicate,
  ImportEmpty,
  ImportPreparing,
  ImportSuccess,
} from '../share/ImportStates';
import { useImportFlow } from '../share/useImportFlow';

export function SharePage() {
  const [params] = useSearchParams();
  const sharedText = useMemo(() => combineShareParams(params), [params]);
  const { phase, skipScrape, lookupCode, markSaved } = useImportFlow(sharedText);
  const companies = useCompanies();

  switch (phase.kind) {
    case 'empty':
      return <ImportEmpty />;
    case 'preparing':
      return <ImportPreparing />;
    case 'duplicate':
      return <DuplicateState voucher={phase.voucher} />;
    case 'review':
      return (
        <ImportReviewForm
          draft={phase.draft}
          scrape={phase.scrape}
          companies={companies}
          onSkipScrape={skipScrape}
          onLookupCode={lookupCode}
          onSaved={markSaved}
        />
      );
    case 'saved':
      return (
        <ImportSuccess
          companyName={phase.companyName}
          balance={phase.voucher.balance}
          companyId={phase.voucher.companyId}
        />
      );
    default:
      return assertNever(phase);
  }
}

function DuplicateState({ voucher }: { voucher?: Voucher }) {
  const company = useCompany(voucher?.companyId);
  return <ImportDuplicate voucher={voucher} company={company} />;
}
