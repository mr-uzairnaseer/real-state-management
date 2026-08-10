'use client';

import { useMemo } from 'react';
import { useAppStore } from '@/store/useAppStore';
import {
  calculateProjectProgress,
  countByStatus,
  formatPKR,
  statusLabel,
} from '@/lib/calculations';
import { exportToExcel, exportToPdf } from '@/lib/export';
import { Button, Card, PageHeader, ProgressBar, Stat } from '@/components/ui';

export default function ReportsPage() {
  const projects = useAppStore((s) => s.projects);
  const units = useAppStore((s) => s.units);
  const tasks = useAppStore((s) => s.tasks);
  const expenses = useAppStore((s) => s.expenses);
  const reports = useAppStore((s) => s.reports);
  const selectedProjectId = useAppStore((s) => s.selectedProjectId);

  const scopedProjects = selectedProjectId
    ? projects.filter((p) => p.id === selectedProjectId)
    : projects;
  const scopedIds = new Set(scopedProjects.map((p) => p.id));
  const scopedUnits = units.filter((u) => scopedIds.has(u.projectId));
  const scopedExpenses = expenses.filter((e) => scopedIds.has(e.projectId));

  const counts = countByStatus(scopedUnits);
  const sales = scopedUnits.reduce((s, u) => s + (u.sale?.amountReceived ?? 0), 0);
  const rent = scopedUnits.reduce(
    (s, u) =>
      s + (u.rental?.paymentHistory.reduce((a, p) => a + p.paidAmount, 0) ?? 0),
    0,
  );
  const pendingPayments =
    scopedUnits.reduce((s, u) => s + (u.sale?.remainingAmount ?? 0), 0) +
    scopedUnits.reduce((s, u) => s + (u.booking?.remainingAmount ?? 0), 0);
  const expenseTotal = scopedExpenses.reduce((s, e) => s + e.amount, 0);
  const profit = scopedUnits.reduce((s, u) => s + (u.sale?.profit ?? 0), 0);

  const monthlyExpenses = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of scopedExpenses) {
      const key = e.date.slice(0, 7);
      map.set(key, (map.get(key) ?? 0) + e.amount);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [scopedExpenses]);

  const monthlyRent = useMemo(() => {
    const map = new Map<string, number>();
    for (const u of scopedUnits) {
      for (const p of u.rental?.paymentHistory ?? []) {
        map.set(p.month, (map.get(p.month) ?? 0) + p.paidAmount);
      }
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [scopedUnits]);

  const exportInventoryExcel = () => {
    exportToExcel('shop-inventory', [
      {
        name: 'Inventory',
        rows: scopedUnits.map((u) => ({
          Unit: u.number,
          Project: projects.find((p) => p.id === u.projectId)?.name ?? '',
          Floor: u.floor,
          Size: u.size,
          Status: statusLabel(u.status),
          Progress: u.constructionProgress,
          SalePrice: u.salePrice,
          RentalPrice: u.rentalPrice,
        })),
      },
    ]);
  };

  const exportExpensesExcel = () => {
    exportToExcel('construction-expenses', [
      {
        name: 'Expenses',
        rows: scopedExpenses.map((e) => ({
          Date: e.date.slice(0, 10),
          Category: e.category,
          Amount: e.amount,
          Project: projects.find((p) => p.id === e.projectId)?.name ?? '',
          Description: e.description,
          AddedBy: e.addedByName,
        })),
      },
    ]);
  };

  const exportProgressPdf = () => {
    exportToPdf(
      'Project Progress Report',
      ['Project', 'Progress %', 'Budget', 'Status', 'Units'],
      scopedProjects.map((p) => [
        p.name,
        calculateProjectProgress(tasks, p.id, units),
        p.totalBudget,
        statusLabel(p.status),
        units.filter((u) => u.projectId === p.id).length,
      ]),
      'project-progress',
    );
  };

  const exportFinancialPdf = () => {
    exportToPdf(
      'Financial Summary',
      ['Metric', 'Amount (PKR)'],
      [
        ['Sales Received', sales],
        ['Rent Received', rent],
        ['Pending Payments', pendingPayments],
        ['Expenses', expenseTotal],
        ['Profit', profit],
      ],
      'financial-summary',
    );
  };

  return (
    <div>
      <PageHeader
        title="Reports & Analytics"
        subtitle="Dashboard views with PDF / Excel export"
        actions={
          <>
            <Button variant="secondary" onClick={exportInventoryExcel}>
              Export Inventory Excel
            </Button>
            <Button variant="secondary" onClick={exportExpensesExcel}>
              Export Expenses Excel
            </Button>
            <Button variant="secondary" onClick={exportProgressPdf}>
              Progress PDF
            </Button>
            <Button onClick={exportFinancialPdf}>Financial PDF</Button>
          </>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
        <Stat label="Sales" value={formatPKR(sales)} tone="green" />
        <Stat label="Rent" value={formatPKR(rent)} tone="blue" />
        <Stat label="Pending" value={formatPKR(pendingPayments)} tone="orange" />
        <Stat label="Expenses" value={formatPKR(expenseTotal)} />
        <Stat label="Profit" value={formatPKR(profit)} tone="green" />
        <Stat label="Sold" value={counts.sold} />
        <Stat label="Rented" value={counts.rented} />
        <Stat label="Available" value={counts.available} />
      </div>

      <div className="resp-2col" style={{ marginTop: 16 }}>
        <Card title="Project Progress">
          {scopedProjects.map((p) => {
            const pct = calculateProjectProgress(tasks, p.id, units);
            return (
              <div key={p.id} style={{ marginBottom: 14 }}>
                <ProgressBar value={pct} label={p.name} />
              </div>
            );
          })}
        </Card>

        <Card title="Monthly Expenses">
          {monthlyExpenses.length === 0 && <p style={{ color: 'var(--text-tertiary)' }}>No data</p>}
          {monthlyExpenses.map(([month, amount]) => (
            <div
              key={month}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '8px 0',
                borderBottom: '1px solid var(--border-color)',
                fontSize: 13,
              }}
            >
              <span style={{ fontFamily: 'var(--font-mono)' }}>{month}</span>
              <strong>{formatPKR(amount)}</strong>
            </div>
          ))}
        </Card>

        <Card title="Monthly Rental Collection">
          {monthlyRent.length === 0 && <p style={{ color: 'var(--text-tertiary)' }}>No data</p>}
          {monthlyRent.map(([month, amount]) => (
            <div
              key={month}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '8px 0',
                borderBottom: '1px solid var(--border-color)',
                fontSize: 13,
              }}
            >
              <span style={{ fontFamily: 'var(--font-mono)' }}>{month}</span>
              <strong>{formatPKR(amount)}</strong>
            </div>
          ))}
        </Card>

        <Card title="Manager Performance">
          {reports.length === 0 && <p style={{ color: 'var(--text-tertiary)' }}>No reports</p>}
          {reports.slice(0, 8).map((r) => (
            <div key={r.id} style={{ marginBottom: 12, fontSize: 13 }}>
              <strong>{r.managerName}</strong> — {r.title}
              <div style={{ color: 'var(--text-tertiary)', fontSize: 11 }}>{r.period}</div>
              <p style={{ color: 'var(--text-secondary)' }}>Done: {r.completedWork}</p>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}
