import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { assertNever } from '../lib/assertNever';
import { cx } from '../lib/cx';

export type ToastTone = 'info' | 'success' | 'warning' | 'danger';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastOptions {
  tone?: ToastTone;
  duration?: number;
  action?: ToastAction;
}

interface ToastItem {
  id: string;
  message: string;
  tone: ToastTone;
  action?: ToastAction;
}

interface ToastContextValue {
  toast: (message: string, options?: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

function toneClass(tone: ToastTone): string {
  switch (tone) {
    case 'info':
      return 'bg-ink text-canvas';
    case 'success':
      return 'bg-success text-success-fg';
    case 'warning':
      return 'bg-warning text-warning-fg';
    case 'danger':
      return 'bg-danger text-danger-fg';
    default:
      return assertNever(tone);
  }
}

function defaultDuration(tone: ToastTone, hasAction: boolean): number {
  if (hasAction) {
    return 8000;
  }
  switch (tone) {
    case 'danger':
      return 5000;
    case 'warning':
      return 4000;
    case 'info':
    case 'success':
      return 3200;
    default:
      return assertNever(tone);
  }
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, options?: ToastOptions) => {
      const tone = options?.tone ?? 'info';
      const id = crypto.randomUUID();
      setToasts((current) => [
        ...current,
        { id, message, tone, action: options?.action },
      ]);
      window.setTimeout(() => {
        dismiss(id);
      }, options?.duration ?? defaultDuration(tone, Boolean(options?.action)));
    },
    [dismiss],
  );

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
        aria-live="polite"
        aria-relevant="additions"
      >
        {toasts.map((item) => (
          <div
            key={item.id}
            role="status"
            className={cx(
              'pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-md px-4 py-3 text-sm font-medium shadow-[var(--shadow-md)]',
              'animate-[toast-in_var(--duration-base)_var(--ease-out)]',
              toneClass(item.tone),
            )}
          >
            <p className="min-w-0 flex-1">{item.message}</p>
            {item.action ? (
              <button
                type="button"
                className="min-h-11 shrink-0 px-1 text-sm font-semibold underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
                onClick={() => {
                  item.action?.onClick();
                  dismiss(item.id);
                }}
              >
                {item.action.label}
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}
