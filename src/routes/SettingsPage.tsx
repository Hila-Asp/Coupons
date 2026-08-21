import { Capacitor } from '@capacitor/core';
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { isSmsInboxAvailable } from '../capacitor/smsInbox';
import { Toggle } from '../components/Toggle';
import { exportBackup, importBackup } from '../db';
import { assertNever } from '../lib/assertNever';
import { useNotificationPermission } from '../notifications';
import { useParserPreferences } from '../parsers';
import { THEME_PREFERENCES, useTheme, type ThemePreference } from '../theme';
import { Banner, Button, Card, SegmentedControl, useToast } from '../ui';

const THEME_OPTIONS = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
] as const satisfies readonly { value: ThemePreference; label: string }[];

function isThemePreference(value: string): value is ThemePreference {
  return (THEME_PREFERENCES as readonly string[]).includes(value);
}

function permissionCopy(
  permission: ReturnType<typeof useNotificationPermission>['permission'],
): { title: string; body: string } {
  switch (permission) {
    case 'granted':
      return {
        title: 'Notifications are on',
        body: 'You will get an alert when a voucher expires within 60 days, whenever the app can run.',
      };
    case 'denied':
      return {
        title: 'Notifications are blocked',
        body: 'Enable them in the browser site settings for this app, then return here.',
      };
    case 'default':
      return {
        title: 'Notifications are off',
        body: 'Allow alerts so expiring vouchers can surface on this phone.',
      };
    case 'unsupported':
      return {
        title: 'Notifications are unavailable',
        body: 'This browser does not support web notifications.',
      };
    default:
      return assertNever(permission);
  }
}

export function SettingsPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { preference, setPreference } = useTheme();
  const { permission, request } = useNotificationPermission();
  const { parsers, isEnabled, setEnabled } = useParserPreferences();
  const fileRef = useRef<HTMLInputElement>(null);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const isNative = Capacitor.isNativePlatform();
  const smsInboxAvailable = isSmsInboxAvailable();
  const notice = permissionCopy(permission);

  const onExport = async () => {
    setExporting(true);
    try {
      await exportBackup();
      toast('Backup downloaded', { tone: 'success' });
    } catch {
      toast('Could not export backup', { tone: 'danger' });
    } finally {
      setExporting(false);
    }
  };

  const onImportFile = async (file: File | undefined) => {
    if (!file) {
      return;
    }
    setImporting(true);
    try {
      const result = await importBackup(file);
      const added =
        result.companiesAdded + result.vouchersAdded + result.importRecordsAdded;
      const skipped =
        result.companiesSkipped +
        result.vouchersSkipped +
        result.importRecordsSkipped;
      toast(
        added === 0
          ? skipped > 0
            ? 'Nothing new to import'
            : 'Backup was empty'
          : `Imported ${added} item${added === 1 ? '' : 's'}`,
        { tone: added > 0 ? 'success' : 'info' },
      );
    } catch (error) {
      toast(
        error instanceof Error ? error.message : 'Could not import backup',
        { tone: 'danger' },
      );
    } finally {
      setImporting(false);
      if (fileRef.current) {
        fileRef.current.value = '';
      }
    }
  };

  return (
    <div className="flex flex-col gap-8 pb-8">
      <section className="flex flex-col gap-3">
        <SectionHeading
          title="Appearance"
          description="Uses the same theme preference as the rest of the app."
        />
        <SegmentedControl
          value={preference}
          onChange={(value) => {
            if (isThemePreference(value)) {
              setPreference(value);
            }
          }}
          options={THEME_OPTIONS}
          ariaLabel="Theme"
        />
      </section>

      <section className="flex flex-col gap-3">
        <SectionHeading
          title="Notifications"
          description={
            isNative
              ? 'Expiry alerts on this APK need a native notification plugin.'
              : 'Expiry alerts need permission, and still work best when you open the app.'
          }
        />
        {isNative ? (
          <Card>
            <p className="text-sm font-semibold text-ink">
              Native expiry alerts are not set up yet
            </p>
            <p className="mt-1 text-sm text-muted">
              TODO: wire @capacitor/local-notifications (or a similar plugin)
              for APK expiry reminders. Service-worker notifications from the
              PWA do not run in this app, so they are turned off here.
            </p>
          </Card>
        ) : (
          <Card>
            <p className="text-sm font-semibold text-ink">{notice.title}</p>
            <p className="mt-1 text-sm text-muted">{notice.body}</p>
            {permission === 'default' ? (
              <Button
                className="mt-4"
                fullWidth
                loading={requesting}
                onClick={() => {
                  void (async () => {
                    setRequesting(true);
                    try {
                      const next = await request();
                      if (next === 'granted') {
                        toast('Notifications enabled', { tone: 'success' });
                      } else if (next === 'denied') {
                        toast('Permission was denied', { tone: 'warning' });
                      }
                    } finally {
                      setRequesting(false);
                    }
                  })();
                }}
              >
                Enable notifications
              </Button>
            ) : null}
          </Card>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <SectionHeading
          title="Import from SMS"
          description="Create several coupons from one sender without multi-share."
        />
        {smsInboxAvailable ? (
          <Card>
            <p className="text-sm font-semibold text-ink">Read this phone's inbox</p>
            <p className="mt-1 text-sm text-muted">
              Choose a sender and a start date, then pick which messages to save.
              Messages stay on this device.
            </p>
            <Button
              className="mt-4"
              fullWidth
              onClick={() => navigate('/import/sms')}
            >
              Import SMS
            </Button>
          </Card>
        ) : (
          <Card>
            <p className="text-sm font-semibold text-ink">Android APK only</p>
            <p className="mt-1 text-sm text-muted">
              Inbox import runs in the sideloaded Android app. Here, share one
              voucher message at a time.
            </p>
          </Card>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <SectionHeading
          title="SMS parsers"
          description="Disable a parser if it misfires on messages that are not vouchers."
        />
        <Card padding="none">
          <ul className="divide-y divide-line">
            {parsers.map((parser) => (
              <li
                key={parser.id}
                className="flex min-w-0 items-center gap-3 px-4 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">
                    {parser.label}
                  </p>
                  <p className="truncate text-sm text-muted">
                    Files under {parser.companyName}
                  </p>
                </div>
                <Toggle
                  checked={isEnabled(parser.id)}
                  onChange={(checked) => setEnabled(parser.id, checked)}
                  label={isEnabled(parser.id) ? 'On' : 'Off'}
                />
              </li>
            ))}
          </ul>
        </Card>
      </section>

      <section className="flex flex-col gap-3">
        <SectionHeading
          title="Backup"
          description="Export or merge a JSON copy of companies, vouchers, and import history. Import never overwrites existing records."
        />
        <div className="flex flex-col gap-2">
          <Button
            variant="secondary"
            fullWidth
            loading={exporting}
            onClick={() => void onExport()}
          >
            Export JSON backup
          </Button>
          <Button
            variant="secondary"
            fullWidth
            loading={importing}
            onClick={() => fileRef.current?.click()}
          >
            Import JSON backup
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            onChange={(event) => {
              void onImportFile(event.target.files?.[0]);
            }}
          />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <SectionHeading title="About" description={`Version ${__APP_VERSION__}`} />
        {isNative ? (
          <Card>
            <p className="text-sm font-semibold text-ink">
              Share sheet on this APK
            </p>
            <p className="mt-1 text-sm text-muted">
              This install is a native app. From Samsung Messages, share a
              voucher SMS and choose Voucher Manager. You do not need to Add
              to Home screen.
            </p>
          </Card>
        ) : (
          <>
            <Card>
              <p className="text-sm font-semibold text-ink">
                Share sheet on Android
              </p>
              <p className="mt-1 text-sm text-muted">
                Changing the share target requires uninstalling and reinstalling
                the PWA. Android does not pick up a new share target from an
                update alone.
              </p>
              <a
                href="#reinstall"
                className="mt-3 inline-flex min-h-11 items-center text-sm font-medium text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                Reinstall guidance
              </a>
            </Card>
            <Card id="reinstall">
              <p className="text-sm font-semibold text-ink">
                Reinstall on a Galaxy S25
              </p>
              <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-muted">
                <li>Long-press the home-screen icon and remove the app.</li>
                <li>
                  In Samsung Internet or Chrome, open the deployed site and use
                  Add to Home screen / Install app.
                </li>
                <li>
                  After install, share a voucher SMS and confirm Voucher Manager
                  appears in the share sheet.
                </li>
              </ol>
            </Card>
          </>
        )}
        {!isNative && permission === 'denied' ? (
          <Banner tone="warning" title="Alerts are blocked">
            Open site settings for this origin and allow notifications, then
            reload the app.
          </Banner>
        ) : null}
      </section>
    </div>
  );
}

function SectionHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="min-w-0 px-0.5">
      <h2 className="text-sm font-semibold tracking-tight text-ink">{title}</h2>
      <p className="mt-1 text-sm text-muted">{description}</p>
    </div>
  );
}
