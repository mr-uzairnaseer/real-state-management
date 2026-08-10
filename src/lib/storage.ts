'use client';

import type { StateStorage } from 'zustand/middleware';

const CHANNEL = 'estate-progress-sync';
let applyingRemote = false;
let channel: BroadcastChannel | null = null;

function getChannel() {
  if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') {
    return null;
  }
  if (!channel) channel = new BroadcastChannel(CHANNEL);
  return channel;
}

/** Safe browser storage — never touches localStorage on the server */
export function createSyncedStorage(): StateStorage {
  return {
    getItem: (name) => {
      if (typeof window === 'undefined') return null;
      try {
        return window.localStorage.getItem(name);
      } catch {
        return null;
      }
    },
    setItem: (name, value) => {
      if (typeof window === 'undefined') return;
      try {
        window.localStorage.setItem(name, value);
      } catch {
        try {
          window.localStorage.removeItem(name);
          window.localStorage.setItem(name, value);
        } catch {
          // ignore quota errors
        }
      }
      if (!applyingRemote) {
        try {
          getChannel()?.postMessage({ type: 'rems-persist', name, ts: Date.now() });
        } catch {
          // ignore
        }
      }
    },
    removeItem: (name) => {
      if (typeof window === 'undefined') return;
      try {
        window.localStorage.removeItem(name);
      } catch {
        // ignore
      }
    },
  };
}

export function subscribeTabSync(onRemoteWrite: () => void) {
  if (typeof window === 'undefined') return () => undefined;
  const ch = getChannel();
  if (!ch) return () => undefined;

  const handler = (event: MessageEvent) => {
    if (event.data?.type !== 'rems-persist') return;
    applyingRemote = true;
    try {
      onRemoteWrite();
    } finally {
      window.setTimeout(() => {
        applyingRemote = false;
      }, 50);
    }
  };

  ch.addEventListener('message', handler);
  return () => ch.removeEventListener('message', handler);
}
