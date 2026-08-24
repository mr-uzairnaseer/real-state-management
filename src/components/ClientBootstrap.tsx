'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { api } from '@/lib/api-client';
import type { User } from '@/lib/types';

/** Session restore from server cookie + bootstrap workspace */
export function ClientBootstrap() {
  useEffect(() => {
    let cancelled = false;

    async function boot() {
      try {
        const me = await api.get<{ user: User }>('/api/auth/me');
        if (cancelled) return;
        if (me.user) {
          useAppStore.setState({ currentUserId: me.user.id });
          await useAppStore.getState().bootstrap();
        } else {
          useAppStore.setState({ hydrated: true });
        }
      } catch {
        if (!cancelled) useAppStore.setState({ hydrated: true });
      }
    }

    void boot();
    const timer = window.setTimeout(() => {
      if (!cancelled && !useAppStore.getState().hydrated) {
        useAppStore.setState({ hydrated: true });
      }
    }, 2500);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  return null;
}
