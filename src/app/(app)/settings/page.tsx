'use client';

import { useAppStore, usePermission } from '@/store/useAppStore';
import { Button, Card, PageHeader } from '@/components/ui';

export default function SettingsPage() {
  const { can } = usePermission();
  const resetDemoData = useAppStore((s) => s.resetDemoData);

  if (!can('manage_settings')) {
    return (
      <div>
        <PageHeader title="Settings" />
        <Card title="Restricted">Only the project owner can change settings.</Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Settings" subtitle="Server-backed workspace" />

      <Card title="Database">
        <p style={{ color: 'var(--text-secondary)', marginBottom: 12, fontSize: 13 }}>
          All projects, units, finances, construction progress and media metadata are stored in
          PostgreSQL on the server. Uploaded files are saved under <code>/uploads</code>. Every
          signed-in user shares the same live data.
        </p>
        <Button
          variant="danger"
          onClick={() => {
            if (confirm('Reset database to demo seed? This cannot be undone.')) {
              void resetDemoData();
            }
          }}
        >
          Reset to demo data
        </Button>
      </Card>

      <Card title="Deploy on a server">
        <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
          Use Docker Compose (<code>docker compose up --build</code>) or run PostgreSQL +{' '}
          <code>npm run db:setup && npm run build && npm start</code>. Set{' '}
          <code>DATABASE_URL</code> and <code>JWT_SECRET</code> in the environment.
        </p>
      </Card>
    </div>
  );
}
