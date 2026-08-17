import { useEffect } from 'react';

export function useWakeLock(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) {
      return;
    }
    if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) {
      return;
    }

    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    const acquire = async () => {
      if (cancelled || document.visibilityState !== 'visible') {
        return;
      }
      try {
        sentinel = await navigator.wakeLock.request('screen');
        sentinel.addEventListener('release', () => {
          sentinel = null;
        });
      } catch {
        sentinel = null;
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void acquire();
      }
    };

    void acquire();
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (sentinel) {
        void sentinel.release().catch(() => undefined);
        sentinel = null;
      }
    };
  }, [enabled]);
}
