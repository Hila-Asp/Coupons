/* Best-effort Periodic Background Sync handler. Feature-detect everything. */
const EXPIRY_MS = 60 * 24 * 60 * 60 * 1000;
const TAG = 'expiry-scan';
const COOLDOWN_MS = 24 * 60 * 60 * 1000;

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('voucher-manager');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function getAll(db, storeName) {
  return new Promise((resolve, reject) => {
    if (!db.objectStoreNames.contains(storeName)) {
      resolve([]);
      return;
    }
    const tx = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).getAll();
    req.onsuccess = () => resolve(req.result ?? []);
    req.onerror = () => reject(req.error);
  });
}

function putVoucher(db, voucher) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('vouchers', 'readwrite');
    const req = tx.objectStore('vouchers').put(voucher);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function scanAndNotify() {
  const db = await openDb();
  try {
    const vouchers = await getAll(db, 'vouchers');
    const companies = await getAll(db, 'companies');
    const names = new Map(companies.map((company) => [company.id, company.name]));
    const now = Date.now();
    const relevant = vouchers.filter((voucher) => {
      if (voucher.status !== 'active' || !(voucher.balance > 0) || voucher.expiresAt == null) {
        return false;
      }
      return voucher.expiresAt <= now + EXPIRY_MS;
    });

    if (self.navigator.setAppBadge) {
      if (relevant.length > 0) {
        await self.navigator.setAppBadge(relevant.length);
      } else if (self.navigator.clearAppBadge) {
        await self.navigator.clearAppBadge();
      }
    }

    for (const voucher of relevant) {
      if (voucher.lastNotifiedAt && now - voucher.lastNotifiedAt < COOLDOWN_MS) {
        continue;
      }
      const name = names.get(voucher.companyId) ?? 'Voucher';
      const expired = voucher.expiresAt < now;
      await self.registration.showNotification(
        expired ? 'Voucher expired' : 'Voucher expiring soon',
        {
          body: `${name} · ₪${Number(voucher.balance).toFixed(2)}`,
          tag: `expiry-${voucher.id}`,
          icon: '/icons/icon-192.png',
          data: { url: '/' },
        },
      );
      try {
        await putVoucher(db, {
          ...voucher,
          lastNotifiedAt: now,
          updatedAt: now,
        });
      } catch {
        // ignore
      }
    }
  } finally {
    db.close();
  }
}

self.addEventListener('periodicsync', (event) => {
  if (event.tag === TAG) {
    event.waitUntil(scanAndNotify().catch(() => undefined));
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ('focus' in client) {
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(target);
        }
        return undefined;
      }),
  );
});
