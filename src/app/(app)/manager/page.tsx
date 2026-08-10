'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useAppStore, usePermission } from '@/store/useAppStore';
import {
  calculateProjectProgress,
  formatDateTime,
  statusLabel,
} from '@/lib/calculations';
import {
  Badge,
  Button,
  Card,
  Input,
  PageHeader,
  ProgressBar,
  Select,
  Textarea,
} from '@/components/ui';
import { fileToDataUrl, taskTone } from '@/lib/helpers';
import type { MediaKind } from '@/lib/types';

export default function ManagerPortalPage() {
  const { user, isAdmin, isManager } = usePermission();
  const projects = useAppStore((s) => s.projects);
  const units = useAppStore((s) => s.units);
  const tasks = useAppStore((s) => s.tasks);
  const updates = useAppStore((s) => s.updates);
  const selectedProjectId = useAppStore((s) => s.selectedProjectId);
  const updateTaskProgress = useAppStore((s) => s.updateTaskProgress);
  const addMedia = useAppStore((s) => s.addMedia);
  const addProgressUpdate = useAppStore((s) => s.addProgressUpdate);
  const addExpense = useAppStore((s) => s.addExpense);
  const addManagerReport = useAppStore((s) => s.addManagerReport);
  const EXPENSE_CATEGORIES = [
    'Labour',
    'Cement',
    'Paint',
    'Electrical',
    'Plumbing',
    'Other Expenses',
  ] as const;

  const assigned = useMemo(() => {
    if (isAdmin) return projects;
    return projects.filter((p) => user?.assignedProjectIds.includes(p.id));
  }, [projects, user, isAdmin]);

  const projectId = selectedProjectId && assigned.some((p) => p.id === selectedProjectId)
    ? selectedProjectId
    : assigned[0]?.id;

  const project = assigned.find((p) => p.id === projectId);
  const projectUnits = units.filter((u) => u.projectId === projectId);
  const projectTasks = tasks
    .filter((t) => t.projectId === projectId && !t.unitId)
    .sort((a, b) => a.order - b.order);

  const [report, setReport] = useState({
    period: 'daily' as 'daily' | 'weekly',
    title: '',
    completedWork: '',
    pendingWork: '',
    notes: '',
  });

  const [evidence, setEvidence] = useState({
    unitId: '',
    category: 'Paint Work',
    progress: '100',
    comment: '',
    kind: 'completed' as MediaKind,
    file: null as File | null,
  });

  const [expense, setExpense] = useState({
    category: 'Labour',
    amount: '',
    description: '',
  });

  if (!isAdmin && !isManager) {
    return (
      <div>
        <PageHeader title="Manager Portal" />
        <Card title="Restricted">Manager or Admin access required.</Card>
      </div>
    );
  }

  if (!project) {
    return (
      <div>
        <PageHeader title="Manager Portal" />
        <Card title="No assigned projects">Ask Main Admin to assign projects to your account.</Card>
      </div>
    );
  }

  const pct = calculateProjectProgress(tasks, project.id, units);

  return (
    <div>
      <PageHeader
        title="Manager Portal"
        subtitle={`${user?.name} · ${project.name}`}
      />

      <Card title="Assigned project snapshot">
        <div style={{ fontSize: 36, fontWeight: 600, letterSpacing: '-0.04em' }}>{pct}%</div>
        <ProgressBar value={pct} label="Overall completion" />
        <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {projectUnits.slice(0, 12).map((u) => (
            <Link key={u.id} href={`/units/${u.id}`}>
              <Badge tone="neutral">
                {u.number} · {statusLabel(u.status)} · {u.constructionProgress}%
              </Badge>
            </Link>
          ))}
        </div>
      </Card>

      <div className="resp-2col" style={{ marginTop: 16 }}>
        <Card title="Update construction progress">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {projectTasks.map((t) => (
              <div key={t.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12 }}>
                    {t.name} <Badge tone={taskTone(t.status)}>{t.progress}%</Badge>
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={t.progress}
                  style={{ width: '100%' }}
                  onChange={(e) => updateTaskProgress(t.id, Number(e.target.value))}
                />
              </div>
            ))}
          </div>
        </Card>

        <Card title="Upload picture / progress evidence">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Select
              label="Unit (optional)"
              value={evidence.unitId}
              onChange={(e) => setEvidence({ ...evidence, unitId: e.target.value })}
            >
              <option value="">Project-level</option>
              {projectUnits.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.number}
                </option>
              ))}
            </Select>
            <Input
              label="Work category"
              value={evidence.category}
              onChange={(e) => setEvidence({ ...evidence, category: e.target.value })}
            />
            <Input
              label="Progress %"
              type="number"
              value={evidence.progress}
              onChange={(e) => setEvidence({ ...evidence, progress: e.target.value })}
            />
            <Select
              label="Picture kind"
              value={evidence.kind}
              onChange={(e) => setEvidence({ ...evidence, kind: e.target.value as MediaKind })}
            >
              <option value="before">Before</option>
              <option value="during">During</option>
              <option value="completed">Completed</option>
              <option value="other">Other</option>
            </Select>
            <Textarea
              label="Comment"
              value={evidence.comment}
              onChange={(e) => setEvidence({ ...evidence, comment: e.target.value })}
            />
            <Input
              label="Picture / video"
              type="file"
              accept="image/*,video/*"
              onChange={(e) =>
                setEvidence({ ...evidence, file: e.target.files?.[0] ?? null })
              }
            />
            <Button
              onClick={async () => {
                const mediaIds: string[] = [];
                if (evidence.file) {
                  const dataUrl = await fileToDataUrl(evidence.file);
                  const mid = addMedia({
                    projectId: project.id,
                    unitId: evidence.unitId || undefined,
                    kind: evidence.kind,
                    dataUrl,
                    mimeType: evidence.file.type,
                    fileName: evidence.file.name,
                    comment: evidence.comment,
                    progressPercentage: Number(evidence.progress) || 0,
                    workCategory: evidence.category,
                    managerName: user?.name ?? 'Manager',
                    managerId: user?.id ?? '',
                  });
                  mediaIds.push(mid);
                }
                addProgressUpdate({
                  projectId: project.id,
                  unitId: evidence.unitId || undefined,
                  title: `${evidence.category} update`,
                  comment: evidence.comment,
                  progressPercentage: Number(evidence.progress) || 0,
                  workCategory: evidence.category,
                  managerId: user?.id ?? '',
                  managerName: user?.name ?? 'Manager',
                  mediaIds,
                });
                setEvidence({
                  ...evidence,
                  comment: '',
                  file: null,
                });
                alert('Progress update submitted');
              }}
            >
              Submit update
            </Button>
          </div>
        </Card>

        <Card title="Quick expense">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Select
              label="Category"
              value={expense.category}
              onChange={(e) => setExpense({ ...expense, category: e.target.value })}
            >
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
            <Input
              label="Amount"
              type="number"
              value={expense.amount}
              onChange={(e) => setExpense({ ...expense, amount: e.target.value })}
            />
            <Textarea
              label="Description"
              value={expense.description}
              onChange={(e) => setExpense({ ...expense, description: e.target.value })}
            />
            <Button
              onClick={() => {
                if (!expense.amount) return;
                addExpense({
                  projectId: project.id,
                  category: expense.category as 'Labour',
                  amount: Number(expense.amount) || 0,
                  date: new Date().toISOString(),
                  description: expense.description,
                  addedById: user?.id ?? '',
                  addedByName: user?.name ?? 'Manager',
                });
                setExpense({ category: 'Labour', amount: '', description: '' });
              }}
            >
              Add expense
            </Button>
          </div>
        </Card>

        <Card title="Daily / weekly progress report">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Select
              label="Period"
              value={report.period}
              onChange={(e) =>
                setReport({ ...report, period: e.target.value as 'daily' | 'weekly' })
              }
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </Select>
            <Input
              label="Title"
              value={report.title}
              onChange={(e) => setReport({ ...report, title: e.target.value })}
            />
            <Textarea
              label="Completed work"
              value={report.completedWork}
              onChange={(e) => setReport({ ...report, completedWork: e.target.value })}
            />
            <Textarea
              label="Pending work"
              value={report.pendingWork}
              onChange={(e) => setReport({ ...report, pendingWork: e.target.value })}
            />
            <Textarea
              label="Notes"
              value={report.notes}
              onChange={(e) => setReport({ ...report, notes: e.target.value })}
            />
            <Button
              onClick={() => {
                if (!report.title) return;
                addManagerReport({
                  projectId: project.id,
                  managerId: user?.id ?? '',
                  managerName: user?.name ?? 'Manager',
                  period: report.period,
                  title: report.title,
                  completedWork: report.completedWork,
                  pendingWork: report.pendingWork,
                  notes: report.notes,
                });
                setReport({
                  period: 'daily',
                  title: '',
                  completedWork: '',
                  pendingWork: '',
                  notes: '',
                });
              }}
            >
              Submit report
            </Button>
          </div>
        </Card>
      </div>

      <Card title="Your recent updates">
        <ul style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {updates
            .filter((u) => u.managerId === user?.id || isAdmin)
            .slice(0, 10)
            .map((u) => (
              <li key={u.id} style={{ fontSize: 13 }}>
                <strong>{u.title}</strong>
                <div style={{ color: 'var(--text-tertiary)', fontSize: 11 }}>
                  {formatDateTime(u.createdAt)}
                </div>
                <p style={{ color: 'var(--text-secondary)' }}>{u.comment}</p>
              </li>
            ))}
        </ul>
      </Card>
    </div>
  );
}
