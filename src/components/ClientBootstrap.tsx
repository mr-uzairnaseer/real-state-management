'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { subscribeTabSync } from '@/lib/storage';

/**
 * Client-only bootstrap:
 * 1) Rehydrate zustand from localStorage (skipHydration pattern — safe for Next.js)
 * 2) Restore media blobs from IndexedDB
 * 3) Run payment alerts
 * 4) Multi-tab sync
 */
export function ClientBootstrap() {
  const [ready, setReady] = useState(false);
  const restoreBlobs = useAppStore((s) => s.restoreBlobs);
  const runPaymentAlerts = useAppStore((s) => s.runPaymentAlerts);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      try {
        await useAppStore.persist.rehydrate();
      } catch (err) {
        console.error('rehydrate failed', err);
      }
      if (cancelled) return;

      useAppStore.setState({ hydrated: true });
      setReady(true);

      try {
        await restoreBlobs();
        runPaymentAlerts();
      } catch (err) {
        console.error('post-hydrate setup failed', err);
      }
    }

    void boot();

    const unsub = subscribeTabSync(() => {
      void Promise.resolve(useAppStore.persist.rehydrate())
        .then(async () => {
          await useAppStore.getState().restoreBlobs();
          useAppStore.getState().runPaymentAlerts();
        })
        .catch((err) => console.error('tab sync failed', err));
    });

    // Absolute fallback — never leave UI stuck
    const timer = window.setTimeout(() => {
      if (!cancelled) {
        useAppStore.setState({ hydrated: true });
        setReady(true);
      }
    }, 1200);

    return () => {
      cancelled = true;
      unsub();
      window.clearTimeout(timer);
    };
  }, [restoreBlobs, runPaymentAlerts]);

  // silence unused — ready reserved for future splash
  void ready;

  return null;
}
