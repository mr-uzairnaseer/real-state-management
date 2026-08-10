'use client';

import { useAppStore, usePermission } from '@/store/useAppStore';
import { Button, Card, PageHeader } from '@/components/ui';

export default function SettingsPage() {
  const { isAdmin } = usePermission();
  const resetDemoData = useAppStore((s) => s.resetDemoData);

  if (!isAdmin) {
    return (
      <div>
        <PageHeader title="Settings" />
        <Card title="Restricted">Only Main Admin can change settings.</Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Settings" subtitle="Workspace preferences (client-side)" />

      <Card title="Data">
        <p style={{ color: 'var(--text-secondary)', marginBottom: 12, fontSize: 13 }}>
          Workspace data is stored in this browser: structured records in localStorage,
          pictures/receipts in IndexedDB. Open multiple tabs — changes sync live via
          BroadcastChannel. No server or database is required for Vercel.
        </p>
        <Button
          variant="danger"
          onClick={() => {
            if (confirm('Reset all data to demo seed? This cannot be undone.')) {
              resetDemoData();
            }
          }}
        >
          Reset to demo data
        </Button>
      </Card>

      <Card title="Deploy">
        <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
          Deploy to Vercel with zero add-ons: connect the GitHub repo, keep the default
          Next.js build, add no environment variables. Rent due/overdue alerts refresh
          automatically whenever the app loads.
        </p>
      </Card>
    </div>
  );
}
