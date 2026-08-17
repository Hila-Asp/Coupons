export const PERIODIC_SYNC_TAG = 'expiry-scan';
export const PERIODIC_SYNC_MIN_INTERVAL_MS = 12 * 60 * 60 * 1000;

interface PeriodicSyncManager {
  register(tag: string, options?: { minInterval: number }): Promise<void>;
  unregister(tag: string): Promise<void>;
  getTags(): Promise<string[]>;
}

type PeriodicSyncRegistration = ServiceWorkerRegistration & {
  periodicSync?: PeriodicSyncManager;
};

export async function registerPeriodicSync(): Promise<boolean> {
  try {
    if (!('serviceWorker' in navigator)) {
      return false;
    }

    const registration = (await navigator.serviceWorker.ready) as PeriodicSyncRegistration;
    const periodicSync = registration.periodicSync;
    if (!periodicSync) {
      return false;
    }

    if (navigator.permissions?.query) {
      try {
        const status = await navigator.permissions.query({
          name: 'periodic-background-sync' as PermissionName,
        });
        if (status.state === 'denied') {
          return false;
        }
      } catch {
        // Permission name is not recognized in every browser.
      }
    }

    await periodicSync.register(PERIODIC_SYNC_TAG, {
      minInterval: PERIODIC_SYNC_MIN_INTERVAL_MS,
    });
    return true;
  } catch {
    return false;
  }
}
