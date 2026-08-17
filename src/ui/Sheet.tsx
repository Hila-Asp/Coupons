import {
  type PointerEvent,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';
import { cx } from '../lib/cx';

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

const DISMISS_DISTANCE = 88;

export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
  className,
}: SheetProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef(0);
  const dragging = useRef(false);
  const [offset, setOffset] = useState(0);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (!open) {
      setEntered(false);
      setOffset(0);
      return;
    }

    const frame = requestAnimationFrame(() => setEntered(true));
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      panelRef.current?.focus();
    }
  }, [open]);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    dragging.current = true;
    dragStartY.current = event.clientY;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) {
      return;
    }
    const next = Math.max(0, event.clientY - dragStartY.current);
    setOffset(next);
  };

  const endDrag = () => {
    if (!dragging.current) {
      return;
    }
    dragging.current = false;
    if (offset > DISMISS_DISTANCE) {
      onClose();
      return;
    }
    setOffset(0);
  };

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button
        type="button"
        aria-label="Close"
        className={cx(
          'absolute inset-0 bg-black/40',
          'transition-opacity duration-[var(--duration-base)] ease-[var(--ease-out)]',
          entered ? 'opacity-100' : 'opacity-0',
        )}
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        className={cx(
          'relative z-10 flex max-h-[min(92dvh,880px)] w-full max-w-lg flex-col',
          'rounded-t-xl border border-b-0 border-line bg-surface shadow-[var(--shadow-lg)]',
          'pb-[env(safe-area-inset-bottom)]',
          'transition-transform duration-[var(--duration-slow)] ease-[var(--ease-out)]',
          'focus:outline-none',
          entered ? 'translate-y-0' : 'translate-y-full',
          className,
        )}
        style={
          offset > 0
            ? { transform: `translateY(${offset}px)`, transitionDuration: '0ms' }
            : undefined
        }
      >
        <div
          className="flex cursor-grab touch-none flex-col items-center pt-2 active:cursor-grabbing"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <div className="mb-1 h-1 w-10 rounded-full bg-line-strong" />
          {title ? (
            <h2
              id={titleId}
              className="w-full min-w-0 truncate px-5 pb-2 pt-2 text-center text-base font-semibold text-ink"
            >
              {title}
            </h2>
          ) : (
            <div className="h-3" />
          )}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4">{children}</div>
        {footer ? (
          <div className="flex flex-col gap-2 border-t border-line px-5 py-3">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
