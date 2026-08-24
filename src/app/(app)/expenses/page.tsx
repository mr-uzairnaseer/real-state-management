'use client';

import { useMemo, useState } from 'react';
import { useAppStore, usePermission, EXPENSE_CATEGORIES } from '@/store/useAppStore';
import { formatPKR, formatDate, isSameDay, isSameWeek, isSameMonth } from '@/lib/calculations';
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
import type { ExpenseCategory, ExpenseScope, PaymentMethod } from '@/lib/types';
import { EXPENSE_SCOPES, PAYMENT_METHODS } from '@/lib/catalog';

export default function ExpensesPage() {
  const { user, can } = usePermission();
  const canEdit = can('add_expenses');
  const canDelete = can('delete_financials');
  const canTweak = can('edit_expenses') || canDelete;
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
  const dailyTotal = list.filter((e) => e.scope === 'daily').reduce((s, e) => s + e.amount, 0);
  const todayTotal = list.filter((e) => isSameDay(e.date)).reduce((s, e) => s + e.amount, 0);
  const weekTotal = list.filter((e) => isSameWeek(e.date)).reduce((s, e) => s + e.amount, 0);
  const monthTotal = list.filter((e) => isSameMonth(e.date)).reduce((s, e) => s + e.amount, 0);
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
    scope: 'unit' as ExpenseScope,
    paymentMethod: 'cash' as PaymentMethod,
    remarks: '',
  });

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
        scope: form.scope,
        paymentMethod: form.paymentMethod,
        remarks: form.remarks,
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
        scope: form.scope,
        paymentMethod: form.paymentMethod,
        remarks: form.remarks,
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
        title={can('view_financials') && !can('update_progress') ? 'Project expenses' : 'Site & project expenses'}
        subtitle={
          can('update_progress')
            ? 'Daily site costs, unit spend and material-linked expenses'
            : 'Construction, administrative and purchase-linked costs'
        }
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
                  scope: 'unit',
                  paymentMethod: 'cash',
                  remarks: '',
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
        <Stat label="Today" value={formatPKR(todayTotal)} />
        <Stat label="This week" value={formatPKR(weekTotal)} />
        <Stat label="This month" value={formatPKR(monthTotal)} />
        <Stat label="Daily site expenses" value={formatPKR(dailyTotal)} tone="blue" />
        <Stat label="Entries" value={list.length} />
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
            { key: 'scope', label: 'Scope' },
            { key: 'method', label: 'Method' },
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
            scope: e.scope,
            method: e.paymentMethod,
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
                      scope: e.scope,
                      paymentMethod: e.paymentMethod,
                      remarks: e.remarks,
                    });
                    setOpen(true);
                  }}
                >
                  Edit
                </Button>
                {(can('edit_expenses') || canTweak) && (
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => {
                      if (!canDelete) return;
                      deleteExpense(e.id);
                    }}
                    disabled={!canDelete}
                  >
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
          <Select label="Scope" value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value as ExpenseScope })}>
            {EXPENSE_SCOPES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </Select>
          <Select label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as ExpenseCategory })}>
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </Select>
          <Input label="Amount" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          <Input label="Date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          <Select label="Payment method" value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value as PaymentMethod })}>
            {PAYMENT_METHODS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </Select>
          <Textarea label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <Textarea label="Remarks" value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} />
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
