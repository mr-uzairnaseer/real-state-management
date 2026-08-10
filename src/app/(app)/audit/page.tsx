'use client';

import { useAppStore, usePermission } from '@/store/useAppStore';
import { formatDateTime } from '@/lib/calculations';
import { Card, DataTable, PageHeader } from '@/components/ui';

export default function AuditPage() {
  const { isAdmin } = usePermission();
  const auditLog = useAppStore((s) => s.auditLog);

  if (!isAdmin) {
    return (
      <div>
        <PageHeader title="Audit Log" />
        <Card title="Restricted">Only Main Admin can view audit history.</Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Activity / Audit History"
        subtitle="Who changed what — previous → new value"
      />
      <Card title="Recent changes">
        <DataTable
          columns={[
            { key: 'when', label: 'Date & Time' },
            { key: 'who', label: 'User' },
            { key: 'action', label: 'Action' },
            { key: 'entity', label: 'Entity' },
            { key: 'field', label: 'Field' },
            { key: 'prev', label: 'Previous' },
            { key: 'next', label: 'New' },
          ]}
          rows={auditLog.map((a) => ({
            when: formatDateTime(a.createdAt),
            who: a.userName,
            action: a.action,
            entity: `${a.entityType} (${a.entityId.slice(0, 8)})`,
            field: a.field ?? '—',
            prev: (
              <span style={{ fontSize: 11, color: 'var(--text-tertiary)', wordBreak: 'break-all' }}>
                {a.previousValue ?? '—'}
              </span>
            ),
            next: (
              <span style={{ fontSize: 11, wordBreak: 'break-all' }}>{a.newValue ?? '—'}</span>
            ),
          }))}
        />
      </Card>
    </div>
  );
}
