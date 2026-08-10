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
} from '@/lib/calculations';
import { Badge, Card, PageHeader, ProgressBar, Stat } from '@/components/ui';
import { unitTone } from '@/lib/helpers';
import styles from './dashboard.module.css';

export default function DashboardPage() {
  const { user, isAdmin, isManager } = usePermission();
  const projects = useAppStore((s) => s.projects);
  const units = useAppStore((s) => s.units);
  const tasks = useAppStore((s) => s.tasks);
  const expenses = useAppStore((s) => s.expenses);
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
    (s, u) =>
      s + (u.rental?.paymentHistory.reduce((a, p) => a + p.paidAmount, 0) ?? 0),
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
  const totalProfit = scopedUnits.reduce((s, u) => s + (u.sale?.profit ?? 0), 0);
  const outstanding = scopedUnits.reduce((s, u) => {
    return (
      s +
      (u.sale?.remainingAmount ?? 0) +
      (u.booking?.remainingAmount ?? 0)
    );
  }, 0);

  const overallProgress =
    scopedProjects.length === 0
      ? 0
      : Math.round(
          (scopedProjects.reduce(
            (s, p) => s + calculateProjectProgress(tasks, p.id, units),
            0,
          ) /
            scopedProjects.length) *
            10,
        ) / 10;

  const greyAvg =
    scopedProjects.length === 0
      ? 0
      : Math.round(
          (scopedProjects.reduce((s, p) => s + p.greyStructure.progress, 0) /
            scopedProjects.length) *
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

  const recentUpdates = updates
    .filter((u) => scopedIds.has(u.projectId))
    .slice(0, 5);
  const recentMedia = media.filter((m) => scopedIds.has(m.projectId)).slice(0, 6);
  const recentNotifs = notifications.slice(0, 5);

  const focusProject = selectedProjectId
    ? projects.find((p) => p.id === selectedProjectId)
    : scopedProjects[0];
  const focusProgress = focusProject
    ? calculateProjectProgress(tasks, focusProject.id, units)
    : 0;
  const focusTasks = focusProject
    ? tasks
        .filter((t) => t.projectId === focusProject.id && !t.unitId)
        .sort((a, b) => a.order - b.order)
    : [];
  const completedStages = focusTasks.filter((t) => t.progress >= 100);
  const remainingStages = focusTasks.filter((t) => t.progress < 100);

  return (
    <div className="animate-fade-in">
      <PageHeader
        title={isAdmin ? 'Main Admin Dashboard' : 'Dashboard'}
        subtitle="Construction · Inventory · Financials · Monitoring"
      />

      {focusProject && (
        <Card className={styles.hero} title={`Overall Project Progress — ${focusProject.name}`}>
          <div className={styles.heroGrid}>
            <div>
              <div className={styles.heroPct}>{focusProgress}%</div>
              <ProgressBar value={focusProgress} label="Weighted completion" />
              <p className={styles.heroHint}>
                Auto-calculated from construction stage weights
              </p>
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

      <div className={styles.sectionLabel}>Projects</div>
      <div className={styles.statGrid}>
        <Stat label="Total Projects" value={scopedProjects.length} />
        <Stat
          label="Active"
          value={scopedProjects.filter((p) => p.status === 'active').length}
          tone="blue"
        />
        <Stat
          label="Completed"
          value={scopedProjects.filter((p) => p.status === 'completed').length}
          tone="green"
        />
        <Stat label="Overall Progress" value={`${overallProgress}%`} tone="orange" />
      </div>

      <div className={styles.sectionLabel}>Properties</div>
      <div className={styles.statGrid}>
        <Stat label="Total Units" value={counts.total} />
        <Stat label="Sold" value={counts.sold} tone="green" />
        <Stat label="Rented" value={counts.rented} tone="blue" />
        <Stat label="Available" value={counts.available} />
        <Stat label="Reserved / Booked" value={counts.reserved + counts.booked} tone="orange" />
        <Stat label="Under Construction" value={counts.under_construction} />
      </div>

      <div className={styles.sectionLabel}>Financials</div>
      <div className={styles.statGrid}>
        <Stat label="Total Sales Received" value={formatPKR(totalSales)} tone="green" />
        <Stat label="Total Rent Received" value={formatPKR(totalRent)} tone="blue" />
        <Stat label="Rent Pending" value={formatPKR(rentPending)} tone="red" />
        <Stat label="Total Expenses" value={formatPKR(totalExpenseAmt)} tone="orange" />
        <Stat label="Total Profit" value={formatPKR(totalProfit)} tone="green" />
        <Stat label="Outstanding Payments" value={formatPKR(outstanding)} />
      </div>

      <div className={styles.sectionLabel}>Construction</div>
      <div className={styles.statGrid}>
        <Stat label="Overall Completion" value={`${overallProgress}%`} />
        <Stat label="Grey Structure" value={`${greyAvg}%`} tone="blue" />
        <Stat label="Finishing" value={`${finishingPct}%`} tone="orange" />
        <Stat label="Remaining Work" value={`${Math.max(0, Math.round(100 - overallProgress))}%`} />
      </div>

      <div className={styles.twoCol}>
        <Card title="Projects Overview">
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
                    <span>{formatPKR(p.totalBudget)} budget</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </Card>

        <Card title="Recent Updates">
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
      </div>

      <div className={styles.twoCol}>
        <Card title="Latest Pictures">
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

      <Card title="Unit Status Snapshot">
        <div className={styles.unitChips}>
          {scopedUnits.slice(0, 24).map((u) => (
            <Link key={u.id} href={`/units/${u.id}`}>
              <Badge tone={unitTone(u.status)}>
                {u.number} · {statusLabel(u.status)} · {u.constructionProgress}%
              </Badge>
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}
