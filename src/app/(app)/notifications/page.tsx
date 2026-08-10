'use client';

import { useAppStore } from '@/store/useAppStore';
import { formatDateTime } from '@/lib/calculations';
import { Badge, Button, Card, PageHeader } from '@/components/ui';

const toneMap: Record<string, 'blue' | 'green' | 'red' | 'orange' | 'yellow' | 'purple' | 'neutral'> = {
  rent_due: 'orange',
  rent_overdue: 'red',
  payment_due: 'orange',
  new_booking: 'purple',
  new_sale: 'green',
  construction_update: 'blue',
  expense_added: 'yellow',
  milestone: 'green',
  manager_report: 'blue',
  general: 'neutral',
};

export default function NotificationsPage() {
  const notifications = useAppStore((s) => s.notifications);
  const markNotificationRead = useAppStore((s) => s.markNotificationRead);
  const markAllNotificationsRead = useAppStore((s) => s.markAllNotificationsRead);

  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div>
      <PageHeader
        title="Notifications & Alerts"
        subtitle={`${unread} unread`}
        actions={
          <Button variant="secondary" onClick={markAllNotificationsRead}>
            Mark all read
          </Button>
        }
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {notifications.map((n) => (
          <Card key={n.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  {!n.read && (
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: 'var(--accent-blue)',
                      }}
                    />
                  )}
                  <strong>{n.title}</strong>
                  <Badge tone={toneMap[n.type] ?? 'neutral'}>{n.type.replace(/_/g, ' ')}</Badge>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{n.message}</p>
                <div
                  style={{
                    marginTop: 8,
                    fontSize: 11,
                    color: 'var(--text-tertiary)',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {formatDateTime(n.createdAt)}
                </div>
              </div>
              {!n.read && (
                <Button size="sm" variant="secondary" onClick={() => markNotificationRead(n.id)}>
                  Mark read
                </Button>
              )}
            </div>
          </Card>
        ))}
        {notifications.length === 0 && <Card title="All clear">No notifications</Card>}
      </div>
    </div>
  );
}
