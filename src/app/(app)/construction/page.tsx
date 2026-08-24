'use client';

import { useMemo, useState } from 'react';
import { useAppStore, usePermission } from '@/store/useAppStore';
import {
  calculateProjectProgress,
  calculateFloorProgress,
  formatDate,
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
  Textarea,
} from '@/components/ui';
import { taskTone } from '@/lib/helpers';
import type { TaskStatus } from '@/lib/types';
import { v4 as uuid } from 'uuid';

import { ClusterTabs } from '@/components/layout/ClusterTabs';
import { CONSTRUCTION_TABS } from '@/lib/access';

export default function ConstructionPage() {
  const { can } = usePermission();
  const projects = useAppStore((s) => s.projects);
  const units = useAppStore((s) => s.units);
  const tasks = useAppStore((s) => s.tasks);
  const selectedProjectId = useAppStore((s) => s.selectedProjectId);
  const updateTaskProgress = useAppStore((s) => s.updateTaskProgress);
  const upsertTask = useAppStore((s) => s.upsertTask);
  const deleteTask = useAppStore((s) => s.deleteTask);
  const setStageTemplates = useAppStore((s) => s.setStageTemplates);

  const projectId = selectedProjectId ?? projects[0]?.id;
  const project = projects.find((p) => p.id === projectId);

  const projectTasks = useMemo(
    () =>
      tasks
        .filter((t) => t.projectId === projectId && !t.unitId)
        .sort((a, b) => a.order - b.order),
    [tasks, projectId],
  );

  const overall = projectId
    ? calculateProjectProgress(tasks, projectId, units)
    : 0;

  const floors = useMemo(() => {
    const set = new Set(
      units.filter((u) => u.projectId === projectId).map((u) => u.floor),
    );
    return Array.from(set);
  }, [units, projectId]);

  const [addOpen, setAddOpen] = useState(false);
  const [weightsOpen, setWeightsOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    weight: '5',
    progress: '0',
    status: 'not_started' as TaskStatus,
    comments: '',
    startDate: '',
    expectedCompletionDate: '',
  });
  const [weights, setWeights] = useState<{ id: string; name: string; weight: number; order: number }[]>([]);

  const openWeights = () => {
    if (!project) return;
    setWeights(project.stageTemplates.map((s) => ({ ...s })));
    setWeightsOpen(true);
  };

  const saveWeights = () => {
    if (!projectId) return;
    setStageTemplates(projectId, weights);
    // Sync project-level task weights/names
    for (const w of weights) {
      const existing = projectTasks.find((t) => t.name === w.name || t.order === w.order);
      if (existing) {
        upsertTask({ ...existing, name: w.name, weight: w.weight, order: w.order });
      }
    }
    setWeightsOpen(false);
  };

  return (
    <div>
      <ClusterTabs items={CONSTRUCTION_TABS} />
      <PageHeader
        title="Construction stages"
        subtitle="Weighted progress · shop → floor → building · grey structure & photos next to this"
        actions={
          can('update_progress') && (
            <>
              {can('manage_projects') && (
                <Button variant="secondary" onClick={openWeights}>
                  Edit stage weights
                </Button>
              )}
              <Button onClick={() => setAddOpen(true)}>Add stage / task</Button>
            </>
          )
        }
      />

      {!project ? (
        <Card title="No project">Select or create a project first.</Card>
      ) : (
        <>
          <Card title={`${project.name} — Overall Completion`}>
            <div style={{ fontSize: 42, fontWeight: 600, letterSpacing: '-0.04em', marginBottom: 12 }}>
              {overall}%
            </div>
            <ProgressBar value={overall} />
            <p style={{ marginTop: 8, fontSize: 12, color: 'var(--text-tertiary)' }}>
              Auto-calculated from weighted stage progress
            </p>
          </Card>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: 12,
              margin: '16px 0',
            }}
          >
            {floors.map((floor) => (
              <Card key={floor} title={`Floor: ${floor}`}>
                <ProgressBar
                  value={calculateFloorProgress(units, projectId!, floor)}
                  label="Avg unit progress"
                />
              </Card>
            ))}
          </div>

          <Card title="Construction Stages">
            <DataTable
              columns={[
                { key: 'name', label: 'Task' },
                { key: 'weight', label: 'Weight' },
                { key: 'progress', label: 'Progress' },
                { key: 'dates', label: 'Dates' },
                { key: 'status', label: 'Status' },
                { key: 'comments', label: 'Notes' },
                { key: 'actions', label: '' },
              ]}
              rows={projectTasks.map((t) => ({
                name: <strong>{t.name}</strong>,
                weight: `${t.weight}%`,
                progress: can('update_progress') ? (
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={t.progress}
                    onChange={(e) => updateTaskProgress(t.id, Number(e.target.value))}
                    style={{ width: 120 }}
                  />
                ) : (
                  <ProgressBar value={t.progress} />
                ),
                dates: (
                  <span style={{ fontSize: 11 }}>
                    {formatDate(t.startDate)} → {formatDate(t.expectedCompletionDate)}
                  </span>
                ),
                status: <Badge tone={taskTone(t.status)}>{statusLabel(t.status)}</Badge>,
                comments: t.comments || '—',
                actions: (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{t.progress}%</span>
                    {can('manage_projects') && (
                      <Button size="sm" variant="danger" onClick={() => deleteTask(t.id)}>
                        Remove
                      </Button>
                    )}
                  </div>
                ),
              }))}
            />
          </Card>
        </>
      )}

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add Construction Stage">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Input label="Task name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label="Weight %" type="number" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} />
          <Input label="Current progress %" type="number" value={form.progress} onChange={(e) => setForm({ ...form, progress: e.target.value })} />
          <Input label="Start date" type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
          <Input label="Expected completion" type="date" value={form.expectedCompletionDate} onChange={(e) => setForm({ ...form, expectedCompletionDate: e.target.value })} />
          <Select label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as TaskStatus })}>
            <option value="not_started">Not Started</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="on_hold">On Hold</option>
            <option value="delayed">Delayed</option>
          </Select>
          <Textarea label="Comments" value={form.comments} onChange={(e) => setForm({ ...form, comments: e.target.value })} />
          <Button
            onClick={() => {
              if (!projectId || !form.name) return;
              upsertTask({
                projectId,
                name: form.name,
                weight: Number(form.weight) || 0,
                progress: Number(form.progress) || 0,
                status: form.status,
                comments: form.comments,
                startDate: form.startDate ? new Date(form.startDate).toISOString() : undefined,
                expectedCompletionDate: form.expectedCompletionDate
                  ? new Date(form.expectedCompletionDate).toISOString()
                  : undefined,
              });
              setAddOpen(false);
            }}
          >
            Add task
          </Button>
        </div>
      </Modal>

      <Modal open={weightsOpen} onClose={() => setWeightsOpen(false)} title="Edit Stage Weights" wide>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
            Total weight: {weights.reduce((s, w) => s + w.weight, 0)}% (ideally 100%)
          </p>
          {weights.map((w, idx) => (
            <div key={w.id} style={{ display: 'grid', gridTemplateColumns: '1fr 100px 80px', gap: 8 }}>
              <Input
                value={w.name}
                onChange={(e) => {
                  const next = [...weights];
                  next[idx] = { ...w, name: e.target.value };
                  setWeights(next);
                }}
              />
              <Input
                type="number"
                value={w.weight}
                onChange={(e) => {
                  const next = [...weights];
                  next[idx] = { ...w, weight: Number(e.target.value) || 0 };
                  setWeights(next);
                }}
              />
              <Button
                size="sm"
                variant="danger"
                onClick={() => setWeights(weights.filter((x) => x.id !== w.id))}
              >
                Remove
              </Button>
            </div>
          ))}
          <Button
            variant="secondary"
            onClick={() =>
              setWeights([
                ...weights,
                { id: uuid(), name: 'New Stage', weight: 0, order: weights.length + 1 },
              ])
            }
          >
            Add stage
          </Button>
          <Button onClick={saveWeights}>Save weights</Button>
        </div>
      </Modal>
    </div>
  );
}
