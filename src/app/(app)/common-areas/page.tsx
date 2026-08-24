'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useAppStore, usePermission } from '@/store/useAppStore';
import { formatPKR, statusLabel } from '@/lib/calculations';
import { Badge, Button, Card, DataTable, PageHeader, ProgressBar, Stat } from '@/components/ui';
import { unitTone } from '@/lib/helpers';
import { isCommonAreaType } from '@/lib/catalog';

export default function CommonAreasPage() {
  const { can } = usePermission();
  const showMoney = can('view_financials');
  const units = useAppStore((s) => s.units);
  const expenses = useAppStore((s) => s.expenses);
  const selectedProjectId = useAppStore((s) => s.selectedProjectId);

  const list = useMemo(() => {
    let rows = units.filter((u) => isCommonAreaType(u.type));
    if (selectedProjectId) rows = rows.filter((u) => u.projectId === selectedProjectId);
    return rows;
  }, [units, selectedProjectId]);

  const avg =
    list.length === 0
      ? 0
      : Math.round((list.reduce((s, u) => s + u.constructionProgress, 0) / list.length) * 10) / 10;
  const spend = expenses
    .filter(
      (e) =>
        list.some((u) => u.id === e.unitId) ||
        (e.scope === 'common' && (!selectedProjectId || e.projectId === selectedProjectId)),
    )
    .reduce((s, e) => s + e.amount, 0);

  return (
    <div>
      <PageHeader
        title="Common areas"
        subtitle="Parking, entrance, boulevard, stairs, elevators, rooftop, façade"
        actions={
          can('manage_units') && (
            <Link href="/units">
              <Button>Add area as unit</Button>
            </Link>
          )
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 16 }}>
        <Stat label="Common areas" value={list.length} />
        <Stat label="Avg completion" value={`${avg}%`} tone="blue" />
        {showMoney && <Stat label="Linked expenses" value={formatPKR(spend)} tone="orange" />}
      </div>

      <Card title="Infrastructure">
        <DataTable
          columns={[
            { key: 'name', label: 'Area' },
            { key: 'type', label: 'Type' },
            { key: 'progress', label: 'Completion' },
            { key: 'status', label: 'Status' },
            ...(showMoney ? [{ key: 'expense', label: 'Expense' }] : []),
            { key: 'notes', label: 'Remarks' },
          ]}
          rows={list.map((u) => ({
            name: (
              <Link href={`/units/${u.id}`} style={{ fontWeight: 550 }}>
                {u.number}
              </Link>
            ),
            type: statusLabel(u.type),
            progress: <ProgressBar value={u.constructionProgress} />,
            status: <Badge tone={unitTone(u.status)}>{statusLabel(u.status)}</Badge>,
            ...(showMoney
              ? {
                  expense: formatPKR(
                    u.expenses + expenses.filter((e) => e.unitId === u.id).reduce((s, e) => s + e.amount, 0),
                  ),
                }
              : {}),
            notes: u.notes || '—',
          }))}
        />
      </Card>
    </div>
  );
}
