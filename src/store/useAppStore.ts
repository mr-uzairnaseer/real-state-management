'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { v4 as uuid } from 'uuid';
import type {
  AppState,
  AuditEntry,
  BookingRecord,
  ConstructionTask,
  Expense,
  ExpenseCategory,
  GreyStructure,
  ManagerReport,
  MediaItem,
  Notification,
  Plot,
  ProgressUpdate,
  Project,
  RentalRecord,
  SaleRecord,
  Unit,
  UnitStatus,
  User,
  UserRole,
  ConstructionStageTemplate,
  DocumentFile,
} from '@/lib/types';
import { createSeedData, DEFAULT_STAGES } from '@/lib/seed';
import {
  calculateUnitProgress,
  remainingAmount,
  profit,
} from '@/lib/calculations';
import { createSyncedStorage } from '@/lib/storage';
import { buildPaymentAlerts } from '@/lib/alerts';
import {
  idbClear,
  idbDel,
  idbSet,
  mediaKey,
  receiptKey,
  docKey,
} from '@/lib/idb';
import { loadAllBlobs } from '@/lib/blobs';

type Store = AppState & {
  hydrate: () => void;
  restoreBlobs: () => Promise<void>;
  runPaymentAlerts: () => void;
  login: (email: string, password: string) => string | null;
  logout: () => void;
  currentUser: () => User | null;
  setSelectedProject: (id: string | null) => void;
  resetDemoData: () => void;

  // Projects
  createProject: (data: Partial<Project> & { name: string }) => string;
  updateProject: (id: string, data: Partial<Project>) => void;
  deleteProject: (id: string) => void;

  // Units
  createUnit: (data: Omit<Unit, 'id' | 'createdAt' | 'updatedAt' | 'documents' | 'expenses' | 'constructionProgress'> & { constructionProgress?: number }) => string;
  updateUnit: (id: string, data: Partial<Unit>) => void;
  deleteUnit: (id: string) => void;
  setUnitStatus: (id: string, status: UnitStatus) => void;

  // Sales / Rentals / Bookings
  saveSale: (unitId: string, sale: SaleRecord) => void;
  saveRental: (unitId: string, rental: RentalRecord) => void;
  saveBooking: (unitId: string, booking: BookingRecord) => void;
  recordRentPayment: (unitId: string, paymentId: string, paidAmount: number, paidDate?: string) => void;

  // Construction
  upsertTask: (task: Partial<ConstructionTask> & { projectId: string; name: string }) => string;
  updateTaskProgress: (taskId: string, progress: number, comments?: string) => void;
  deleteTask: (id: string) => void;
  setStageTemplates: (projectId: string, stages: ConstructionStageTemplate[]) => void;
  recalculateProgress: (projectId?: string) => void;

  // Media & updates
  addMedia: (item: Omit<MediaItem, 'id' | 'createdAt'>) => string;
  removeMedia: (id: string) => void;
  addProgressUpdate: (update: Omit<ProgressUpdate, 'id' | 'createdAt'>) => string;

  // Expenses
  addExpense: (e: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateExpense: (id: string, data: Partial<Expense>) => void;
  deleteExpense: (id: string) => void;

  // Plots
  createPlot: (p: Omit<Plot, 'id' | 'createdAt' | 'documents'>) => string;
  updatePlot: (id: string, data: Partial<Plot>) => void;
  deletePlot: (id: string) => void;

  // Grey structure
  updateGreyStructure: (projectId: string, data: Partial<GreyStructure>) => void;

  // Users
  createUser: (u: Omit<User, 'id' | 'createdAt'>) => string;
  updateUser: (id: string, data: Partial<User>) => void;
  deleteUser: (id: string) => void;

  // Notifications & audit
  addNotification: (n: Omit<Notification, 'id' | 'createdAt' | 'read'>) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  logAudit: (entry: Omit<AuditEntry, 'id' | 'createdAt'>) => void;

  // Manager reports
  addManagerReport: (r: Omit<ManagerReport, 'id' | 'createdAt'>) => string;

  // Documents helper
  addUnitDocument: (unitId: string, doc: Omit<DocumentFile, 'id' | 'uploadedAt'>) => void;
};

function audit(
  get: () => Store,
  set: (fn: (s: Store) => Partial<Store> | Store) => void,
  entry: Omit<AuditEntry, 'id' | 'createdAt'>,
) {
  const row: AuditEntry = { ...entry, id: uuid(), createdAt: new Date().toISOString() };
  set((s) => ({ auditLog: [row, ...s.auditLog].slice(0, 500) }));
}

const seed = createSeedData();

export const useAppStore = create<Store>()(
  persist(
    (set, get) => ({
      ...seed,

      hydrate: () => set({ hydrated: true }),

      restoreBlobs: async () => {
        const state = get();
        const restored = await loadAllBlobs({
          media: state.media,
          expenses: state.expenses,
          units: state.units,
        });
        set({
          media: restored.media as typeof state.media,
          expenses: restored.expenses as typeof state.expenses,
          units: restored.units as typeof state.units,
        });
      },

      runPaymentAlerts: () => {
        const { units, notifications } = get();
        const fresh = buildPaymentAlerts(units, notifications);
        if (!fresh.length) return;
        // Also flip overdue status on rent payments past due
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        set((s) => ({
          notifications: [...fresh, ...s.notifications].slice(0, 200),
          units: s.units.map((u) => {
            if (!u.rental) return u;
            return {
              ...u,
              rental: {
                ...u.rental,
                paymentHistory: u.rental.paymentHistory.map((p) => {
                  if (p.status === 'paid') return p;
                  const due = new Date(p.dueDate);
                  due.setHours(0, 0, 0, 0);
                  if (due.getTime() < today.getTime() && p.status !== 'overdue') {
                    return { ...p, status: 'overdue' as const };
                  }
                  return p;
                }),
              },
            };
          }),
        }));
      },

      login: (email, password) => {
        const user = get().users.find(
          (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password,
        );
        if (!user) return null;
        set({ currentUserId: user.id });
        return user.id;
      },

      logout: () => set({ currentUserId: null }),

      currentUser: () => {
        const id = get().currentUserId;
        return get().users.find((u) => u.id === id) ?? null;
      },

      setSelectedProject: (id) => set({ selectedProjectId: id }),

      resetDemoData: () => {
        void idbClear();
        const fresh = createSeedData();
        set({ ...fresh, hydrated: true, currentUserId: get().currentUserId });
        // Persist seed media into IndexedDB
        void (async () => {
          for (const m of fresh.media) {
            if (m.dataUrl) await idbSet(mediaKey(m.id), m.dataUrl);
          }
        })();
      },

      createProject: (data) => {
        const id = uuid();
        const stages: ConstructionStageTemplate[] = (data.stageTemplates?.length
          ? data.stageTemplates
          : DEFAULT_STAGES.map((s) => ({ ...s, id: uuid() })));
        const project: Project = {
          id,
          name: data.name,
          type: data.type ?? 'Real Estate',
          description: data.description ?? '',
          location: data.location ?? '',
          status: data.status ?? 'planning',
          totalBudget: data.totalBudget ?? 0,
          startDate: data.startDate ?? new Date().toISOString(),
          expectedEndDate: data.expectedEndDate,
          managerIds: data.managerIds ?? [],
          stageTemplates: stages,
          greyStructure: data.greyStructure ?? {
            projectId: id,
            progress: 0,
            budget: 0,
            expenses: 0,
            completedWork: '',
            remainingWork: '',
            constructionStatus: 'Not Started',
            notes: '',
          },
          timelineNotes: data.timelineNotes ?? '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        const user = get().currentUser();
        set((s) => ({
          projects: [...s.projects, project],
          selectedProjectId: id,
          tasks: [
            ...s.tasks,
            ...stages.map((st) => ({
              id: uuid(),
              projectId: id,
              name: st.name,
              weight: st.weight,
              progress: 0,
              status: 'not_started' as const,
              comments: '',
              order: st.order,
            })),
          ],
        }));
        if (user) {
          audit(get, set, {
            userId: user.id,
            userName: user.name,
            action: 'create',
            entityType: 'project',
            entityId: id,
            newValue: project.name,
          });
        }
        get().addNotification({
          type: 'general',
          title: 'Project Created',
          message: `Project "${project.name}" was created`,
          projectId: id,
        });
        return id;
      },

      updateProject: (id, data) => {
        const prev = get().projects.find((p) => p.id === id);
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === id ? { ...p, ...data, updatedAt: new Date().toISOString() } : p,
          ),
        }));
        const user = get().currentUser();
        if (user && prev) {
          audit(get, set, {
            userId: user.id,
            userName: user.name,
            action: 'update',
            entityType: 'project',
            entityId: id,
            previousValue: JSON.stringify({ name: prev.name, status: prev.status }),
            newValue: JSON.stringify(data),
          });
        }
      },

      deleteProject: (id) => {
        set((s) => ({
          projects: s.projects.filter((p) => p.id !== id),
          units: s.units.filter((u) => u.projectId !== id),
          tasks: s.tasks.filter((t) => t.projectId !== id),
          expenses: s.expenses.filter((e) => e.projectId !== id),
          plots: s.plots.filter((p) => p.projectId !== id),
          media: s.media.filter((m) => m.projectId !== id),
          updates: s.updates.filter((u) => u.projectId !== id),
          selectedProjectId:
            s.selectedProjectId === id
              ? s.projects.find((p) => p.id !== id)?.id ?? null
              : s.selectedProjectId,
        }));
      },

      createUnit: (data) => {
        const id = uuid();
        const unit: Unit = {
          ...data,
          id,
          expenses: 0,
          constructionProgress: data.constructionProgress ?? 0,
          documents: [],
          notes: data.notes ?? '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        const project = get().projects.find((p) => p.id === data.projectId);
        const tasks: ConstructionTask[] = (project?.stageTemplates ?? []).map((st) => ({
          id: uuid(),
          projectId: data.projectId,
          unitId: id,
          name: st.name,
          weight: st.weight,
          progress: 0,
          status: 'not_started',
          comments: '',
          order: st.order,
        }));
        set((s) => ({ units: [...s.units, unit], tasks: [...s.tasks, ...tasks] }));
        return id;
      },

      updateUnit: (id, data) => {
        const prev = get().units.find((u) => u.id === id);
        set((s) => ({
          units: s.units.map((u) =>
            u.id === id ? { ...u, ...data, updatedAt: new Date().toISOString() } : u,
          ),
        }));
        const user = get().currentUser();
        if (user && prev) {
          const fields = Object.keys(data);
          for (const field of fields) {
            if (field === 'updatedAt' || field === 'sale' || field === 'rental' || field === 'booking' || field === 'documents') {
              continue;
            }
            const previousValue = String(
              (prev as unknown as Record<string, unknown>)[field] ?? '',
            );
            const newValue = String(
              (data as unknown as Record<string, unknown>)[field] ?? '',
            );
            if (previousValue === newValue) continue;
            audit(get, set, {
              userId: user.id,
              userName: user.name,
              action: 'update',
              entityType: 'unit',
              entityId: id,
              field,
              previousValue,
              newValue,
            });
          }
          if (data.sale || data.rental || data.booking) {
            audit(get, set, {
              userId: user.id,
              userName: user.name,
              action: 'update',
              entityType: 'unit',
              entityId: id,
              field: data.sale ? 'sale' : data.rental ? 'rental' : 'booking',
              previousValue: '(previous record)',
              newValue: '(updated record)',
            });
          }
        }
      },

      deleteUnit: (id) => {
        set((s) => ({
          units: s.units.filter((u) => u.id !== id),
          tasks: s.tasks.filter((t) => t.unitId !== id),
        }));
      },

      setUnitStatus: (id, status) => {
        const prev = get().units.find((u) => u.id === id);
        get().updateUnit(id, { status });
        const user = get().currentUser();
        if (user && prev) {
          audit(get, set, {
            userId: user.id,
            userName: user.name,
            action: 'update',
            entityType: 'unit',
            entityId: id,
            field: 'status',
            previousValue: prev.status,
            newValue: status,
          });
        }
      },

      saveSale: (unitId, sale) => {
        const remaining = remainingAmount(sale.salePrice, sale.amountReceived);
        const computedProfit = profit(sale.salePrice, sale.totalCost, sale.additionalExpenses);
        const paymentStatus =
          remaining <= 0 ? 'paid' : sale.amountReceived > 0 ? 'partial' : 'pending';
        const status: UnitStatus =
          remaining <= 0 && paymentStatus === 'paid' ? 'sold' : 'sold';
        get().updateUnit(unitId, {
          sale: { ...sale, remainingAmount: remaining, profit: computedProfit, paymentStatus },
          status,
          salePrice: sale.salePrice,
        });
        get().addNotification({
          type: 'new_sale',
          title: 'Sale Updated',
          message: `Sale recorded for unit — ${sale.buyer.name}`,
          unitId,
          projectId: get().units.find((u) => u.id === unitId)?.projectId,
        });
      },

      saveRental: (unitId, rental) => {
        get().updateUnit(unitId, { rental, status: 'rented', rentalPrice: rental.monthlyRent });
      },

      saveBooking: (unitId, booking) => {
        const remaining = remainingAmount(booking.totalPrice, booking.advanceAmount);
        get().updateUnit(unitId, {
          booking: { ...booking, remainingAmount: remaining, status: 'booked' },
          status: 'booked',
        });
        get().addNotification({
          type: 'new_booking',
          title: 'New Booking',
          message: `${booking.customerName} booked a unit — advance ${booking.advanceAmount}`,
          unitId,
          projectId: get().units.find((u) => u.id === unitId)?.projectId,
        });
      },

      recordRentPayment: (unitId, paymentId, paidAmount, paidDate) => {
        const unit = get().units.find((u) => u.id === unitId);
        if (!unit?.rental) return;
        const paymentHistory = unit.rental.paymentHistory.map((p) => {
          if (p.id !== paymentId) return p;
          const status =
            paidAmount >= p.amount ? 'paid' : paidAmount > 0 ? 'partial' : p.status;
          return {
            ...p,
            paidAmount,
            paidDate: paidDate ?? new Date().toISOString(),
            status: status as typeof p.status,
          };
        });
        get().updateUnit(unitId, { rental: { ...unit.rental, paymentHistory } });
      },

      upsertTask: (task) => {
        if (task.id) {
          set((s) => ({
            tasks: s.tasks.map((t) => (t.id === task.id ? { ...t, ...task } : t)),
          }));
          get().recalculateProgress(task.projectId);
          return task.id;
        }
        const id = uuid();
        const row: ConstructionTask = {
          id,
          projectId: task.projectId,
          unitId: task.unitId,
          name: task.name,
          weight: task.weight ?? 0,
          progress: task.progress ?? 0,
          startDate: task.startDate,
          expectedCompletionDate: task.expectedCompletionDate,
          status: task.status ?? 'not_started',
          comments: task.comments ?? '',
          order: task.order ?? get().tasks.filter((t) => t.projectId === task.projectId).length + 1,
        };
        set((s) => ({ tasks: [...s.tasks, row] }));
        get().recalculateProgress(task.projectId);
        return id;
      },

      updateTaskProgress: (taskId, progress, comments) => {
        const task = get().tasks.find((t) => t.id === taskId);
        if (!task) return;
        const clamped = Math.min(100, Math.max(0, progress));
        const status =
          clamped >= 100 ? 'completed' : clamped > 0 ? 'in_progress' : 'not_started';
        const user = get().currentUser();
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  progress: clamped,
                  status,
                  comments: comments ?? t.comments,
                }
              : t,
          ),
        }));
        if (user) {
          audit(get, set, {
            userId: user.id,
            userName: user.name,
            action: 'update',
            entityType: 'task',
            entityId: taskId,
            field: 'progress',
            previousValue: String(task.progress),
            newValue: String(clamped),
          });
        }
        get().recalculateProgress(task.projectId);
        get().addNotification({
          type: 'construction_update',
          title: 'Construction Update',
          message: `${task.name} progress set to ${clamped}%`,
          projectId: task.projectId,
          unitId: task.unitId,
        });
      },

      deleteTask: (id) => {
        const task = get().tasks.find((t) => t.id === id);
        set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }));
        if (task) get().recalculateProgress(task.projectId);
      },

      setStageTemplates: (projectId, stages) => {
        get().updateProject(projectId, { stageTemplates: stages });
      },

      recalculateProgress: (projectId) => {
        const { tasks, units, projects } = get();
        const targetProjects = projectId
          ? projects.filter((p) => p.id === projectId)
          : projects;

        const updatedUnits = units.map((u) => {
          if (projectId && u.projectId !== projectId) return u;
          const unitTasks = tasks.filter((t) => t.unitId === u.id);
          if (!unitTasks.length) return u;
          return {
            ...u,
            constructionProgress: calculateUnitProgress(tasks, u.id),
            updatedAt: new Date().toISOString(),
          };
        });

        set({
          units: updatedUnits,
          projects: projects.map((p) => {
            if (projectId && p.id !== projectId) return p;
            if (!targetProjects.find((tp) => tp.id === p.id)) return p;
            return { ...p, updatedAt: new Date().toISOString() };
          }),
        });

        // Sync grey structure progress from Grey Structure task if present
        for (const p of targetProjects) {
          const gsTask = get().tasks.find(
            (t) =>
              t.projectId === p.id &&
              !t.unitId &&
              t.name.toLowerCase().includes('grey'),
          );
          if (gsTask) {
            get().updateGreyStructure(p.id, { progress: gsTask.progress });
          }
        }
      },

      addMedia: (item) => {
        const id = uuid();
        const row = { ...item, id, createdAt: new Date().toISOString() };
        set((s) => ({
          media: [row, ...s.media],
        }));
        if (item.dataUrl) void idbSet(mediaKey(id), item.dataUrl);
        const user = get().currentUser();
        if (user) {
          audit(get, set, {
            userId: user.id,
            userName: user.name,
            action: 'create',
            entityType: 'media',
            entityId: id,
            field: 'workCategory',
            newValue: item.workCategory,
          });
        }
        return id;
      },

      removeMedia: (id) => {
        set((s) => ({ media: s.media.filter((m) => m.id !== id) }));
        void idbDel(mediaKey(id));
      },

      addProgressUpdate: (update) => {
        const id = uuid();
        set((s) => ({
          updates: [
            { ...update, id, createdAt: new Date().toISOString() },
            ...s.updates,
          ],
        }));
        get().addNotification({
          type: 'manager_report',
          title: 'Manager Update',
          message: update.title,
          projectId: update.projectId,
          unitId: update.unitId,
        });
        return id;
      },

      addExpense: (e) => {
        const id = uuid();
        const row: Expense = {
          ...e,
          id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set((s) => ({ expenses: [row, ...s.expenses] }));
        if (e.receiptDataUrl) void idbSet(receiptKey(id), e.receiptDataUrl);
        get().addNotification({
          type: 'expense_added',
          title: 'Expense Added',
          message: `${e.category}: ${e.amount} — ${e.description}`,
          projectId: e.projectId,
          unitId: e.unitId,
        });
        const user = get().currentUser();
        if (user) {
          audit(get, set, {
            userId: user.id,
            userName: user.name,
            action: 'create',
            entityType: 'expense',
            entityId: id,
            newValue: `${e.category} ${e.amount}`,
          });
        }
        return id;
      },

      updateExpense: (id, data) => {
        const prev = get().expenses.find((e) => e.id === id);
        set((s) => ({
          expenses: s.expenses.map((e) =>
            e.id === id ? { ...e, ...data, updatedAt: new Date().toISOString() } : e,
          ),
        }));
        if (data.receiptDataUrl) void idbSet(receiptKey(id), data.receiptDataUrl);
        const user = get().currentUser();
        if (user && prev) {
          audit(get, set, {
            userId: user.id,
            userName: user.name,
            action: 'update',
            entityType: 'expense',
            entityId: id,
            previousValue: `${prev.category} ${prev.amount}`,
            newValue: JSON.stringify(data),
          });
        }
      },

      deleteExpense: (id) => {
        set((s) => ({ expenses: s.expenses.filter((e) => e.id !== id) }));
        void idbDel(receiptKey(id));
      },

      createPlot: (p) => {
        const id = uuid();
        set((s) => ({
          plots: [
            ...s.plots,
            { ...p, id, documents: [], createdAt: new Date().toISOString() },
          ],
        }));
        return id;
      },

      updatePlot: (id, data) => {
        set((s) => ({
          plots: s.plots.map((p) => {
            if (p.id !== id) return p;
            const next = { ...p, ...data };
            if (data.paymentReceived !== undefined || data.salePrice !== undefined) {
              next.remainingPayment = remainingAmount(
                next.salePrice,
                next.paymentReceived,
              );
              if (next.remainingPayment <= 0 && next.paymentReceived > 0) {
                next.status = 'sold_land_only';
              }
            }
            return next;
          }),
        }));
      },

      deletePlot: (id) => set((s) => ({ plots: s.plots.filter((p) => p.id !== id) })),

      updateGreyStructure: (projectId, data) => {
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === projectId
              ? {
                  ...p,
                  greyStructure: { ...p.greyStructure, ...data, projectId },
                  updatedAt: new Date().toISOString(),
                }
              : p,
          ),
        }));
      },

      createUser: (u) => {
        const id = uuid();
        set((s) => ({
          users: [...s.users, { ...u, id, createdAt: new Date().toISOString() }],
        }));
        return id;
      },

      updateUser: (id, data) => {
        set((s) => ({
          users: s.users.map((u) => (u.id === id ? { ...u, ...data } : u)),
        }));
      },

      deleteUser: (id) => {
        if (id === get().currentUserId) return;
        set((s) => ({ users: s.users.filter((u) => u.id !== id) }));
      },

      addNotification: (n) => {
        set((s) => ({
          notifications: [
            {
              ...n,
              id: uuid(),
              read: false,
              createdAt: new Date().toISOString(),
            },
            ...s.notifications,
          ].slice(0, 200),
        }));
      },

      markNotificationRead: (id) => {
        set((s) => ({
          notifications: s.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n,
          ),
        }));
      },

      markAllNotificationsRead: () => {
        set((s) => ({
          notifications: s.notifications.map((n) => ({ ...n, read: true })),
        }));
      },

      logAudit: (entry) => {
        audit(get, set, entry);
      },

      addManagerReport: (r) => {
        const id = uuid();
        set((s) => ({
          reports: [
            { ...r, id, createdAt: new Date().toISOString() },
            ...s.reports,
          ],
        }));
        get().addNotification({
          type: 'manager_report',
          title: 'Manager Report Submitted',
          message: `${r.managerName}: ${r.title}`,
          projectId: r.projectId,
        });
        return id;
      },

      addUnitDocument: (unitId, doc) => {
        const file: DocumentFile = {
          ...doc,
          id: uuid(),
          uploadedAt: new Date().toISOString(),
        };
        set((s) => ({
          units: s.units.map((u) =>
            u.id === unitId ? { ...u, documents: [...u.documents, file] } : u,
          ),
        }));
        if (doc.dataUrl) void idbSet(docKey(unitId, file.id), doc.dataUrl);
      },
    }),
    {
      name: 'rems-storage-v3',
      skipHydration: true,
      storage: createJSONStorage(() => createSyncedStorage()),
      partialize: (s) => ({
        users: s.users,
        currentUserId: s.currentUserId,
        projects: s.projects,
        units: s.units.map((u) => ({
          ...u,
          documents: u.documents.map((d) => ({ ...d, dataUrl: '' })),
        })),
        plots: s.plots,
        tasks: s.tasks,
        media: s.media.map((m) => ({ ...m, dataUrl: '' })),
        updates: s.updates,
        expenses: s.expenses.map((e) => ({
          ...e,
          receiptDataUrl: undefined,
        })),
        notifications: s.notifications,
        auditLog: s.auditLog,
        reports: s.reports,
        selectedProjectId: s.selectedProjectId,
      }),
    },
  ),
);

export function usePermission() {
  const user = useAppStore((s) => s.users.find((u) => u.id === s.currentUserId));
  const role: UserRole | null = user?.role ?? null;

  const can = (action: string) => {
    if (!role) return false;
    if (role === 'admin') return true;
    const managerAllowed = [
      'view_projects',
      'view_units',
      'update_progress',
      'upload_media',
      'add_comments',
      'add_expenses',
      'submit_reports',
      'view_construction',
      'view_gallery',
      'update_rent_if_authorized',
    ];
    const accountantAllowed = [
      'view_projects',
      'view_units',
      'view_payments',
      'view_rent',
      'view_sales',
      'add_expenses',
      'update_expenses',
      'view_reports',
      'view_financials',
    ];
    if (role === 'manager') return managerAllowed.includes(action);
    if (role === 'accountant') return accountantAllowed.includes(action);
    return false;
  };

  return { user, role, can, isAdmin: role === 'admin', isManager: role === 'manager' };
}

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Cement',
  'Steel',
  'Bricks',
  'Sand',
  'Labour',
  'Electrical',
  'Plumbing',
  'Paint',
  'Flooring',
  'Machinery',
  'Transportation',
  'Parking',
  'Decoration',
  'Grey Structure',
  'Other Expenses',
];
