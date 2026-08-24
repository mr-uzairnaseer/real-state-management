'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { usePermission } from '@/store/useAppStore';
import { canAccessPath, ROLE_HOME } from '@/lib/access';

export function RouteGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { role } = usePermission();

  useEffect(() => {
    if (!role) return;
    if (!canAccessPath(role, pathname)) {
      router.replace(ROLE_HOME[role]);
    }
  }, [role, pathname, router]);

  if (role && !canAccessPath(role, pathname)) {
    return (
      <div
        style={{
          minHeight: 240,
          display: 'grid',
          placeItems: 'center',
          color: 'var(--text-tertiary)',
          fontSize: 14,
        }}
      >
        This area is not part of your workspace.
      </div>
    );
  }

  return <>{children}</>;
}
