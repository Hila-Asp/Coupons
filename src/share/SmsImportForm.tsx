import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { companiesWithSmsSender, type Company } from '../db';
import { cx } from '../lib/cx';
import { senderMatches } from '../lib/smsSender';
import { Banner, Button, Card, Input } from '../ui';
import { defaultSmsSinceInput } from './useSmsImportFlow';

export interface SmsImportFormProps {
  companies: readonly Company[] | undefined;
  onSubmit: (sender: string, sinceInput: string) => void;
}

export function SmsImportForm({ companies, onSubmit }: SmsImportFormProps) {
  const [sender, setSender] = useState('');
  const [sinceInput, setSinceInput] = useState(() => defaultSmsSinceInput());
  const [error, setError] = useState<string | null>(null);
  const prefilled = useRef(false);
  const saved = useMemo(() => companiesWithSmsSender(companies), [companies]);

  useEffect(() => {
    if (prefilled.current || saved.length !== 1) {
      return;
    }
    prefilled.current = true;
    setSender(saved[0].smsSender ?? '');
  }, [saved]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!sender.trim()) {
      setError('Enter a sender number or name.');
      return;
    }
    if (!sinceInput) {
      setError('Pick a start date.');
      return;
    }
    setError(null);
    onSubmit(sender, sinceInput);
  }

  return (
    <form className="flex flex-col gap-4 pb-28" onSubmit={handleSubmit} noValidate>
      <Banner tone="info" title="SMS stay on this phone">
        The app will read inbox messages on this device only, for the sender and
        date you choose. Nothing is uploaded. You can still share one message at
        a time if you prefer.
      </Banner>

      {saved.length > 0 ? (
        <Card padding="none">
          <p className="px-4 pt-3 text-xs font-medium uppercase tracking-wide text-muted">
            Saved senders
          </p>
          <ul className="mt-1 divide-y divide-line">
            {saved.map((company) => {
              const smsSender = company.smsSender ?? '';
              const selected = senderMatches(smsSender, sender);
              return (
                <li key={company.id}>
                  <button
                    type="button"
                    aria-pressed={selected}
                    className={cx(
                      'flex min-h-11 w-full items-center gap-3 px-4 py-2 text-left',
                      'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent',
                      selected ? 'bg-accent-soft' : 'hover:bg-surface-hover',
                    )}
                    onClick={() => {
                      prefilled.current = true;
                      setSender(smsSender);
                      setError(null);
                    }}
                  >
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: company.color }}
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink">
                        {company.name}
                      </span>
                      <span className="block truncate font-mono text-sm text-muted">
                        {smsSender}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </Card>
      ) : null}

      <Card>
        <div className="flex flex-col gap-4">
          <Input
            label="Sender"
            value={sender}
            autoComplete="off"
            spellCheck={false}
            placeholder="054…, +972…, or PLUXEE"
            hint={
              saved.length > 0
                ? 'Tap a saved sender above, or type a new one.'
                : 'Phone number, short code, or name as it appears in Messages. It is saved for next time.'
            }
            error={error && !sender.trim() ? error : undefined}
            onChange={(event) => {
              prefilled.current = true;
              setSender(event.target.value);
            }}
          />
          <Input
            label="From date"
            type="date"
            value={sinceInput}
            error={error && !sinceInput ? error : undefined}
            onChange={(event) => setSinceInput(event.target.value)}
          />
        </div>
      </Card>

      {error && sender.trim() && sinceInput ? (
        <Banner tone="danger" title="Check the form">
          {error}
        </Banner>
      ) : null}

      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-canvas/95 px-4 pt-3 backdrop-blur-md pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto w-full max-w-lg">
          <Button type="submit" fullWidth size="lg">
            Load messages
          </Button>
        </div>
      </div>
    </form>
  );
}
