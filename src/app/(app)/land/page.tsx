'use client';

import { useMemo, useState } from 'react';
import { useAppStore, usePermission } from '@/store/useAppStore';
import { formatPKR, statusLabel } from '@/lib/calculations';
import {
  Badge,
  Button,
  Card,
  DataTable,
  Input,
  Modal,
  PageHeader,
  Select,
  Textarea,
} from '@/components/ui';

export default function LandPage() {
  const { can } = usePermission();
  const canManage = can('manage_projects');
  const plots = useAppStore((s) => s.plots);
  const projects = useAppStore((s) => s.projects);
  const selectedProjectId = useAppStore((s) => s.selectedProjectId);
  const createPlot = useAppStore((s) => s.createPlot);
  const updatePlot = useAppStore((s) => s.updatePlot);
  const deletePlot = useAppStore((s) => s.deletePlot);

  const list = useMemo(
    () =>
      selectedProjectId
        ? plots.filter((p) => p.projectId === selectedProjectId)
        : plots,
    [plots, selectedProjectId],
  );

  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<{
    projectId: string;
    plotNumber: string;
    size: string;
    location: string;
    salePrice: string;
    buyerName: string;
    buyerContact: string;
    paymentReceived: string;
    status: 'available' | 'reserved' | 'sold_land_only';
    notes: string;
  }>({
    projectId: selectedProjectId ?? projects[0]?.id ?? '',
    plotNumber: '',
    size: '',
    location: '',
    salePrice: '',
    buyerName: '',
    buyerContact: '',
    paymentReceived: '',
    status: 'available',
    notes: '',
  });

  const submit = () => {
    const price = Number(form.salePrice) || 0;
    const paid = Number(form.paymentReceived) || 0;
    if (editId) {
      updatePlot(editId, {
        plotNumber: form.plotNumber,
        size: form.size,
        location: form.location,
        salePrice: price,
        buyerName: form.buyerName || undefined,
        buyerContact: form.buyerContact || undefined,
        paymentReceived: paid,
        remainingPayment: Math.max(0, price - paid),
        status:
          paid >= price && paid > 0
            ? 'sold_land_only'
            : (form.status as 'available' | 'reserved' | 'sold_land_only'),
        notes: form.notes,
        saleDate: paid >= price && paid > 0 ? new Date().toISOString() : undefined,
      });
    } else {
      createPlot({
        projectId: form.projectId,
        plotNumber: form.plotNumber,
        size: form.size,
        location: form.location,
        salePrice: price,
        buyerName: form.buyerName || undefined,
        buyerContact: form.buyerContact || undefined,
        paymentReceived: paid,
        remainingPayment: Math.max(0, price - paid),
        status:
          paid >= price && paid > 0 ? 'sold_land_only' : form.status,
        notes: form.notes,
        saleDate: paid >= price && paid > 0 ? new Date().toISOString() : undefined,
      });
    }
    setOpen(false);
    setEditId(null);
  };

  return (
    <div>
      <PageHeader
        title="Land / Open Plot Management"
        subtitle="Empty land sold without construction — marked SOLD – LAND ONLY"
        actions={
          canManage && (
            <Button
              onClick={() => {
                setEditId(null);
                setForm({
                  projectId: selectedProjectId ?? projects[0]?.id ?? '',
                  plotNumber: '',
                  size: '',
                  location: '',
                  salePrice: '',
                  buyerName: '',
                  buyerContact: '',
                  paymentReceived: '',
                  status: 'available',
                  notes: '',
                });
                setOpen(true);
              }}
            >
              Add plot
            </Button>
          )
        }
      />

      <Card title="Plots">
        <DataTable
          columns={[
            { key: 'plot', label: 'Plot #' },
            { key: 'project', label: 'Project' },
            { key: 'size', label: 'Size' },
            { key: 'location', label: 'Location' },
            { key: 'price', label: 'Sale Price' },
            { key: 'buyer', label: 'Buyer' },
            { key: 'paid', label: 'Paid / Remaining' },
            { key: 'status', label: 'Status' },
            { key: 'actions', label: '' },
          ]}
          rows={list.map((p) => ({
            plot: <strong>{p.plotNumber}</strong>,
            project: projects.find((x) => x.id === p.projectId)?.name ?? '—',
            size: p.size,
            location: p.location,
            price: formatPKR(p.salePrice),
            buyer: p.buyerName ? `${p.buyerName}` : '—',
            paid: `${formatPKR(p.paymentReceived)} / ${formatPKR(p.remainingPayment)}`,
            status: (
              <Badge
                tone={
                  p.status === 'sold_land_only'
                    ? 'green'
                    : p.status === 'reserved'
                      ? 'yellow'
                      : 'neutral'
                }
              >
                {p.status === 'sold_land_only' ? 'SOLD – LAND ONLY' : statusLabel(p.status)}
              </Badge>
            ),
            actions: canManage ? (
              <div style={{ display: 'flex', gap: 6 }}>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setEditId(p.id);
                    setForm({
                      projectId: p.projectId,
                      plotNumber: p.plotNumber,
                      size: p.size,
                      location: p.location,
                      salePrice: String(p.salePrice),
                      buyerName: p.buyerName ?? '',
                      buyerContact: p.buyerContact ?? '',
                      paymentReceived: String(p.paymentReceived),
                      status: p.status,
                      notes: p.notes,
                    });
                    setOpen(true);
                  }}
                >
                  Edit
                </Button>
                <Button size="sm" variant="danger" onClick={() => deletePlot(p.id)}>
                  Delete
                </Button>
              </div>
            ) : null,
          }))}
        />
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title={editId ? 'Edit Plot' : 'Add Plot'}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Select label="Project" value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })}>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </Select>
          <Input label="Plot number" value={form.plotNumber} onChange={(e) => setForm({ ...form, plotNumber: e.target.value })} />
          <Input label="Size" value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })} />
          <Input label="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          <Input label="Sale price" type="number" value={form.salePrice} onChange={(e) => setForm({ ...form, salePrice: e.target.value })} />
          <Input label="Buyer name" value={form.buyerName} onChange={(e) => setForm({ ...form, buyerName: e.target.value })} />
          <Input label="Buyer contact" value={form.buyerContact} onChange={(e) => setForm({ ...form, buyerContact: e.target.value })} />
          <Input label="Payment received" type="number" value={form.paymentReceived} onChange={(e) => setForm({ ...form, paymentReceived: e.target.value })} />
          <Select label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as typeof form.status })}>
            <option value="available">Available</option>
            <option value="reserved">Reserved</option>
            <option value="sold_land_only">Sold — Land Only</option>
          </Select>
          <Textarea label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <Button onClick={submit}>Save</Button>
        </div>
      </Modal>
    </div>
  );
}
