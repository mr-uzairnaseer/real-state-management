'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function ClusterTabs({ items }: { items: { href: string; label: string }[] }) {
  const pathname = usePathname();
  return (
    <div
      style={{
        display: 'flex',
        gap: 4,
        marginBottom: 16,
        padding: 4,
        background: 'var(--bg-tertiary)',
        borderRadius: 10,
        width: 'fit-content',
        maxWidth: '100%',
        flexWrap: 'wrap',
      }}
    >
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + '/');
        return (
          <Link
            key={item.href}
            href={item.href}
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: active ? 600 : 450,
              background: active ? 'var(--bg-primary)' : 'transparent',
              color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
              boxShadow: active ? 'var(--shadow-sm)' : 'none',
            }}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
