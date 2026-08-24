'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useAppStore, usePermission } from '@/store/useAppStore';
import {
  calculateProjectProgress,
  countByStatus,
  formatPKR,
  formatDateTime,
  statusLabel,
  clientPayLabel,
  isSameDay,
} from '@/lib/calculations';
import { Badge, Card, PageHeader, ProgressBar, Stat } from '@/components/ui';
import { unitTone } from '@/lib/helpers';
import { ROLE_LABEL } from '@/lib/access';
import styles from './dashboard.module.css';

export default function DashboardPage() {
  const { user, role, isAdmin, isManager, isAccountant, can } = usePermission();
  const projects = useAppStore((s) => s.projects);
  const units = useAppStore((s) => s.units);
  const tasks = useAppStore((s) => s.tasks);
  const expenses = useAppStore((s) => s.expenses);
  const purchases = useAppStore((s) => s.purchases ?? []);
  const attendance = useAppStore((s) => s.attendance ?? []);
  const updates = useAppStore((s) => s.updates);
  const media = useAppStore((s) => s.media);
  const notifications = useAppStore((s) => s.notifications);
  const selectedProjectId = useAppStore((s) => s.selectedProjectId);

  const scopedProjects = useMemo(() => {
    let list = projects;
    if (isManager && user) {
      list = list.filter((p) => user.assignedProjectIds.includes(p.id));
    }
    if (selectedProjectId) list = list.filter((p) => p.id === selectedProjectId);
    return list;
  }, [projects, selectedProjectId, isManager, user]);

  const scopedIds = new Set(scopedProjects.map((p) => p.id));
  const scopedUnits = units.filter((u) => scopedIds.has(u.projectId));
  const scopedExpenses = expenses.filter((e) => scopedIds.has(e.projectId));
  const counts = countByStatus(scopedUnits);

  const totalSales = scopedUnits.reduce((s, u) => s + (u.sale?.amountReceived ?? 0), 0);
  const totalRent = scopedUnits.reduce(
    (s, u) => s + (u.rental?.paymentHistory.reduce((a, p) => a + p.paidAmount, 0) ?? 0),
    0,
  );
  const rentPending = scopedUnits.reduce((s, u) => {
    const pending =
      u.rental?.paymentHistory
        .filter((p) => p.status === 'pending' || p.status === 'overdue')
        .reduce((a, p) => a + (p.amount - p.paidAmount), 0) ?? 0;
    return s + pending;
  }, 0);
  const totalExpenseAmt = scopedExpenses.reduce((s, e) => s + e.amount, 0);
  const dailyExpenseAmt = scopedExpenses.filter((e) => e.scope === 'daily').reduce((s, e) => s + e.amount, 0);
  const purchaseAmt = purchases.filter((p) => scopedIds.has(p.projectId)).reduce((s, p) => s + p.totalAmount, 0);
  const todayExpense = scopedExpenses.filter((e) => isSameDay(e.date)).reduce((s, e) => s + e.amount, 0);
  const todayPurchases = purchases
    .filter((p) => scopedIds.has(p.projectId) && isSameDay(p.date))
    .reduce((s, p) => s + p.totalAmount, 0);
  const todayAttend = attendance.filter((a) => scopedIds.has(a.projectId) && isSameDay(a.date));
  const todayPresent = todayAttend.reduce((s, a) => s + a.present, 0);
  const totalReceivable = scopedUnits.reduce(
    (s, u) => s + (u.sale?.salePrice ?? (u.status === 'sold' ? u.salePrice : 0)),
    0,
  );
  const totalReceived = totalSales + totalRent;
  const completedUnits = scopedUnits.filter(
    (u) => u.constructionProgress >= 100 || u.status === 'completed',
  ).length;
  const totalProfit = scopedUnits.reduce((s, u) => s + (u.sale?.profit ?? 0), 0);
  const outstanding = scopedUnits.reduce(
    (s, u) => s + (u.sale?.remainingAmount ?? 0) + (u.booking?.remainingAmount ?? 0),
    0,
  );

  const overallProgress =
    scopedProjects.length === 0
      ? 0
      : Math.round(
          (scopedProjects.reduce((s, p) => s + calculateProjectProgress(tasks, p.id, units), 0) /
            scopedProjects.length) *
            10,
        ) / 10;

  const greyAvg =
    scopedProjects.length === 0
      ? 0
      : Math.round(
          (scopedProjects.reduce((s, p) => s + p.greyStructure.progress, 0) / scopedProjects.length) *
            10,
        ) / 10;

  const finishingTasks = tasks.filter(
    (t) =>
      scopedIds.has(t.projectId) &&
      !t.unitId &&
      ['Paint', 'Flooring', 'Ceiling', 'Decoration', 'Final', 'Lighting'].some((k) =>
        t.name.includes(k),
      ),
  );
  const finishingPct =
    finishingTasks.length === 0
      ? 0
      : Math.round(
          (finishingTasks.reduce((s, t) => s + t.progress, 0) / finishingTasks.length) * 10,
        ) / 10;

  const recentUpdates = updates.filter((u) => scopedIds.has(u.projectId)).slice(0, 5);
  const recentMedia = media.filter((m) => scopedIds.has(m.projectId)).slice(0, 6);
  const recentNotifs = notifications.slice(0, 5);

  const focusProject = selectedProjectId
    ? projects.find((p) => p.id === selectedProjectId)
    : scopedProjects[0];
  const focusProgress = focusProject
    ? calculateProjectProgress(tasks, focusProject.id, units)
    : 0;
  const focusTasks = focusProject
    ? tasks.filter((t) => t.projectId === focusProject.id && !t.unitId).sort((a, b) => a.order - b.order)
    : [];
  const completedStages = focusTasks.filter((t) => t.progress >= 100);
  const remainingStages = focusTasks.filter((t) => t.progress < 100);

  const title = role ? `${ROLE_LABEL[role]} dashboard` : 'Dashboard';
  const subtitle = isManager
    ? 'What happened on site today — progress, spend, manpower, photos'
    : isAccountant
      ? 'Receivables, expenses and payment status across the project'
      : 'Remote overview of construction, inventory and money';

  return (
    <div className="animate-fade-in">
      <PageHeader title={title} subtitle={subtitle} />

      {focusProject && can('view_construction') && (
        <Card className={styles.hero} title={`Site progress — ${focusProject.name}`}>
          <div className={styles.heroGrid}>
            <div>
              <div className={styles.heroPct}>{focusProgress}%</div>
              <ProgressBar value={focusProgress} label="Weighted completion" />
              <p className={styles.heroHint}>From stage weights on this project</p>
            </div>
            <div className={styles.stageCols}>
              <div>
                <h4>Completed</h4>
                <ul>
                  {completedStages.slice(0, 6).map((t) => (
                    <li key={t.id}>
                      {t.name} — {t.progress}%
                    </li>
                  ))}
                  {completedStages.length === 0 && <li>None yet</li>}
                </ul>
              </div>
              <div>
                <h4>Remaining</h4>
                <ul>
                  {remainingStages.slice(0, 6).map((t) => (
                    <li key={t.id}>
                      {t.name} — {t.progress}%
                    </li>
                  ))}
                  {remainingStages.length === 0 && <li>All stages complete</li>}
                </ul>
              </div>
            </div>
          </div>
        </Card>
      )}

      {isManager && (
        <>
          <div className={styles.sectionLabel}>Today on site</div>
          <div className={styles.statGrid}>
            <Stat label="Overall completion" value={`${overallProgress}%`} tone="blue" />
            <Stat label="Remaining work" value={`${Math.max(0, Math.round(100 - overallProgress))}%`} />
            <Stat label="Today's expense" value={formatPKR(todayExpense)} tone="orange" />
            <Stat label="Today's purchases" value={formatPKR(todayPurchases)} />
            <Stat label="Workers present" value={todayPresent} tone="green" />
            <Stat label="Units under construction" value={counts.under_construction} />
          </div>
        </>
      )}

      {isAccountant && (
        <>
          <div className={styles.sectionLabel}>Money</div>
          <div className={styles.statGrid}>
            <Stat label="Receivables" value={formatPKR(totalReceivable)} />
            <Stat label="Received" value={formatPKR(totalReceived)} tone="green" />
            <Stat label="Pending" value={formatPKR(outstanding + rentPending)} tone="red" />
            <Stat label="Expenses" value={formatPKR(totalExpenseAmt)} tone="orange" />
            <Stat label="Purchases" value={formatPKR(purchaseAmt)} />
            <Stat label="Profit" value={formatPKR(totalProfit)} tone="green" />
          </div>
          <div className={styles.sectionLabel}>Inventory snapshot</div>
          <div className={styles.statGrid}>
            <Stat label="Sold" value={counts.sold} tone="green" />
            <Stat label="Rented" value={counts.rented} tone="blue" />
            <Stat label="Available" value={counts.available} />
            <Stat label="Booked / reserved" value={counts.booked + counts.reserved} tone="orange" />
          </div>
        </>
      )}

      {isAdmin && (
        <>
          <div className={styles.sectionLabel}>Projects</div>
          <div className={styles.statGrid}>
            <Stat label="Total projects" value={scopedProjects.length} />
            <Stat label="Active" value={scopedProjects.filter((p) => p.status === 'active').length} tone="blue" />
            <Stat
              label="Completed"
              value={scopedProjects.filter((p) => p.status === 'completed').length}
              tone="green"
            />
            <Stat label="Overall progress" value={`${overallProgress}%`} tone="orange" />
          </div>

          <div className={styles.sectionLabel}>Inventory</div>
          <div className={styles.statGrid}>
            <Stat label="Total units" value={counts.total} />
            <Stat label="Completed units" value={completedUnits} tone="green" />
            <Stat label="Sold" value={counts.sold} tone="green" />
            <Stat label="Rented" value={counts.rented} tone="blue" />
            <Stat label="Available" value={counts.available} />
            <Stat label="Under construction" value={counts.under_construction} />
          </div>

          <div className={styles.sectionLabel}>Financials</div>
          <div className={styles.statGrid}>
            <Stat label="Client receivables" value={formatPKR(totalReceivable)} />
            <Stat label="Amount received" value={formatPKR(totalReceived)} tone="green" />
            <Stat label="Pending" value={formatPKR(outstanding + rentPending)} tone="red" />
            <Stat label="Construction expense" value={formatPKR(totalExpenseAmt)} tone="orange" />
            <Stat label="Daily site expense" value={formatPKR(dailyExpenseAmt)} />
            <Stat label="Material purchases" value={formatPKR(purchaseAmt)} />
            <Stat label="Today expense" value={formatPKR(todayExpense)} />
            <Stat label="Today purchases" value={formatPKR(todayPurchases)} />
            <Stat label="Today attendance" value={todayPresent} tone="blue" />
            <Stat label="Profit" value={formatPKR(totalProfit)} tone="green" />
          </div>

          <div className={styles.sectionLabel}>Construction</div>
          <div className={styles.statGrid}>
            <Stat label="Overall completion" value={`${overallProgress}%`} />
            <Stat label="Grey structure" value={`${greyAvg}%`} tone="blue" />
            <Stat label="Finishing" value={`${finishingPct}%`} tone="orange" />
            <Stat label="Remaining" value={`${Math.max(0, Math.round(100 - overallProgress))}%`} />
          </div>
        </>
      )}

      <div className={styles.twoCol}>
        {!isAccountant && (
          <Card title="Recent site updates">
            <ul className={styles.feed}>
              {recentUpdates.map((u) => (
                <li key={u.id}>
                  <div className={styles.feedTitle}>{u.title}</div>
                  <div className={styles.feedMeta}>
                    {u.managerName} · {u.workCategory} · {formatDateTime(u.createdAt)}
                  </div>
                  <p>{u.comment}</p>
                </li>
              ))}
              {recentUpdates.length === 0 && <li>No updates yet</li>}
            </ul>
          </Card>
        )}

        {can('view_financials') && (
          <Card title="Projects">
            <div className={styles.projectList}>
              {scopedProjects.map((p) => {
                const pct = calculateProjectProgress(tasks, p.id, units);
                const uc = countByStatus(units.filter((u) => u.projectId === p.id));
                return (
                  <Link key={p.id} href={`/projects/${p.id}`} className={styles.projectRow}>
                    <div className={styles.projectTop}>
                      <div>
                        <strong>{p.name}</strong>
                        <span>{p.type}</span>
                      </div>
                      <Badge tone={p.status === 'active' ? 'blue' : 'neutral'}>
                        {statusLabel(p.status)}
                      </Badge>
                    </div>
                    <ProgressBar value={pct} />
                    <div className={styles.projectMeta}>
                      <span>{uc.total} units</span>
                      {can('view_financials') && <span>{formatPKR(p.totalBudget)} budget</span>}
                    </div>
                  </Link>
                );
              })}
            </div>
          </Card>
        )}

        {can('upload_media') && (
          <Card title="Latest photos">
            <div className={styles.mediaGrid}>
              {recentMedia.map((m) => (
                <div key={m.id} className={styles.mediaCard}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={m.dataUrl} alt={m.fileName} />
                  <div>
                    <Badge tone="blue">{m.kind}</Badge>
                    <div className={styles.mediaMeta}>{m.workCategory}</div>
                  </div>
                </div>
              ))}
              {recentMedia.length === 0 && <p className={styles.muted}>No pictures uploaded</p>}
            </div>
          </Card>
        )}

        <Card title="Alerts">
          <ul className={styles.feed}>
            {recentNotifs.map((n) => (
              <li key={n.id}>
                <div className={styles.feedTitle}>
                  {!n.read && <span className={styles.unreadDot} />}
                  {n.title}
                </div>
                <div className={styles.feedMeta}>{formatDateTime(n.createdAt)}</div>
                <p>{n.message}</p>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card title={isManager ? 'Unit progress' : 'Unit status overview'}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: 'left', color: 'var(--text-tertiary)' }}>
                <th style={{ padding: '8px 6px' }}>Unit</th>
                <th style={{ padding: '8px 6px' }}>Progress</th>
                {can('view_financials') && <th style={{ padding: '8px 6px' }}>Client payment</th>}
                {can('view_financials') && <th style={{ padding: '8px 6px' }}>Pending</th>}
                {can('view_financials') && <th style={{ padding: '8px 6px' }}>Expense</th>}
                <th style={{ padding: '8px 6px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {scopedUnits.slice(0, 40).map((u) => {
                const unitExp =
                  expenses.filter((e) => e.unitId === u.id).reduce((s, e) => s + e.amount, 0) ||
                  u.expenses;
                const pending = u.sale?.remainingAmount ?? u.booking?.remainingAmount ?? 0;
                return (
                  <tr key={u.id} style={{ borderTop: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '8px 6px' }}>
                      <Link href={`/units/${u.id}`} style={{ fontWeight: 550 }}>
                        {u.number}
                      </Link>
                    </td>
                    <td style={{ padding: '8px 6px' }}>{u.constructionProgress}%</td>
                    {can('view_financials') && (
                      <td style={{ padding: '8px 6px' }}>{clientPayLabel(u)}</td>
                    )}
                    {can('view_financials') && (
                      <td style={{ padding: '8px 6px' }}>{formatPKR(pending)}</td>
                    )}
                    {can('view_financials') && (
                      <td style={{ padding: '8px 6px' }}>{formatPKR(unitExp)}</td>
                    )}
                    <td style={{ padding: '8px 6px' }}>
                      <Badge tone={unitTone(u.status)}>{statusLabel(u.status)}</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {isManager && (
        <div style={{ marginTop: 16 }}>
          <Link href="/manager" style={{ fontSize: 13, color: 'var(--accent-blue)' }}>
            Open daily site log →
          </Link>
        </div>
      )}
    </div>
  );
}
