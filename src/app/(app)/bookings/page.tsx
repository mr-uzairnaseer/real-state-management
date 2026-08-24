'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useAppStore, usePermission } from '@/store/useAppStore';
import { formatPKR, formatDate, statusLabel } from '@/lib/calculations';
import {
  Badge,
  Button,
  Card,
  DataTable,
  Input,
  Modal,
  PageHeader,
  Select,
  Stat,
  Textarea,
} from '@/components/ui';
import { ClusterTabs } from '@/components/layout/ClusterTabs';
import { CLIENT_TABS } from '@/lib/access';

export default function BookingsPage() {
  const { can } = usePermission();
  const units = useAppStore((s) => s.units);
  const projects = useAppStore((s) => s.projects);
  const selectedProjectId = useAppStore((s) => s.selectedProjectId);
  const saveBooking = useAppStore((s) => s.saveBooking);

  const booked = useMemo(() => {
    let rows = units.filter((u) => u.booking || u.status === 'booked' || u.status === 'reserved');
    if (selectedProjectId) rows = rows.filter((u) => u.projectId === selectedProjectId);
    return rows.filter((u) => u.booking);
  }, [units, selectedProjectId]);

  const available = useMemo(() => {
    let rows = units.filter((u) => u.status === 'available');
    if (selectedProjectId) rows = rows.filter((u) => u.projectId === selectedProjectId);
    return rows;
  }, [units, selectedProjectId]);

  const advanceTotal = booked.reduce((s, u) => s + (u.booking?.advanceAmount ?? 0), 0);
  const remainingTotal = booked.reduce((s, u) => s + (u.booking?.remainingAmount ?? 0), 0);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    unitId: '',
    customerName: '',
    contact: '',
    totalPrice: '',
    advanceAmount: '',
    expectedPaymentDate: '',
    notes: '',
  });

  return (
    <div>
      <ClusterTabs items={CLIENT_TABS} />
      <PageHeader
        title="Bookings"
        subtitle="Advances · remaining balance · reservation status"
        actions={
          can('record_booking') && (
            <Button
              onClick={() => {
                setForm({
                  unitId: available[0]?.id ?? '',
                  customerName: '',
                  contact: '',
                  totalPrice: String(available[0]?.salePrice ?? ''),
                  advanceAmount: '',
                  expectedPaymentDate: '',
                  notes: '',
                });
                setOpen(true);
              }}
            >
              New booking
            </Button>
          )
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 16 }}>
        <Stat label="Active Bookings" value={booked.length} tone="blue" />
        <Stat label="Advance Collected" value={formatPKR(advanceTotal)} tone="green" />
        <Stat label="Remaining" value={formatPKR(remainingTotal)} tone="orange" />
      </div>

      <Card title="Bookings">
        <DataTable
          columns={[
            { key: 'unit', label: 'Shop / Unit' },
            { key: 'customer', label: 'Customer' },
            { key: 'contact', label: 'Contact' },
            { key: 'total', label: 'Total Price' },
            { key: 'advance', label: 'Advance' },
            { key: 'remaining', label: 'Remaining' },
            { key: 'status', label: 'Status' },
            { key: 'date', label: 'Booking Date' },
          ]}
          rows={booked.map((u) => ({
            unit: (
              <Link href={`/units/${u.id}`} style={{ fontWeight: 550 }}>
                {u.number}
              </Link>
            ),
            customer: u.booking?.customerName,
            contact: u.booking?.contact,
            total: formatPKR(u.booking?.totalPrice ?? 0),
            advance: formatPKR(u.booking?.advanceAmount ?? 0),
            remaining: formatPKR(u.booking?.remainingAmount ?? 0),
            status: <Badge tone="purple">{statusLabel(u.booking?.status ?? 'booked')}</Badge>,
            date: formatDate(u.booking?.bookingDate),
          }))}
        />
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Create Booking">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Select
            label="Available unit"
            value={form.unitId}
            onChange={(e) => {
              const unit = units.find((u) => u.id === e.target.value);
              setForm({
                ...form,
                unitId: e.target.value,
                totalPrice: String(unit?.salePrice ?? form.totalPrice),
              });
            }}
          >
            {available.map((u) => (
              <option key={u.id} value={u.id}>
                {u.number} — {projects.find((p) => p.id === u.projectId)?.name}
              </option>
            ))}
          </Select>
          <Input label="Customer name" value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} />
          <Input label="Contact" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} />
          <Input label="Total price" type="number" value={form.totalPrice} onChange={(e) => setForm({ ...form, totalPrice: e.target.value })} />
          <Input label="Booking / advance amount" type="number" value={form.advanceAmount} onChange={(e) => setForm({ ...form, advanceAmount: e.target.value })} />
          <Input label="Expected payment date" type="date" value={form.expectedPaymentDate} onChange={(e) => setForm({ ...form, expectedPaymentDate: e.target.value })} />
          <Textarea label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <Button
            onClick={() => {
              if (!form.unitId || !form.customerName) return;
              const total = Number(form.totalPrice) || 0;
              const advance = Number(form.advanceAmount) || 0;
              saveBooking(form.unitId, {
                customerName: form.customerName,
                contact: form.contact,
                totalPrice: total,
                advanceAmount: advance,
                remainingAmount: Math.max(0, total - advance),
                bookingDate: new Date().toISOString(),
                expectedPaymentDate: form.expectedPaymentDate
                  ? new Date(form.expectedPaymentDate).toISOString()
                  : undefined,
                status: 'booked',
                paymentSchedule: [],
                notes: form.notes,
              });
              setOpen(false);
            }}
          >
            Create booking
          </Button>
        </div>
      </Modal>
    </div>
  );
}
