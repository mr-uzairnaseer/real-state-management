'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { formatPKR, formatDate, statusLabel } from '@/lib/calculations';
import { Badge, Card, DataTable, PageHeader, Stat } from '@/components/ui';
import { paymentTone } from '@/lib/helpers';

export default function SalesPage() {
  const units = useAppStore((s) => s.units);
  const projects = useAppStore((s) => s.projects);
  const selectedProjectId = useAppStore((s) => s.selectedProjectId);

  const sold = useMemo(() => {
    let rows = units.filter((u) => u.sale);
    if (selectedProjectId) rows = rows.filter((u) => u.projectId === selectedProjectId);
    return rows;
  }, [units, selectedProjectId]);

  const totalSales = sold.reduce((s, u) => s + (u.sale?.salePrice ?? 0), 0);
  const received = sold.reduce((s, u) => s + (u.sale?.amountReceived ?? 0), 0);
  const outstanding = sold.reduce((s, u) => s + (u.sale?.remainingAmount ?? 0), 0);
  const profit = sold.reduce((s, u) => s + (u.sale?.profit ?? 0), 0);

  return (
    <div>
      <PageHeader
        title="Sold Property Management"
        subtitle="Buyer details, payments, profit and historical sale records"
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 16 }}>
        <Stat label="Sale Value" value={formatPKR(totalSales)} />
        <Stat label="Received" value={formatPKR(received)} tone="green" />
        <Stat label="Outstanding" value={formatPKR(outstanding)} tone="orange" />
        <Stat label="Profit" value={formatPKR(profit)} tone="blue" />
      </div>

      <Card title="Sales ledger">
        <DataTable
          columns={[
            { key: 'unit', label: 'Unit' },
            { key: 'project', label: 'Project' },
            { key: 'buyer', label: 'Buyer' },
            { key: 'price', label: 'Sale Price' },
            { key: 'received', label: 'Received' },
            { key: 'remaining', label: 'Remaining' },
            { key: 'status', label: 'Payment' },
            { key: 'profit', label: 'Profit' },
            { key: 'date', label: 'Sale Date' },
          ]}
          rows={sold.map((u) => ({
            unit: (
              <Link href={`/units/${u.id}`} style={{ fontWeight: 550 }}>
                {u.number}
              </Link>
            ),
            project: projects.find((p) => p.id === u.projectId)?.name ?? '—',
            buyer: u.sale?.buyer.name,
            price: formatPKR(u.sale?.salePrice ?? 0),
            received: formatPKR(u.sale?.amountReceived ?? 0),
            remaining: formatPKR(u.sale?.remainingAmount ?? 0),
            status: (
              <Badge tone={paymentTone(u.sale?.paymentStatus ?? 'pending')}>
                {u.sale?.remainingAmount === 0
                  ? 'SOLD / COMPLETED'
                  : statusLabel(u.sale?.paymentStatus ?? 'pending')}
              </Badge>
            ),
            profit: formatPKR(u.sale?.profit ?? 0),
            date: formatDate(u.sale?.saleDate),
          }))}
        />
      </Card>
    </div>
  );
}
