'use client';

import { useMemo, useState } from 'react';
import { useAppStore, usePermission } from '@/store/useAppStore';
import { formatPKR, formatDate, isSameDay } from '@/lib/calculations';
import {
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
import { fileToDataUrl } from '@/lib/helpers';
import { PAYMENT_METHODS, PURCHASE_ITEMS } from '@/lib/catalog';
import type { PaymentMethod } from '@/lib/types';

export default function PurchasesPage() {
  const { user, can } = usePermission();
  const purchases = useAppStore((s) => s.purchases);
  const projects = useAppStore((s) => s.projects);
  const units = useAppStore((s) => s.units);
  const selectedProjectId = useAppStore((s) => s.selectedProjectId);
  const addPurchase = useAppStore((s) => s.addPurchase);
  const deletePurchase = useAppStore((s) => s.deletePurchase);

  const list = useMemo(() => {
    let rows = purchases ?? [];
    if (selectedProjectId) rows = rows.filter((p) => p.projectId === selectedProjectId);
    return rows;
  }, [purchases, selectedProjectId]);

  const todayTotal = list.filter((p) => isSameDay(p.date)).reduce((s, p) => s + p.totalAmount, 0);
  const total = list.reduce((s, p) => s + p.totalAmount, 0);
  const canEdit = can('add_purchases');
  const canDelete = can('delete_financials');

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    projectId: selectedProjectId ?? projects[0]?.id ?? '',
    unitId: '',
    date: new Date().toISOString().slice(0, 10),
    item: 'Cement',
    quantity: '50',
    unitPrice: '',
    supplier: '',
    paymentMethod: 'cash' as PaymentMethod,
    remarks: '',
    billDataUrl: '',
    billName: '',
  });

  const submit = async () => {
    if (!form.projectId || !form.item) return;
    const quantity = Number(form.quantity) || 1;
    const unitPrice = Number(form.unitPrice) || 0;
    await addPurchase({
      projectId: form.projectId,
      unitId: form.unitId || undefined,
      date: new Date(form.date).toISOString(),
      item: form.item,
      quantity,
      unitPrice,
      totalAmount: quantity * unitPrice,
      supplier: form.supplier,
      paymentMethod: form.paymentMethod,
      billDataUrl: form.billDataUrl || undefined,
      billName: form.billName || undefined,
      remarks: form.remarks,
      addedById: user?.id ?? '',
      addedByName: user?.name ?? 'User',
    });
    setOpen(false);
  };

  return (
    <div>
      <PageHeader
        title="Material Purchases"
        subtitle="Every site purchase creates a linked expense and optional bill upload"
        actions={
          canEdit && (
            <Button
              onClick={() => {
                setForm({
                  ...form,
                  projectId: selectedProjectId ?? projects[0]?.id ?? '',
                  date: new Date().toISOString().slice(0, 10),
                });
                setOpen(true);
              }}
            >
              Add purchase
            </Button>
          )
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 16 }}>
        <Stat label="Today's Purchases" value={formatPKR(todayTotal)} tone="orange" />
        <Stat label="All Purchases" value={formatPKR(total)} />
        <Stat label="Records" value={list.length} />
      </div>

      <Card title="Purchase ledger">
        <DataTable
          columns={[
            { key: 'date', label: 'Date' },
            { key: 'item', label: 'Item' },
            { key: 'qty', label: 'Qty' },
            { key: 'price', label: 'Unit price' },
            { key: 'total', label: 'Total' },
            { key: 'supplier', label: 'Supplier' },
            { key: 'unit', label: 'Unit' },
            { key: 'bill', label: 'Bill' },
            { key: 'actions', label: '' },
          ]}
          rows={list.map((p) => ({
            date: formatDate(p.date),
            item: p.item,
            qty: p.quantity,
            price: formatPKR(p.unitPrice),
            total: <strong>{formatPKR(p.totalAmount)}</strong>,
            supplier: p.supplier || '—',
            unit: units.find((u) => u.id === p.unitId)?.number ?? 'Common',
            bill: p.billDataUrl ? (
              <a href={p.billDataUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-blue)' }}>
                {p.billName || 'View'}
              </a>
            ) : (
              '—'
            ),
            actions: canDelete ? (
              <Button size="sm" variant="danger" onClick={() => deletePurchase(p.id)}>
                Delete
              </Button>
            ) : null,
          }))}
        />
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Purchase Entry">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Select label="Project" value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })}>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </Select>
          <Select label="Related unit" value={form.unitId} onChange={(e) => setForm({ ...form, unitId: e.target.value })}>
            <option value="">Common / project-wide</option>
            {units.filter((u) => u.projectId === form.projectId).map((u) => (
              <option key={u.id} value={u.id}>{u.number}</option>
            ))}
          </Select>
          <Input label="Date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          <Select label="Item" value={form.item} onChange={(e) => setForm({ ...form, item: e.target.value })}>
            {PURCHASE_ITEMS.map((i) => (
              <option key={i} value={i}>{i}</option>
            ))}
          </Select>
          <Input label="Quantity" type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
          <Input label="Unit price (PKR)" type="number" value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: e.target.value })} />
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            Total: {formatPKR((Number(form.quantity) || 0) * (Number(form.unitPrice) || 0))}
          </div>
          <Input label="Supplier" value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} />
          <Select label="Payment method" value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value as PaymentMethod })}>
            {PAYMENT_METHODS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </Select>
          <Input
            label="Bill / invoice"
            type="file"
            accept="image/*,application/pdf"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setForm({ ...form, billDataUrl: await fileToDataUrl(file), billName: file.name });
            }}
          />
          <Textarea label="Remarks" value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} />
          <Button onClick={() => void submit()}>Save purchase</Button>
        </div>
      </Modal>
    </div>
  );
}
