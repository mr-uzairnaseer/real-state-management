'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useAppStore, usePermission } from '@/store/useAppStore';
import {
  calculateProjectProgress,
  formatDateTime,
  formatPKR,
  isSameDay,
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
  Stat,
} from '@/components/ui';
import type { MediaKind } from '@/lib/types';
import { fileToDataUrl } from '@/lib/helpers';

/** Site Manager daily briefing — not a second CRM. Deep work lives in Site modules. */
export default function DailyLogPage() {
  const { user, can, isAdmin } = usePermission();
  const projects = useAppStore((s) => s.projects);
  const units = useAppStore((s) => s.units);
  const expenses = useAppStore((s) => s.expenses);
  const purchases = useAppStore((s) => s.purchases ?? []);
  const attendance = useAppStore((s) => s.attendance ?? []);
  const updates = useAppStore((s) => s.updates);
  const selectedProjectId = useAppStore((s) => s.selectedProjectId);
  const addMedia = useAppStore((s) => s.addMedia);
  const addProgressUpdate = useAppStore((s) => s.addProgressUpdate);
  const addManagerReport = useAppStore((s) => s.addManagerReport);

  const assigned = useMemo(() => {
    if (isAdmin) return projects;
    return projects.filter((p) => user?.assignedProjectIds.includes(p.id));
  }, [projects, user, isAdmin]);

  const projectId =
    selectedProjectId && assigned.some((p) => p.id === selectedProjectId)
      ? selectedProjectId
      : assigned[0]?.id;
  const project = assigned.find((p) => p.id === projectId);
  const projectUnits = units.filter((u) => u.projectId === projectId);

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

  if (!can('submit_site_report') && !isAdmin) {
    return (
      <div>
        <PageHeader title="Daily log" />
        <Card title="Restricted">Site Manager access required.</Card>
      </div>
    );
  }

  if (!project) {
    return (
      <div>
        <PageHeader title="Daily log" />
        <Card title="No assigned projects">Ask the project owner to assign a site to your account.</Card>
      </div>
    );
  }

  const pct = calculateProjectProgress(useAppStore.getState().tasks, project.id, units);
  const todayExpense = expenses
    .filter((e) => e.projectId === project.id && isSameDay(e.date))
    .reduce((s, e) => s + e.amount, 0);
  const todayPurchase = purchases
    .filter((p) => p.projectId === project.id && isSameDay(p.date))
    .reduce((s, p) => s + p.totalAmount, 0);
  const todayAttend = attendance.find((a) => a.projectId === project.id && isSameDay(a.date));

  return (
    <div>
      <PageHeader
        title="Daily site log"
        subtitle={`${project.name} · submit today’s work, then use Site modules for detail`}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12, marginBottom: 16 }}>
        <Stat label="Completion" value={`${pct}%`} tone="blue" />
        <Stat label="Today expense" value={formatPKR(todayExpense)} tone="orange" />
        <Stat label="Today purchases" value={formatPKR(todayPurchase)} />
        <Stat label="Present today" value={todayAttend?.present ?? '—'} tone="green" />
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        <Link href="/construction"><Button variant="secondary" size="sm">Update stages</Button></Link>
        <Link href="/materials"><Button variant="secondary" size="sm">Log material usage</Button></Link>
        <Link href="/attendance"><Button variant="secondary" size="sm">Attendance</Button></Link>
        <Link href="/purchases"><Button variant="secondary" size="sm">Purchases</Button></Link>
        <Link href="/expenses"><Button variant="secondary" size="sm">Expenses</Button></Link>
        <Link href="/gallery"><Button variant="secondary" size="sm">Photo gallery</Button></Link>
        <Link href="/units"><Button variant="secondary" size="sm">Units</Button></Link>
      </div>

      <div className="resp-2col">
        <Card title="Quick progress photo">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Select
              label="Unit"
              value={evidence.unitId}
              onChange={(e) => setEvidence({ ...evidence, unitId: e.target.value })}
            >
              <option value="">Project-level</option>
              {projectUnits.map((u) => (
                <option key={u.id} value={u.id}>{u.number}</option>
              ))}
            </Select>
            <Input label="Work category" value={evidence.category} onChange={(e) => setEvidence({ ...evidence, category: e.target.value })} />
            <Input label="Progress %" type="number" value={evidence.progress} onChange={(e) => setEvidence({ ...evidence, progress: e.target.value })} />
            <Textarea label="What was done" value={evidence.comment} onChange={(e) => setEvidence({ ...evidence, comment: e.target.value })} />
            <Input
              label="Photo"
              type="file"
              accept="image/*"
              onChange={(e) => setEvidence({ ...evidence, file: e.target.files?.[0] ?? null })}
            />
            <Button
              onClick={async () => {
                const mediaIds: string[] = [];
                if (evidence.file) {
                  const dataUrl = await fileToDataUrl(evidence.file);
                  const mid = await addMedia({
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
                await addProgressUpdate({
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
                setEvidence({ ...evidence, comment: '', file: null });
              }}
            >
              Post update
            </Button>
          </div>
        </Card>

        <Card title="End-of-day report">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Select
              label="Period"
              value={report.period}
              onChange={(e) => setReport({ ...report, period: e.target.value as 'daily' | 'weekly' })}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </Select>
            <Input label="Title" value={report.title} onChange={(e) => setReport({ ...report, title: e.target.value })} />
            <Textarea label="Completed" value={report.completedWork} onChange={(e) => setReport({ ...report, completedWork: e.target.value })} />
            <Textarea label="Pending" value={report.pendingWork} onChange={(e) => setReport({ ...report, pendingWork: e.target.value })} />
            <Textarea label="Notes" value={report.notes} onChange={(e) => setReport({ ...report, notes: e.target.value })} />
            <Button
              onClick={() => {
                if (!report.title) return;
                void addManagerReport({
                  projectId: project.id,
                  managerId: user?.id ?? '',
                  managerName: user?.name ?? 'Manager',
                  period: report.period,
                  title: report.title,
                  completedWork: report.completedWork,
                  pendingWork: report.pendingWork,
                  notes: report.notes,
                });
                setReport({ period: 'daily', title: '', completedWork: '', pendingWork: '', notes: '' });
              }}
            >
              Submit report
            </Button>
          </div>
        </Card>
      </div>

      <div style={{ marginTop: 16 }}>
        <Card title="Today’s updates">
          <ul style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {updates
              .filter((u) => u.projectId === project.id && isSameDay(u.createdAt))
              .slice(0, 8)
              .map((u) => (
                <li key={u.id} style={{ fontSize: 13 }}>
                  <strong>{u.title}</strong>
                  <div style={{ color: 'var(--text-tertiary)', fontSize: 11 }}>{formatDateTime(u.createdAt)}</div>
                  <p style={{ color: 'var(--text-secondary)' }}>{u.comment}</p>
                </li>
              ))}
            {updates.filter((u) => u.projectId === project.id && isSameDay(u.createdAt)).length === 0 && (
              <li style={{ color: 'var(--text-tertiary)' }}>No updates posted today</li>
            )}
          </ul>
        </Card>
      </div>

      <div style={{ marginTop: 16 }}>
        <Card title="Units needing attention">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {projectUnits
              .filter((u) => u.constructionProgress < 100)
              .slice(0, 16)
              .map((u) => (
                <Link key={u.id} href={`/units/${u.id}`}>
                  <Badge tone="orange">
                    {u.number} · {u.constructionProgress}% · {statusLabel(u.status)}
                  </Badge>
                </Link>
              ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
