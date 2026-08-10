'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useAppStore, usePermission } from '@/store/useAppStore';
import {
  calculateProjectProgress,
  formatPKR,
  formatDate,
  statusLabel,
  countByStatus,
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
  Textarea,
} from '@/components/ui';
import styles from './projects.module.css';

export default function ProjectsPage() {
  const { user, isAdmin, isManager } = usePermission();
  const projects = useAppStore((s) => s.projects);
  const units = useAppStore((s) => s.units);
  const tasks = useAppStore((s) => s.tasks);
  const expenses = useAppStore((s) => s.expenses);
  const createProject = useAppStore((s) => s.createProject);
  const deleteProject = useAppStore((s) => s.deleteProject);
  const setSelectedProject = useAppStore((s) => s.setSelectedProject);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    type: 'Commercial',
    location: '',
    description: '',
    totalBudget: '',
    status: 'planning' as const,
  });

  const list = useMemo(() => {
    if (isAdmin) return projects;
    if (isManager && user) {
      return projects.filter((p) => user.assignedProjectIds.includes(p.id));
    }
    return projects;
  }, [projects, isAdmin, isManager, user]);

  const submit = () => {
    if (!form.name.trim()) return;
    const id = createProject({
      name: form.name.trim(),
      type: form.type,
      location: form.location,
      description: form.description,
      totalBudget: Number(form.totalBudget) || 0,
      status: form.status,
    });
    setSelectedProject(id);
    setOpen(false);
    setForm({
      name: '',
      type: 'Commercial',
      location: '',
      description: '',
      totalBudget: '',
      status: 'planning',
    });
  };

  return (
    <div>
      <PageHeader
        title="Projects"
        subtitle="Manage multiple real-estate and construction projects"
        actions={
          isAdmin ? (
            <Button onClick={() => setOpen(true)}>New Project</Button>
          ) : undefined
        }
      />

      <div className={styles.grid}>
        {list.map((p) => {
          const pct = calculateProjectProgress(tasks, p.id, units);
          const uc = countByStatus(units.filter((u) => u.projectId === p.id));
          const spent = expenses
            .filter((e) => e.projectId === p.id)
            .reduce((s, e) => s + e.amount, 0);
          const revenue =
            units
              .filter((u) => u.projectId === p.id)
              .reduce((s, u) => s + (u.sale?.amountReceived ?? 0), 0) +
            units
              .filter((u) => u.projectId === p.id)
              .reduce(
                (s, u) =>
                  s +
                  (u.rental?.paymentHistory.reduce((a, pay) => a + pay.paidAmount, 0) ??
                    0),
                0,
              );

          return (
            <Card key={p.id} className={styles.card}>
              <div className={styles.cardTop}>
                <div>
                  <Link href={`/projects/${p.id}`} className={styles.name}>
                    {p.name}
                  </Link>
                  <div className={styles.meta}>
                    {p.type} · {p.location || 'No location'}
                  </div>
                </div>
                <Badge tone={p.status === 'active' ? 'blue' : p.status === 'completed' ? 'green' : 'neutral'}>
                  {statusLabel(p.status)}
                </Badge>
              </div>
              <ProgressBar value={pct} label="Overall completion" />
              <div className={styles.stats}>
                <div>
                  <span>Budget</span>
                  <strong>{formatPKR(p.totalBudget)}</strong>
                </div>
                <div>
                  <span>Expenses</span>
                  <strong>{formatPKR(spent)}</strong>
                </div>
                <div>
                  <span>Revenue</span>
                  <strong>{formatPKR(revenue)}</strong>
                </div>
                <div>
                  <span>Units</span>
                  <strong>
                    {uc.sold}S / {uc.rented}R / {uc.available}A
                  </strong>
                </div>
              </div>
              <div className={styles.actions}>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setSelectedProject(p.id)}
                >
                  Switch to project
                </Button>
                <Link href={`/projects/${p.id}`}>
                  <Button size="sm">Open dashboard</Button>
                </Link>
                {isAdmin && (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => {
                      if (confirm(`Delete project "${p.name}"?`)) deleteProject(p.id);
                    }}
                  >
                    Delete
                  </Button>
                )}
              </div>
              <div className={styles.dates}>
                Started {formatDate(p.startDate)}
                {p.expectedEndDate ? ` · Target ${formatDate(p.expectedEndDate)}` : ''}
              </div>
            </Card>
          );
        })}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Create Project">
        <div className={styles.form}>
          <Input
            label="Project name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Commercial Plaza"
          />
          <Select
            label="Type"
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
          >
            <option>Commercial</option>
            <option>Residential</option>
            <option>Food/Restaurant</option>
            <option>Construction</option>
            <option>Mixed Use</option>
            <option>Other</option>
          </Select>
          <Input
            label="Location"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
          />
          <Input
            label="Total budget (PKR)"
            type="number"
            value={form.totalBudget}
            onChange={(e) => setForm({ ...form, totalBudget: e.target.value })}
          />
          <Select
            label="Status"
            value={form.status}
            onChange={(e) =>
              setForm({ ...form, status: e.target.value as typeof form.status })
            }
          >
            <option value="planning">Planning</option>
            <option value="active">Active</option>
            <option value="on_hold">On Hold</option>
            <option value="completed">Completed</option>
          </Select>
          <Textarea
            label="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <Button onClick={submit}>Create project</Button>
        </div>
      </Modal>
    </div>
  );
}
