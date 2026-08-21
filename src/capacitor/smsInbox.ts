import { Capacitor } from '@capacitor/core';
import { MessageType, SMSInboxReader, type SMSFilter, type SMSObject } from 'capacitor-sms-inbox';
import {
  buildAddressRegex,
  filterMessagesBySender,
  isNumericSender,
} from '../lib/smsSender';

export const SMS_INBOX_MAX_COUNT = 300;

export type SmsInboxPermission = 'granted' | 'denied' | 'unavailable';

export interface InboxSms {
  id: number;
  address: string;
  date: number;
  body: string;
}

export function isSmsInboxAvailable(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
}

export async function requestSmsInboxPermission(): Promise<SmsInboxPermission> {
  if (!isSmsInboxAvailable()) {
    return 'unavailable';
  }
  const status = await SMSInboxReader.requestPermissions();
  return status.sms === 'granted' ? 'granted' : 'denied';
}

function mapSms(sms: SMSObject): InboxSms {
  return {
    id: sms.id,
    address: sms.address ?? '',
    date: sms.date,
    body: sms.body ?? '',
  };
}

function inboxFilter(partial: Omit<SMSFilter, 'type'>): SMSFilter {
  return {
    type: MessageType.INBOX,
    maxCount: SMS_INBOX_MAX_COUNT,
    ...partial,
  };
}

async function fetchInbox(filter: SMSFilter): Promise<InboxSms[]> {
  const { smsList } = await SMSInboxReader.getSMSList({
    projection: {
      id: true,
      address: true,
      date: true,
      body: true,
      subject: false,
      threadId: false,
      type: false,
    },
    filter,
  });
  return smsList.map(mapSms);
}

/**
 * Load inbox rows for one sender since `minDate`.
 * The plugin applies addressRegex after LIMIT, so we always re-filter in TS
 * and fall back to a date-only query when the native regex misses variants.
 */
export async function querySmsInbox(input: {
  sender: string;
  minDate: number;
}): Promise<InboxSms[]> {
  if (!isSmsInboxAvailable()) {
    throw new Error('SMS inbox is only available on the Android app.');
  }

  const sender = input.sender.trim();
  if (!sender) {
    throw new Error('Enter a sender.');
  }

  const base = { minDate: input.minDate };
  const targeted = isNumericSender(sender)
    ? inboxFilter({ ...base, addressRegex: buildAddressRegex(sender) })
    : inboxFilter({ ...base, address: sender });

  const first = filterMessagesBySender(await fetchInbox(targeted), sender);
  if (first.length > 0) {
    return first;
  }

  const fallback = filterMessagesBySender(
    await fetchInbox(inboxFilter(base)),
    sender,
  );
  return fallback;
}
