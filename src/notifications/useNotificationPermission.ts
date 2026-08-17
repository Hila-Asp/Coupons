import { useCallback, useEffect, useState } from 'react';
import {
  getNotificationPermission,
  requestNotificationPermission,
  type NotificationPermissionState,
} from './permission';

export function useNotificationPermission(): {
  permission: NotificationPermissionState;
  request: () => Promise<NotificationPermissionState>;
} {
  const [permission, setPermission] =
    useState<NotificationPermissionState>('unsupported');

  useEffect(() => {
    setPermission(getNotificationPermission());
  }, []);

  const request = useCallback(async () => {
    const next = await requestNotificationPermission();
    setPermission(next);
    return next;
  }, []);

  return { permission, request };
}
