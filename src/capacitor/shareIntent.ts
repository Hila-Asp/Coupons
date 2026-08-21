import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { CapacitorShareTarget } from '@capgo/capacitor-share-target';
import {
  hasShareContent,
  sharePayloadToQuery,
  shareQueryFromAppUrl,
  type ShareQuery,
} from './shareQuery';

type ShareHandler = (query: ShareQuery) => void;

let started = false;
let handler: ShareHandler | null = null;
let pending: ShareQuery | null = null;

function dispatch(query: ShareQuery): void {
  if (!hasShareContent(query)) {
    return;
  }
  if (handler) {
    handler(query);
    return;
  }
  pending = query;
}

export function startShareIntentBridge(): void {
  if (started || !Capacitor.isNativePlatform()) {
    return;
  }
  started = true;

  void CapacitorShareTarget.addListener('shareReceived', (event) => {
    dispatch(
      sharePayloadToQuery({
        title: event.title,
        texts: event.texts,
      }),
    );
  });

  void App.addListener('appUrlOpen', (event) => {
    const query = shareQueryFromAppUrl(event.url);
    if (query) {
      dispatch(query);
    }
  });
}

export function subscribeShareIntent(next: ShareHandler): () => void {
  handler = next;
  if (pending) {
    const query = pending;
    pending = null;
    next(query);
  }
  return () => {
    if (handler === next) {
      handler = null;
    }
  };
}
