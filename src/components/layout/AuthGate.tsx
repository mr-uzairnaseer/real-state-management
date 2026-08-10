'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/store/useAppStore';
import { AppShell } from './AppShell';

export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const currentUserId = useAppStore((s) => s.currentUserId);
  const hydrated = useAppStore((s) => s.hydrated);

  useEffect(() => {
    // Safety: never hang on loading forever
    const timer = window.setTimeout(() => {
      if (!useAppStore.getState().hydrated) {
        useAppStore.setState({ hydrated: true });
      }
    }, 1500);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (hydrated && !currentUserId) {
      router.replace('/login');
    }
  }, [hydrated, currentUserId, router]);

  if (!hydrated) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          color: 'var(--text-tertiary)',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        Loading workspace…
      </div>
    );
  }

  if (!currentUserId) return null;

  return <AppShell>{children}</AppShell>;
}
