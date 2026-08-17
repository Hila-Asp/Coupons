import { cx } from '../lib/cx';

export function PageSpinner({ className }: { className?: string }) {
  return (
    <div
      className={cx('flex justify-center py-16', className)}
      role="status"
      aria-label="Loading"
    >
      <div
        className="size-6 animate-spin rounded-full border-2 border-line border-t-accent"
        aria-hidden="true"
      />
    </div>
  );
}

export function CardSkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-3" aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="h-24 animate-pulse rounded-lg border border-line bg-surface"
        />
      ))}
    </div>
  );
}
