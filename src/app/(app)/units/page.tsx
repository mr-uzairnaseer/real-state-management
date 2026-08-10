'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useAppStore, usePermission } from '@/store/useAppStore';
import {
  countByStatus,
  formatPKR,
  statusLabel,
} from '@/lib/calculations';
import {
  Badge,
  Button,
  Card,
  DataTable,
  Input,
  Modal,
  PageHeader,
  ProgressBar,
  Select,
  Stat,
} from '@/components/ui';
import { unitTone } from '@/lib/helpers';
import type { UnitStatus } from '@/lib/types';

export default function UnitsPage() {
  const { isAdmin, isManager } = usePermission();
  const units = useAppStore((s) => s.units);
  const projects = useAppStore((s) => s.projects);
  const selectedProjectId = useAppStore((s) => s.selectedProjectId);
  const createUnit = useAppStore((s) => s.createUnit);
  const deleteUnit = useAppStore((s) => s.deleteUnit);

  const [filter, setFilter] = useState<UnitStatus | 'all'>('all');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    projectId: selectedProjectId ?? projects[0]?.id ?? '',
    number: '',
    type: 'shop',
    size: '',
    floor: '',
    salePrice: '',
    rentalPrice: '',
    status: 'under_construction' as UnitStatus,
  });

  const list = useMemo(() => {
    let rows = units;
    if (selectedProjectId) rows = rows.filter((u) => u.projectId === selectedProjectId);
    if (filter !== 'all') rows = rows.filter((u) => u.status === filter);
    return rows;
  }, [units, selectedProjectId, filter]);

  const counts = countByStatus(
    selectedProjectId ? units.filter((u) => u.projectId === selectedProjectId) : units,
  );

  const submit = () => {
    if (!form.number || !form.projectId) return;
    createUnit({
      projectId: form.projectId,
      number: form.number,
      type: form.type as 'shop',
      size: form.size,
      floor: form.floor,
      salePrice: Number(form.salePrice) || 0,
      rentalPrice: Number(form.rentalPrice) || 0,
      status: form.status,
      notes: '',
    });
    setOpen(false);
  };

  return (
    <div>
      <PageHeader
        title="Shop / Unit Inventory"
        subtitle="Sold, rented, available, reserved, under construction — auto-updating counts"
        actions={
          (isAdmin || isManager) && (
            <Button onClick={() => setOpen(true)}>Add unit</Button>
          )
        }
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: 12,
          marginBottom: 16,
        }}
      >
        <Stat label="Total" value={counts.total} />
        <Stat label="Sold" value={counts.sold} tone="green" />
        <Stat label="Rented" value={counts.rented} tone="blue" />
        <Stat label="Available" value={counts.available} />
        <Stat label="Under Construction" value={counts.under_construction} tone="orange" />
        <Stat label="Reserved" value={counts.reserved} tone="orange" />
        <Stat label="Booked" value={counts.booked} />
      </div>

      <Card
        title="Inventory"
        action={
          <Select
            value={filter}
            onChange={(e) => setFilter(e.target.value as UnitStatus | 'all')}
          >
            <option value="all">All statuses</option>
            <option value="available">Available</option>
            <option value="sold">Sold</option>
            <option value="rented">Rented</option>
            <option value="reserved">Reserved</option>
            <option value="booked">Booked</option>
            <option value="under_construction">Under Construction</option>
          </Select>
        }
      >
        <DataTable
          columns={[
            { key: 'number', label: 'Unit' },
            { key: 'project', label: 'Project' },
            { key: 'floor', label: 'Floor' },
            { key: 'size', label: 'Size' },
            { key: 'status', label: 'Status' },
            { key: 'progress', label: 'Progress' },
            { key: 'price', label: 'Sale / Rent' },
            { key: 'actions', label: '' },
          ]}
          rows={list.map((u) => ({
            number: (
              <Link href={`/units/${u.id}`} style={{ fontWeight: 550 }}>
                {u.number}
              </Link>
            ),
            project: projects.find((p) => p.id === u.projectId)?.name ?? '—',
            floor: u.floor,
            size: u.size,
            status: <Badge tone={unitTone(u.status)}>{statusLabel(u.status)}</Badge>,
            progress: <ProgressBar value={u.constructionProgress} showValue />,
            price: (
              <span>
                {formatPKR(u.salePrice)}
                <br />
                <span style={{ color: 'var(--text-tertiary)', fontSize: 11 }}>
                  Rent {formatPKR(u.rentalPrice)}
                </span>
              </span>
            ),
            actions: isAdmin ? (
              <Button
                size="sm"
                variant="danger"
                onClick={() => {
                  if (confirm('Delete unit?')) deleteUnit(u.id);
                }}
              >
                Delete
              </Button>
            ) : null,
          }))}
        />
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Add Unit / Shop">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Select
            label="Project"
            value={form.projectId}
            onChange={(e) => setForm({ ...form, projectId: e.target.value })}
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
          <Input
            label="Unit / Shop number"
            value={form.number}
            onChange={(e) => setForm({ ...form, number: e.target.value })}
            placeholder="Shop #31"
          />
          <Select
            label="Type"
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
          >
            <option value="shop">Shop</option>
            <option value="apartment">Apartment</option>
            <option value="office">Office</option>
            <option value="plot">Plot</option>
            <option value="other">Other</option>
          </Select>
          <Input label="Size" value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })} />
          <Input label="Floor" value={form.floor} onChange={(e) => setForm({ ...form, floor: e.target.value })} />
          <Input label="Sale price" type="number" value={form.salePrice} onChange={(e) => setForm({ ...form, salePrice: e.target.value })} />
          <Input label="Rental price" type="number" value={form.rentalPrice} onChange={(e) => setForm({ ...form, rentalPrice: e.target.value })} />
          <Select
            label="Status"
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value as UnitStatus })}
          >
            <option value="available">Available</option>
            <option value="under_construction">Under Construction</option>
            <option value="reserved">Reserved</option>
            <option value="booked">Booked</option>
            <option value="sold">Sold</option>
            <option value="rented">Rented</option>
          </Select>
          <Button onClick={submit}>Create unit</Button>
        </div>
      </Modal>
    </div>
  );
}
