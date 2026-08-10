'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useAppStore, usePermission } from '@/store/useAppStore';
import { formatPKR, formatDate, statusLabel } from '@/lib/calculations';
import { Badge, Button, Card, DataTable, PageHeader, Stat } from '@/components/ui';
import { paymentTone } from '@/lib/helpers';

export default function RentalsPage() {
  const { isAdmin, isManager } = usePermission();
  const units = useAppStore((s) => s.units);
  const projects = useAppStore((s) => s.projects);
  const selectedProjectId = useAppStore((s) => s.selectedProjectId);
  const recordRentPayment = useAppStore((s) => s.recordRentPayment);

  const rented = useMemo(() => {
    let rows = units.filter((u) => u.rental);
    if (selectedProjectId) rows = rows.filter((u) => u.projectId === selectedProjectId);
    return rows;
  }, [units, selectedProjectId]);

  const payments = rented.flatMap((u) =>
    (u.rental?.paymentHistory ?? []).map((p) => ({ unit: u, payment: p })),
  );

  const received = payments.reduce((s, x) => s + x.payment.paidAmount, 0);
  const pending = payments
    .filter((x) => x.payment.status === 'pending')
    .reduce((s, x) => s + (x.payment.amount - x.payment.paidAmount), 0);
  const overdue = payments
    .filter((x) => x.payment.status === 'overdue')
    .reduce((s, x) => s + (x.payment.amount - x.payment.paidAmount), 0);

  return (
    <div>
      <PageHeader
        title="Rental Property Management"
        subtitle="Rent received · pending · overdue"
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 16 }}>
        <Stat label="Rent Received" value={formatPKR(received)} tone="green" />
        <Stat label="Rent Pending" value={formatPKR(pending)} tone="orange" />
        <Stat label="Overdue" value={formatPKR(overdue)} tone="red" />
        <Stat label="Rented Units" value={rented.length} tone="blue" />
      </div>

      <Card title="Monthly rental status">
        <DataTable
          columns={[
            { key: 'unit', label: 'Unit' },
            { key: 'tenant', label: 'Tenant' },
            { key: 'rent', label: 'Monthly Rent' },
            { key: 'month', label: 'Month' },
            { key: 'due', label: 'Due Date' },
            { key: 'status', label: 'Status' },
            { key: 'paid', label: 'Paid' },
            { key: 'actions', label: '' },
          ]}
          rows={payments.map(({ unit, payment }) => ({
            unit: (
              <Link href={`/units/${unit.id}`} style={{ fontWeight: 550 }}>
                {unit.number}
              </Link>
            ),
            tenant: unit.rental?.tenant.name,
            rent: formatPKR(unit.rental?.monthlyRent ?? 0),
            month: payment.month,
            due: formatDate(payment.dueDate),
            status: (
              <Badge tone={paymentTone(payment.status)}>
                {statusLabel(payment.status)}
              </Badge>
            ),
            paid: payment.paidDate ? formatDate(payment.paidDate) : '—',
            actions:
              (isAdmin || isManager) && payment.status !== 'paid' ? (
                <Button
                  size="sm"
                  onClick={() =>
                    recordRentPayment(unit.id, payment.id, payment.amount, new Date().toISOString())
                  }
                >
                  Mark paid
                </Button>
              ) : null,
          }))}
        />
      </Card>

      <Card title="Tenant overview">
        <DataTable
          columns={[
            { key: 'unit', label: 'Unit' },
            { key: 'project', label: 'Project' },
            { key: 'tenant', label: 'Tenant' },
            { key: 'contact', label: 'Contact' },
            { key: 'rent', label: 'Rent' },
            { key: 'deposit', label: 'Deposit' },
            { key: 'start', label: 'Start' },
          ]}
          rows={rented.map((u) => ({
            unit: <Link href={`/units/${u.id}`}>{u.number}</Link>,
            project: projects.find((p) => p.id === u.projectId)?.name ?? '—',
            tenant: u.rental?.tenant.name,
            contact: u.rental?.tenant.contact,
            rent: formatPKR(u.rental?.monthlyRent ?? 0),
            deposit: formatPKR(u.rental?.securityDeposit ?? 0),
            start: formatDate(u.rental?.startDate),
          }))}
        />
      </Card>
    </div>
  );
}
