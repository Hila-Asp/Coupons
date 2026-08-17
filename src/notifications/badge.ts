type BadgingNavigator = Navigator & {
  setAppBadge?: (contents?: number) => Promise<void>;
  clearAppBadge?: () => Promise<void>;
};

export async function setAppBadge(count: number): Promise<void> {
  const nav = navigator as BadgingNavigator;
  try {
    if (count > 0) {
      if (typeof nav.setAppBadge === 'function') {
        await nav.setAppBadge(count);
      }
      return;
    }
    if (typeof nav.clearAppBadge === 'function') {
      await nav.clearAppBadge();
    }
  } catch {
    return;
  }
}

export async function clearAppBadge(): Promise<void> {
  await setAppBadge(0);
}
