'use client';

import { useMemo, useState } from 'react';
import { useAppStore, usePermission, EXPENSE_CATEGORIES } from '@/store/useAppStore';
import { formatPKR, formatDate } from '@/lib/calculations';
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
import type { ExpenseCategory } from '@/lib/types';

export default function ExpensesPage() {
  const { user, isAdmin, can } = usePermission();
  const expenses = useAppStore((s) => s.expenses);
  const projects = useAppStore((s) => s.projects);
  const units = useAppStore((s) => s.units);
  const selectedProjectId = useAppStore((s) => s.selectedProjectId);
  const addExpense = useAppStore((s) => s.addExpense);
  const updateExpense = useAppStore((s) => s.updateExpense);
  const deleteExpense = useAppStore((s) => s.deleteExpense);

  const list = useMemo(() => {
    let rows = expenses;
    if (selectedProjectId) rows = rows.filter((e) => e.projectId === selectedProjectId);
    return rows;
  }, [expenses, selectedProjectId]);

  const total = list.reduce((s, e) => s + e.amount, 0);
  const byCategory = EXPENSE_CATEGORIES.map((cat) => ({
    cat,
    amount: list.filter((e) => e.category === cat).reduce((s, e) => s + e.amount, 0),
  })).filter((x) => x.amount > 0);

  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    projectId: selectedProjectId ?? projects[0]?.id ?? '',
    unitId: '',
    category: 'Cement' as ExpenseCategory,
    amount: '',
    date: new Date().toISOString().slice(0, 10),
    description: '',
    receiptDataUrl: '',
    receiptName: '',
  });

  const canEdit = isAdmin || can('add_expenses');

  const submit = () => {
    if (!form.projectId || !form.amount) return;
    if (editId) {
      updateExpense(editId, {
        projectId: form.projectId,
        unitId: form.unitId || undefined,
        category: form.category,
        amount: Number(form.amount) || 0,
        date: new Date(form.date).toISOString(),
        description: form.description,
        receiptDataUrl: form.receiptDataUrl || undefined,
        receiptName: form.receiptName || undefined,
      });
    } else {
      addExpense({
        projectId: form.projectId,
        unitId: form.unitId || undefined,
        category: form.category,
        amount: Number(form.amount) || 0,
        date: new Date(form.date).toISOString(),
        description: form.description,
        receiptDataUrl: form.receiptDataUrl || undefined,
        receiptName: form.receiptName || undefined,
        addedById: user?.id ?? '',
        addedByName: user?.name ?? 'User',
      });
    }
    setOpen(false);
    setEditId(null);
  };

  return (
    <div>
      <PageHeader
        title="Construction Expenses"
        subtitle="Track materials, labour and project costs"
        actions={
          canEdit && (
            <Button
              onClick={() => {
                setEditId(null);
                setForm({
                  projectId: selectedProjectId ?? projects[0]?.id ?? '',
                  unitId: '',
                  category: 'Cement',
                  amount: '',
                  date: new Date().toISOString().slice(0, 10),
                  description: '',
                  receiptDataUrl: '',
                  receiptName: '',
                });
                setOpen(true);
              }}
            >
              Add expense
            </Button>
          )
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 16 }}>
        <Stat label="Total Expenses" value={formatPKR(total)} tone="orange" />
        <Stat label="Entries" value={list.length} />
        <Stat label="Categories used" value={byCategory.length} />
      </div>

      <Card title="By category">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {byCategory.map((c) => (
            <div
              key={c.cat}
              style={{
                border: '1px solid var(--border-color)',
                borderRadius: 8,
                padding: '8px 12px',
                fontSize: 12,
              }}
            >
              <div style={{ color: 'var(--text-tertiary)' }}>{c.cat}</div>
              <strong>{formatPKR(c.amount)}</strong>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Expense ledger">
        <DataTable
          columns={[
            { key: 'date', label: 'Date' },
            { key: 'category', label: 'Category' },
            { key: 'amount', label: 'Amount' },
            { key: 'project', label: 'Project' },
            { key: 'unit', label: 'Unit' },
            { key: 'desc', label: 'Description' },
            { key: 'by', label: 'Added by' },
            { key: 'actions', label: '' },
          ]}
          rows={list.map((e) => ({
            date: formatDate(e.date),
            category: e.category,
            amount: <strong>{formatPKR(e.amount)}</strong>,
            project: projects.find((p) => p.id === e.projectId)?.name ?? '—',
            unit: units.find((u) => u.id === e.unitId)?.number ?? '—',
            desc: e.description,
            by: e.addedByName,
            actions: canEdit ? (
              <div style={{ display: 'flex', gap: 6 }}>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setEditId(e.id);
                    setForm({
                      projectId: e.projectId,
                      unitId: e.unitId ?? '',
                      category: e.category,
                      amount: String(e.amount),
                      date: e.date.slice(0, 10),
                      description: e.description,
                      receiptDataUrl: e.receiptDataUrl ?? '',
                      receiptName: e.receiptName ?? '',
                    });
                    setOpen(true);
                  }}
                >
                  Edit
                </Button>
                {(isAdmin || can('update_expenses')) && (
                  <Button size="sm" variant="danger" onClick={() => deleteExpense(e.id)}>
                    Delete
                  </Button>
                )}
              </div>
            ) : null,
          }))}
        />
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title={editId ? 'Edit Expense' : 'Add Expense'}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Select label="Project" value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })}>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </Select>
          <Select label="Related unit (optional)" value={form.unitId} onChange={(e) => setForm({ ...form, unitId: e.target.value })}>
            <option value="">None</option>
            {units
              .filter((u) => u.projectId === form.projectId)
              .map((u) => (
                <option key={u.id} value={u.id}>{u.number}</option>
              ))}
          </Select>
          <Select label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as ExpenseCategory })}>
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </Select>
          <Input label="Amount" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          <Input label="Date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          <Textarea label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <Input
            label="Receipt / bill"
            type="file"
            accept="image/*,application/pdf"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const dataUrl = await fileToDataUrl(file);
              setForm({ ...form, receiptDataUrl: dataUrl, receiptName: file.name });
            }}
          />
          <Button onClick={submit}>Save expense</Button>
        </div>
      </Modal>
    </div>
  );
}
