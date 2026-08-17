import { type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cx } from '../lib/cx';
import { PageTitleProvider } from './PageTitle';
import { usePageTitleValue } from './usePageTitle';

export interface AppShellProps {
  children: ReactNode;
}

function titleForPath(pathname: string): string {
  if (pathname === '/') {
    return 'Vouchers';
  }
  if (pathname === '/settings') {
    return 'Settings';
  }
  if (pathname === '/share') {
    return 'Import';
  }
  if (pathname.startsWith('/company/')) {
    return 'Company';
  }
  return 'Vouchers';
}

export function AppShell({ children }: AppShellProps) {
  return (
    <PageTitleProvider>
      <AppShellFrame>{children}</AppShellFrame>
    </PageTitleProvider>
  );
}

function AppShellFrame({ children }: AppShellProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const pageTitle = usePageTitleValue();
  const isHome = location.pathname === '/';
  const isSettings = location.pathname === '/settings';
  const heading = pageTitle ?? titleForPath(location.pathname);

  return (
    <div className="flex min-h-dvh flex-col overflow-x-clip bg-canvas text-ink">
      <header
        className={cx(
          'sticky top-0 z-20 border-b border-line bg-canvas/90 backdrop-blur-md',
          'pt-[env(safe-area-inset-top)]',
        )}
      >
        <div className="mx-auto flex min-h-12 w-full min-w-0 max-w-lg items-center gap-1 overflow-hidden px-2">
          {isHome ? (
            <div className="size-11 shrink-0" />
          ) : (
            <button
              type="button"
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-md text-ink hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              aria-label="Back"
              onClick={() => {
                if (window.history.length > 1) {
                  navigate(-1);
                  return;
                }
                navigate('/');
              }}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path
                  d="M12.5 4.5 7 10l5.5 5.5"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          )}
          <h1 className="min-w-0 flex-1 truncate text-center text-[17px] font-semibold tracking-tight">
            {heading}
          </h1>
          {isSettings ? (
            <div className="size-11 shrink-0" />
          ) : (
            <Link
              to="/settings"
              aria-label="Settings"
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-md text-ink hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path
                  d="M8.2 2.8h3.6l.4 1.7a5.8 5.8 0 0 1 1.5.9l1.7-.5 1.8 3.1-1.3 1.2c.1.4.1.8.1 1.2s0 .8-.1 1.2l1.3 1.2-1.8 3.1-1.7-.5a5.8 5.8 0 0 1-1.5.9l-.4 1.7H8.2l-.4-1.7a5.8 5.8 0 0 1-1.5-.9l-1.7.5-1.8-3.1 1.3-1.2A6 6 0 0 1 4 10c0-.4 0-.8.1-1.2L2.8 7.6 4.6 4.5l1.7.5a5.8 5.8 0 0 1 1.5-.9l.4-1.7Z"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinejoin="round"
                />
                <circle cx="10" cy="10" r="2.1" stroke="currentColor" strokeWidth="1.4" />
              </svg>
            </Link>
          )}
        </div>
      </header>
      <main className="mx-auto w-full min-w-0 max-w-lg flex-1 px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4">
        {children}
      </main>
    </div>
  );
}
