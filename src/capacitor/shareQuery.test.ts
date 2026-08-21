import { describe, expect, it } from 'vitest';
import {
  hasShareContent,
  sharePayloadToQuery,
  shareQueryFromAppUrl,
  shareQueryToSearch,
} from './shareQuery';

describe('sharePayloadToQuery', () => {
  it('maps title and SMS text the same way as PWA share_target', () => {
    const query = sharePayloadToQuery({
      title: 'Messages',
      texts: ['השובר שלך ל־שופרסל\nhttps://myconsumers.pluxee.co.il/b?abc'],
    });

    expect(query.title).toBe('Messages');
    expect(query.text).toContain('שופרסל');
    expect(query.url).toBeUndefined();
  });

  it('promotes a standalone http(s) text item to url', () => {
    const query = sharePayloadToQuery({
      texts: ['https://myconsumers.pluxee.co.il/b?abc'],
    });

    expect(query.text).toBe('https://myconsumers.pluxee.co.il/b?abc');
    expect(query.url).toBe('https://myconsumers.pluxee.co.il/b?abc');
  });
});

describe('shareQueryToSearch', () => {
  it('emits title, text, and url query params', () => {
    const search = shareQueryToSearch({
      title: 'SMS',
      text: 'hello',
      url: 'https://example.com',
    });
    const params = new URLSearchParams(search);

    expect(params.get('title')).toBe('SMS');
    expect(params.get('text')).toBe('hello');
    expect(params.get('url')).toBe('https://example.com');
  });
});

describe('shareQueryFromAppUrl', () => {
  it('reads /share query params from a Capacitor https URL', () => {
    const query = shareQueryFromAppUrl(
      'https://localhost/share?title=SMS&text=hello&url=https%3A%2F%2Fexample.com',
    );

    expect(query).toEqual({
      title: 'SMS',
      text: 'hello',
      url: 'https://example.com',
    });
  });

  it('ignores non-share deep links', () => {
    expect(shareQueryFromAppUrl('https://localhost/settings')).toBeNull();
  });
});

describe('hasShareContent', () => {
  it('is false when every field is empty', () => {
    expect(hasShareContent({})).toBe(false);
  });
});
