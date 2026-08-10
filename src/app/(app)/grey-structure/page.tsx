'use client';

import { useState } from 'react';
import { useAppStore, usePermission } from '@/store/useAppStore';
import { formatPKR } from '@/lib/calculations';
import { Button, Card, Input, PageHeader, ProgressBar, Stat, Textarea } from '@/components/ui';

export default function GreyStructurePage() {
  const { isAdmin, isManager } = usePermission();
  const projects = useAppStore((s) => s.projects);
  const units = useAppStore((s) => s.units);
  const selectedProjectId = useAppStore((s) => s.selectedProjectId);
  const updateGreyStructure = useAppStore((s) => s.updateGreyStructure);

  const project = projects.find((p) => p.id === (selectedProjectId ?? projects[0]?.id));
  const gs = project?.greyStructure;

  const [form, setForm] = useState({
    progress: '',
    budget: '',
    expenses: '',
    completedWork: '',
    remainingWork: '',
    constructionStatus: '',
    notes: '',
  });
  const [editing, setEditing] = useState(false);

  if (!project || !gs) {
    return (
      <div>
        <PageHeader title="Grey Structure" />
        <Card title="No project selected">Select a project to manage grey structure.</Card>
      </div>
    );
  }

  const projectUnits = units.filter((u) => u.projectId === project.id);
  const soldGs = projectUnits.filter((u) => u.status === 'sold' || u.status === 'booked').length;
  const unsold = projectUnits.filter(
    (u) => u.status === 'available' || u.status === 'under_construction' || u.status === 'reserved',
  ).length;
  const remainingBudget = Math.max(0, gs.budget - gs.expenses);

  const startEdit = () => {
    setForm({
      progress: String(gs.progress),
      budget: String(gs.budget),
      expenses: String(gs.expenses),
      completedWork: gs.completedWork,
      remainingWork: gs.remainingWork,
      constructionStatus: gs.constructionStatus,
      notes: gs.notes,
    });
    setEditing(true);
  };

  const save = () => {
    updateGreyStructure(project.id, {
      progress: Number(form.progress) || 0,
      budget: Number(form.budget) || 0,
      expenses: Number(form.expenses) || 0,
      completedWork: form.completedWork,
      remainingWork: form.remainingWork,
      constructionStatus: form.constructionStatus,
      notes: form.notes,
    });
    setEditing(false);
  };

  return (
    <div>
      <PageHeader
        title="Grey Structure Management"
        subtitle={project.name}
        actions={
          (isAdmin || isManager) && (
            <Button onClick={startEdit}>{editing ? 'Editing…' : 'Update'}</Button>
          )
        }
      />

      <Card title={`Building Grey Structure: ${gs.progress}% Complete`}>
        <ProgressBar value={gs.progress} />
      </Card>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: 12,
          marginTop: 16,
        }}
      >
        <Stat label="GS Budget" value={formatPKR(gs.budget)} />
        <Stat label="Expenses" value={formatPKR(gs.expenses)} tone="orange" />
        <Stat label="Remaining Budget" value={formatPKR(remainingBudget)} tone="green" />
        <Stat label="Sold / Booked Units" value={soldGs} tone="blue" />
        <Stat label="Unsold Units" value={unsold} />
        <Stat label="Status" value={gs.constructionStatus || '—'} />
      </div>

      <div className="resp-2col" style={{ marginTop: 16 }}>
        <Card title="Completed Work">
          <p style={{ whiteSpace: 'pre-wrap', color: 'var(--text-secondary)' }}>
            {gs.completedWork || '—'}
          </p>
        </Card>
        <Card title="Remaining Work">
          <p style={{ whiteSpace: 'pre-wrap', color: 'var(--text-secondary)' }}>
            {gs.remainingWork || '—'}
          </p>
        </Card>
      </div>

      {gs.notes && (
        <Card title="Notes">
          <p>{gs.notes}</p>
        </Card>
      )}

      {editing && (
        <Card title="Edit Grey Structure">
          <div className="resp-form-2">
            <Input label="Progress %" type="number" value={form.progress} onChange={(e) => setForm({ ...form, progress: e.target.value })} />
            <Input label="Budget" type="number" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} />
            <Input label="Expenses" type="number" value={form.expenses} onChange={(e) => setForm({ ...form, expenses: e.target.value })} />
            <Input label="Construction status" value={form.constructionStatus} onChange={(e) => setForm({ ...form, constructionStatus: e.target.value })} />
            <div style={{ gridColumn: '1 / -1' }}>
              <Textarea label="Completed work" value={form.completedWork} onChange={(e) => setForm({ ...form, completedWork: e.target.value })} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <Textarea label="Remaining work" value={form.remainingWork} onChange={(e) => setForm({ ...form, remainingWork: e.target.value })} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <Textarea label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <Button onClick={save}>Save</Button>
            <Button variant="secondary" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
