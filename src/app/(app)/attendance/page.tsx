'use client';

import { useMemo, useState } from 'react';
import { useAppStore, usePermission } from '@/store/useAppStore';
import { formatDate, isSameDay } from '@/lib/calculations';
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
import { LABOUR_CATEGORIES } from '@/lib/catalog';

export default function AttendancePage() {
  const { user, can } = usePermission();
  const attendance = useAppStore((s) => s.attendance);
  const projects = useAppStore((s) => s.projects);
  const selectedProjectId = useAppStore((s) => s.selectedProjectId);
  const addAttendance = useAppStore((s) => s.addAttendance);
  const deleteAttendance = useAppStore((s) => s.deleteAttendance);

  const list = useMemo(() => {
    let rows = attendance ?? [];
    if (selectedProjectId) rows = rows.filter((a) => a.projectId === selectedProjectId);
    return rows;
  }, [attendance, selectedProjectId]);

  const today = list.find((a) => isSameDay(a.date));
  const canEdit = can('record_attendance');
  const canDelete = can('delete_financials');

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    projectId: selectedProjectId ?? projects[0]?.id ?? '',
    date: new Date().toISOString().slice(0, 10),
    totalWorkers: '25',
    present: '22',
    absent: '3',
    category: 'General labour',
    remarks: '',
  });

  const submit = async () => {
    if (!form.projectId) return;
    const present = Number(form.present) || 0;
    const absent = Number(form.absent) || 0;
    await addAttendance({
      projectId: form.projectId,
      date: new Date(form.date).toISOString(),
      totalWorkers: Number(form.totalWorkers) || present + absent,
      present,
      absent,
      category: form.category,
      remarks: form.remarks,
      addedById: user?.id ?? '',
      addedByName: user?.name ?? 'User',
    });
    setOpen(false);
  };

  return (
    <div>
      <PageHeader
        title="Site Attendance"
        subtitle="Daily manpower — present, absent and labour category"
        actions={canEdit && <Button onClick={() => setOpen(true)}>Record attendance</Button>}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 16 }}>
        <Stat label="Today Present" value={today?.present ?? 0} tone="green" />
        <Stat label="Today Absent" value={today?.absent ?? 0} tone="red" />
        <Stat label="Today Total" value={today?.totalWorkers ?? 0} />
        <Stat label="Records" value={list.length} />
      </div>

      <Card title="Attendance history">
        <DataTable
          columns={[
            { key: 'date', label: 'Date' },
            { key: 'project', label: 'Project' },
            { key: 'cat', label: 'Category' },
            { key: 'total', label: 'Total' },
            { key: 'present', label: 'Present' },
            { key: 'absent', label: 'Absent' },
            { key: 'remarks', label: 'Remarks' },
            { key: 'by', label: 'Recorded by' },
            { key: 'actions', label: '' },
          ]}
          rows={list.map((a) => ({
            date: formatDate(a.date),
            project: projects.find((p) => p.id === a.projectId)?.name ?? '—',
            cat: a.category,
            total: a.totalWorkers,
            present: a.present,
            absent: a.absent,
            remarks: a.remarks || '—',
            by: a.addedByName,
            actions: canDelete ? (
              <Button size="sm" variant="danger" onClick={() => deleteAttendance(a.id)}>
                Delete
              </Button>
            ) : null,
          }))}
        />
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Daily Attendance">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Select label="Project" value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })}>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </Select>
          <Input label="Date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          <Select label="Labour category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {LABOUR_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </Select>
          <Input label="Total workers" type="number" value={form.totalWorkers} onChange={(e) => setForm({ ...form, totalWorkers: e.target.value })} />
          <Input label="Present" type="number" value={form.present} onChange={(e) => setForm({ ...form, present: e.target.value })} />
          <Input label="Absent" type="number" value={form.absent} onChange={(e) => setForm({ ...form, absent: e.target.value })} />
          <Textarea label="Remarks" value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} />
          <Button onClick={() => void submit()}>Save attendance</Button>
        </div>
      </Modal>
    </div>
  );
}
