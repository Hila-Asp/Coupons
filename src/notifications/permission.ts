import { Capacitor } from '@capacitor/core';

export type NotificationPermissionState =
  | NotificationPermission
  | 'unsupported';

export function getNotificationPermission(): NotificationPermissionState {
  if (
    Capacitor.isNativePlatform() ||
    typeof window === 'undefined' ||
    !('Notification' in window)
  ) {
    return 'unsupported';
  }
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (
    Capacitor.isNativePlatform() ||
    typeof window === 'undefined' ||
    !('Notification' in window)
  ) {
    return 'unsupported';
  }
  try {
    const result = await Notification.requestPermission();
    return result;
  } catch {
    return Notification.permission;
  }
}
