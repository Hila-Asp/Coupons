import { describe, expect, it } from 'vitest';
import {
  isSmsInboxAvailable,
  querySmsInbox,
  requestSmsInboxPermission,
} from './smsInbox';

const LOCAL = '0541234567';

describe('isSmsInboxAvailable', () => {
  it('is a no-op on web', () => {
    expect(isSmsInboxAvailable()).toBe(false);
  });
});

describe('requestSmsInboxPermission', () => {
  it('does not query permissions on web', async () => {
    await expect(requestSmsInboxPermission()).resolves.toBe('unavailable');
  });
});

describe('querySmsInbox', () => {
  it('rejects on web without touching the inbox', async () => {
    await expect(
      querySmsInbox({ sender: LOCAL, minDate: 0 }),
    ).rejects.toThrow(/Android app/i);
  });
});
