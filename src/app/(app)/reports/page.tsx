'use client';

import { useMemo } from 'react';
import { useAppStore, usePermission } from '@/store/useAppStore';
import {
  calculateProjectProgress,
  countByStatus,
  formatPKR,
  statusLabel,
  isSameDay,
  formatDate,
} from '@/lib/calculations';
import { exportToExcel, exportToPdf } from '@/lib/export';
import { Button, Card, PageHeader, ProgressBar, Stat } from '@/components/ui';

export default function ReportsPage() {
  const { can } = usePermission();
  const site = can('view_site_reports');
  const finance = can('view_financial_reports');

  const projects = useAppStore((s) => s.projects);
  const units = useAppStore((s) => s.units);
  const tasks = useAppStore((s) => s.tasks);
  const expenses = useAppStore((s) => s.expenses);
  const purchases = useAppStore((s) => s.purchases ?? []);
  const attendance = useAppStore((s) => s.attendance ?? []);
  const updates = useAppStore((s) => s.updates);
  const reports = useAppStore((s) => s.reports);
  const selectedProjectId = useAppStore((s) => s.selectedProjectId);

  const scopedProjects = selectedProjectId
    ? projects.filter((p) => p.id === selectedProjectId)
    : projects;
  const scopedIds = new Set(scopedProjects.map((p) => p.id));
  const scopedUnits = units.filter((u) => scopedIds.has(u.projectId));
  const scopedExpenses = expenses.filter((e) => scopedIds.has(e.projectId));
  const scopedPurchases = purchases.filter((p) => scopedIds.has(p.projectId));
  const scopedAttendance = attendance.filter((a) => scopedIds.has(a.projectId));
  const scopedUpdates = updates.filter((u) => scopedIds.has(u.projectId));

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

  const exportDailyExpense = () => {
    const today = new Date().toISOString();
    exportToExcel('daily-expense', [
      {
        name: 'Expenses',
        rows: scopedExpenses
          .filter((e) => isSameDay(e.date))
          .map((e) => ({
            Date: e.date.slice(0, 10),
            Category: e.category,
            Amount: e.amount,
            Description: e.description,
            AddedBy: e.addedByName,
          })),
      },
    ]);
  };

  const exportMonthlyExpense = () => {
    exportToExcel('monthly-expense', [
      {
        name: 'By month',
        rows: monthlyExpenses.map(([month, amount]) => ({ Month: month, Amount: amount })),
      },
    ]);
  };

  const exportUnitExpense = () => {
    exportToExcel('unit-expense', [
      {
        name: 'By unit',
        rows: scopedUnits.map((u) => ({
          Unit: u.number,
          Expenses: scopedExpenses
            .filter((e) => e.unitId === u.id)
            .reduce((s, e) => s + e.amount, 0),
        })),
      },
    ]);
  };

  const exportClientPayments = () => {
    exportToExcel('client-payments', [
      {
        name: 'Sales',
        rows: scopedUnits
          .filter((u) => u.sale)
          .map((u) => ({
            Unit: u.number,
            Buyer: u.sale?.buyer.name ?? '',
            SalePrice: u.sale?.salePrice ?? 0,
            Received: u.sale?.amountReceived ?? 0,
            Remaining: u.sale?.remainingAmount ?? 0,
          })),
      },
    ]);
  };

  const exportPendingPayments = () => {
    exportToPdf(
      'Pending Payment Report',
      ['Unit', 'Client', 'Total', 'Received', 'Pending'],
      scopedUnits
        .filter((u) => (u.sale?.remainingAmount ?? 0) > 0)
        .map((u) => [
          u.number,
          u.sale?.buyer.name ?? '',
          u.sale?.salePrice ?? 0,
          u.sale?.amountReceived ?? 0,
          u.sale?.remainingAmount ?? 0,
        ]),
      'pending-payments',
    );
  };

  const exportPurchases = () => {
    exportToExcel('material-purchase-report', [
      {
        name: 'Purchases',
        rows: scopedPurchases.map((p) => ({
          Date: p.date.slice(0, 10),
          Item: p.item,
          Qty: p.quantity,
          UnitPrice: p.unitPrice,
          Total: p.totalAmount,
          Supplier: p.supplier,
          Unit: units.find((u) => u.id === p.unitId)?.number ?? 'Common',
        })),
      },
    ]);
  };

  const exportAttendance = () => {
    exportToExcel('worker-attendance-report', [
      {
        name: 'Attendance',
        rows: scopedAttendance.map((a) => ({
          Date: a.date.slice(0, 10),
          Category: a.category,
          Total: a.totalWorkers,
          Present: a.present,
          Absent: a.absent,
          Remarks: a.remarks,
        })),
      },
    ]);
  };

  const exportUnitCompletion = () => {
    exportToPdf(
      'Unit Completion Report',
      ['Unit', 'Type', 'Progress %', 'Status', 'Remaining %'],
      scopedUnits.map((u) => [
        u.number,
        u.type,
        u.constructionProgress,
        statusLabel(u.status),
        Math.max(0, Math.round(100 - u.constructionProgress)),
      ]),
      'unit-completion',
    );
  };

  const exportProgressPdf = () => {
    exportToPdf(
      'Project Progress Report',
      ['Project', 'Progress %', 'Budget', 'Status', 'Units'],
      scopedProjects.map((p) => [
        p.name,
        calculateProjectProgress(tasks, p.id, units),
        finance ? p.totalBudget : '—',
        statusLabel(p.status),
        units.filter((u) => u.projectId === p.id).length,
      ]),
      'project-progress',
    );
  };

  const exportDailySite = () => {
    exportToPdf(
      'Daily Site Report',
      ['Time', 'Unit', 'Note'],
      scopedUpdates
        .filter((u) => isSameDay(u.createdAt))
        .map((u) => [
          formatDate(u.createdAt),
          units.find((x) => x.id === u.unitId)?.number ?? '—',
          u.note,
        ]),
      'daily-site',
    );
  };

  const exportOverall = () => {
    exportToPdf(
      'Overall Project Report',
      ['Metric', 'Value'],
      [
        ['Units', scopedUnits.length],
        ['Sold', counts.sold],
        ['Rented', counts.rented],
        ...(finance
          ? [
              ['Sales received (PKR)', sales],
              ['Pending (PKR)', pendingPayments],
              ['Expenses (PKR)', expenseTotal],
              ['Purchases (PKR)', scopedPurchases.reduce((s, p) => s + p.totalAmount, 0)],
            ]
          : []),
      ],
      'overall-project-report',
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
        title="Reports"
        subtitle={
          site && finance
            ? 'Site and finance exports'
            : site
              ? 'Site progress, attendance, and daily logs'
              : 'Sales, expenses, and receivables'
        }
        actions={
          <>
            {site && (
              <>
                <Button variant="secondary" onClick={exportDailySite}>
                  Daily site PDF
                </Button>
                <Button variant="secondary" onClick={exportDailyExpense}>
                  Daily expense Excel
                </Button>
                <Button variant="secondary" onClick={exportProgressPdf}>
                  Progress PDF
                </Button>
                <Button variant="secondary" onClick={exportAttendance}>
                  Attendance Excel
                </Button>
                <Button variant="secondary" onClick={exportUnitCompletion}>
                  Unit completion PDF
                </Button>
                <Button variant="secondary" onClick={exportPurchases}>
                  Purchases Excel
                </Button>
              </>
            )}
            {finance && (
              <>
                <Button variant="secondary" onClick={exportMonthlyExpense}>
                  Monthly expense Excel
                </Button>
                <Button variant="secondary" onClick={exportUnitExpense}>
                  Unit expense Excel
                </Button>
                <Button variant="secondary" onClick={exportClientPayments}>
                  Client payments Excel
                </Button>
                <Button variant="secondary" onClick={exportPendingPayments}>
                  Pending payments PDF
                </Button>
                <Button variant="secondary" onClick={exportPurchases}>
                  Purchases Excel
                </Button>
                <Button variant="secondary" onClick={exportOverall}>
                  Overall PDF
                </Button>
                <Button onClick={exportFinancialPdf}>Financial PDF</Button>
              </>
            )}
          </>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
        {finance ? (
          <>
            <Stat label="Sales" value={formatPKR(sales)} tone="green" />
            <Stat label="Rent" value={formatPKR(rent)} tone="blue" />
            <Stat label="Pending" value={formatPKR(pendingPayments)} tone="orange" />
            <Stat label="Expenses" value={formatPKR(expenseTotal)} />
            <Stat label="Profit" value={formatPKR(profit)} tone="green" />
          </>
        ) : (
          <>
            <Stat label="Units" value={scopedUnits.length} />
            <Stat label="Avg progress" value={`${Math.round(scopedUnits.reduce((s, u) => s + u.constructionProgress, 0) / Math.max(1, scopedUnits.length))}%`} tone="blue" />
            <Stat label="Site expenses today" value={formatPKR(scopedExpenses.filter((e) => isSameDay(e.date)).reduce((s, e) => s + e.amount, 0))} />
          </>
        )}
        <Stat label="Sold" value={counts.sold} />
        <Stat label="Rented" value={counts.rented} />
        <Stat label="Available" value={counts.available} />
      </div>

      <div className="resp-2col" style={{ marginTop: 16 }}>
        {site && (
          <Card title="Project progress">
            {scopedProjects.map((p) => {
              const pct = calculateProjectProgress(tasks, p.id, units);
              return (
                <div key={p.id} style={{ marginBottom: 14 }}>
                  <ProgressBar value={pct} label={p.name} />
                </div>
              );
            })}
          </Card>
        )}

        {finance && (
          <>
            <Card title="Monthly expenses">
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

            <Card title="Monthly rental collection">
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
          </>
        )}

        {site && (
          <Card title="Site reports">
            {reports.length === 0 && <p style={{ color: 'var(--text-tertiary)' }}>No reports</p>}
            {reports.slice(0, 8).map((r) => (
              <div key={r.id} style={{ marginBottom: 12, fontSize: 13 }}>
                <strong>{r.managerName}</strong> — {r.title}
                <div style={{ color: 'var(--text-tertiary)', fontSize: 11 }}>{r.period}</div>
                <p style={{ color: 'var(--text-secondary)' }}>Done: {r.completedWork}</p>
              </div>
            ))}
          </Card>
        )}
      </div>
    </div>
  );
}
