'use client';

import { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAppStore, usePermission } from '@/store/useAppStore';
import {
  calculateProjectProgress,
  countByStatus,
  formatPKR,
  formatDate,
  formatDateTime,
  statusLabel,
} from '@/lib/calculations';
import {
  Badge,
  Button,
  Card,
  Input,
  Modal,
  PageHeader,
  ProgressBar,
  Select,
  Stat,
  Textarea,
} from '@/components/ui';
import shared from '../projects.module.css';

export default function ProjectDetailPage() {
  const params = useParams();
  const id = String(params.id);
  const { can } = usePermission();
  const canManage = can('manage_projects');
  const project = useAppStore((s) => s.projects.find((p) => p.id === id));
  const units = useAppStore((s) => s.units.filter((u) => u.projectId === id));
  const tasks = useAppStore((s) => s.tasks.filter((t) => t.projectId === id && !t.unitId));
  const expenses = useAppStore((s) => s.expenses.filter((e) => e.projectId === id));
  const updates = useAppStore((s) => s.updates.filter((u) => u.projectId === id));
  const media = useAppStore((s) => s.media.filter((m) => m.projectId === id));
  const allTasks = useAppStore((s) => s.tasks);
  const allUnits = useAppStore((s) => s.units);
  const updateProject = useAppStore((s) => s.updateProject);
  const setSelectedProject = useAppStore((s) => s.setSelectedProject);

  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    type: '',
    location: '',
    description: '',
    totalBudget: '',
    status: 'active',
    timelineNotes: '',
  });

  const pct = useMemo(
    () => (project ? calculateProjectProgress(allTasks, id, allUnits) : 0),
    [project, allTasks, allUnits, id],
  );
  const counts = countByStatus(units);
  const spent = expenses.reduce((s, e) => s + e.amount, 0);
  const revenue =
    units.reduce((s, u) => s + (u.sale?.amountReceived ?? 0), 0) +
    units.reduce(
      (s, u) =>
        s + (u.rental?.paymentHistory.reduce((a, p) => a + p.paidAmount, 0) ?? 0),
      0,
    );

  if (!project) {
    return (
      <div>
        <PageHeader title="Project not found" />
        <Link href="/projects">Back to projects</Link>
      </div>
    );
  }

  const openEdit = () => {
    setForm({
      name: project.name,
      type: project.type,
      location: project.location,
      description: project.description,
      totalBudget: String(project.totalBudget),
      status: project.status,
      timelineNotes: project.timelineNotes,
    });
    setEditOpen(true);
  };

  const save = () => {
    updateProject(id, {
      name: form.name,
      type: form.type,
      location: form.location,
      description: form.description,
      totalBudget: Number(form.totalBudget) || 0,
      status: form.status as typeof project.status,
      timelineNotes: form.timelineNotes,
    });
    setEditOpen(false);
  };

  return (
    <div>
      <PageHeader
        title={project.name}
        subtitle={`${project.type} · ${project.location}`}
        actions={
          <>
            <Button variant="secondary" onClick={() => setSelectedProject(id)}>
              Set as active
            </Button>
            {canManage && <Button onClick={openEdit}>Edit project</Button>}
          </>
        }
      />

      <Card title="Overall Completion">
        <div className="resp-hero">
          <div style={{ fontSize: 'clamp(36px, 10vw, 48px)', fontWeight: 600, letterSpacing: '-0.04em' }}>{pct}%</div>
          <div>
            <ProgressBar value={pct} />
            <p style={{ marginTop: 8, color: 'var(--text-tertiary)', fontSize: 12 }}>
              Weighted from construction stages · Timeline: {project.timelineNotes || '—'}
            </p>
          </div>
        </div>
      </Card>

      <div className="resp-stat-grid" style={{ marginTop: 16 }}>
        <Stat label="Total Budget" value={formatPKR(project.totalBudget)} />
        <Stat label="Expenses" value={formatPKR(spent)} tone="orange" />
        <Stat label="Revenue" value={formatPKR(revenue)} tone="green" />
        <Stat label="Units" value={counts.total} />
        <Stat label="Sold" value={counts.sold} tone="green" />
        <Stat label="Rented" value={counts.rented} tone="blue" />
        <Stat label="Available" value={counts.available} />
        <Stat label="Under Construction" value={counts.under_construction} tone="orange" />
      </div>

      <div className="resp-2col" style={{ marginTop: 16 }}>
        <Card title="Construction Stages">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {tasks
              .sort((a, b) => a.order - b.order)
              .map((t) => (
                <div key={t.id}>
                  <ProgressBar
                    value={t.progress}
                    label={`${t.name} (weight ${t.weight}%)`}
                  />
                </div>
              ))}
          </div>
          <div style={{ marginTop: 12 }}>
            <Link href="/construction">
              <Button size="sm" variant="secondary">
                Manage construction
              </Button>
            </Link>
          </div>
        </Card>

        <Card title="Manager Updates">
          <ul style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {updates.slice(0, 8).map((u) => (
              <li key={u.id}>
                <strong style={{ fontSize: 13 }}>{u.title}</strong>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                  {u.managerName} · {formatDateTime(u.createdAt)}
                </div>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{u.comment}</p>
              </li>
            ))}
            {updates.length === 0 && <li>No updates</li>}
          </ul>
        </Card>
      </div>

      <Card title="Site Pictures" className="animate-fade-in" >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
            gap: 10,
            marginTop: 4,
          }}
        >
          {media.slice(0, 12).map((m) => (
            <div
              key={m.id}
              style={{
                border: '1px solid var(--border-color)',
                borderRadius: 8,
                overflow: 'hidden',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={m.dataUrl} alt={m.fileName} style={{ height: 90, width: '100%', objectFit: 'cover' }} />
              <div style={{ padding: 8, fontSize: 11 }}>
                <Badge tone="blue">{m.kind}</Badge>
                <div style={{ marginTop: 4, color: 'var(--text-tertiary)' }}>{m.workCategory}</div>
              </div>
            </div>
          ))}
          {media.length === 0 && <p style={{ color: 'var(--text-tertiary)' }}>No pictures yet</p>}
        </div>
      </Card>

      <Card title="Project Timeline">
        <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          Start: {formatDate(project.startDate)} · Expected end:{' '}
          {formatDate(project.expectedEndDate)} · Status: {statusLabel(project.status)}
        </p>
        <p style={{ marginTop: 8 }}>{project.description}</p>
      </Card>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Project">
        <div className={shared.form}>
          <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label="Type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} />
          <Input label="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          <Input label="Budget" type="number" value={form.totalBudget} onChange={(e) => setForm({ ...form, totalBudget: e.target.value })} />
          <Select label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="planning">Planning</option>
            <option value="active">Active</option>
            <option value="on_hold">On Hold</option>
            <option value="completed">Completed</option>
          </Select>
          <Textarea label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <Textarea label="Timeline notes" value={form.timelineNotes} onChange={(e) => setForm({ ...form, timelineNotes: e.target.value })} />
          <Button onClick={save}>Save changes</Button>
        </div>
      </Modal>
    </div>
  );
}
