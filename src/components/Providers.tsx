'use client';

import { ClientBootstrap } from '@/components/ClientBootstrap';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ClientBootstrap />
      {children}
    </>
  );
}
