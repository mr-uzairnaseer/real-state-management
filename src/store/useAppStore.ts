'use client';

import { create } from 'zustand';
import { api } from '@/lib/api-client';
import { buildPaymentAlerts } from '@/lib/alerts';
import type {
  AppState,
  BookingRecord,
  ConstructionStageTemplate,
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
  AttendanceRecord,
  ClientPayment,
  Purchase,
  DocumentFile,
} from '@/lib/types';
import { EXPENSE_CATEGORIES as CATALOG_EXPENSE_CATEGORIES } from '@/lib/catalog';
import { hasCapability, type Capability } from '@/lib/access';

type Store = AppState & {
  hydrate: () => void;
  bootstrap: () => Promise<void>;
  restoreBlobs: () => Promise<void>;
  runPaymentAlerts: () => void;
  login: (email: string, password: string) => Promise<string | null>;
  logout: () => Promise<void>;
  currentUser: () => User | null;
  setSelectedProject: (id: string | null) => void;
  resetDemoData: () => Promise<void>;
  createProject: (data: Partial<Project> & { name: string }) => Promise<string>;
  updateProject: (id: string, data: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  createUnit: (
    data: Omit<
      Unit,
      'id' | 'createdAt' | 'updatedAt' | 'documents' | 'expenses' | 'constructionProgress'
    > & { constructionProgress?: number },
  ) => Promise<string>;
  updateUnit: (id: string, data: Partial<Unit>) => Promise<void>;
  deleteUnit: (id: string) => Promise<void>;
  setUnitStatus: (id: string, status: UnitStatus) => Promise<void>;
  saveSale: (unitId: string, sale: SaleRecord) => Promise<void>;
  saveRental: (unitId: string, rental: RentalRecord) => Promise<void>;
  saveBooking: (unitId: string, booking: BookingRecord) => Promise<void>;
  recordRentPayment: (
    unitId: string,
    paymentId: string,
    paidAmount: number,
    paidDate?: string,
  ) => Promise<void>;
  upsertTask: (
    task: Partial<ConstructionTask> & { projectId: string; name: string },
  ) => Promise<string>;
  updateTaskProgress: (taskId: string, progress: number, comments?: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  setStageTemplates: (projectId: string, stages: ConstructionStageTemplate[]) => Promise<void>;
  recalculateProgress: (projectId?: string) => Promise<void>;
  addMedia: (item: Omit<MediaItem, 'id' | 'createdAt'>) => Promise<string>;
  removeMedia: (id: string) => Promise<void>;
  addProgressUpdate: (update: Omit<ProgressUpdate, 'id' | 'createdAt'>) => Promise<string>;
  addExpense: (e: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateExpense: (id: string, data: Partial<Expense>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  createPlot: (p: Omit<Plot, 'id' | 'createdAt' | 'documents'>) => Promise<string>;
  updatePlot: (id: string, data: Partial<Plot>) => Promise<void>;
  deletePlot: (id: string) => Promise<void>;
  updateGreyStructure: (projectId: string, data: Partial<GreyStructure>) => Promise<void>;
  createUser: (u: Omit<User, 'id' | 'createdAt'>) => Promise<string>;
  updateUser: (id: string, data: Partial<User>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  addNotification: (n: Omit<Notification, 'id' | 'createdAt' | 'read'>) => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  logAudit: (entry: {
    userId: string;
    userName: string;
    action: string;
    entityType: string;
    entityId: string;
    field?: string;
    previousValue?: string;
    newValue?: string;
  }) => void;
  addManagerReport: (r: Omit<ManagerReport, 'id' | 'createdAt'>) => Promise<string>;
  addUnitDocument: (
    unitId: string,
    doc: Omit<DocumentFile, 'id' | 'uploadedAt'>,
  ) => Promise<void>;
  addPurchase: (p: Omit<Purchase, 'id' | 'createdAt' | 'expenseId'>) => Promise<string>;
  deletePurchase: (id: string) => Promise<void>;
  addAttendance: (a: Omit<AttendanceRecord, 'id' | 'createdAt'>) => Promise<string>;
  deleteAttendance: (id: string) => Promise<void>;
  addClientPayment: (
    p: Omit<ClientPayment, 'id' | 'createdAt' | 'projectId'> & { projectId?: string },
  ) => Promise<void>;
};

const empty: AppState = {
  users: [],
  currentUserId: null,
  projects: [],
  units: [],
  plots: [],
  tasks: [],
  media: [],
  updates: [],
  expenses: [],
  purchases: [],
  attendance: [],
  clientPayments: [],
  notifications: [],
  auditLog: [],
  reports: [],
  selectedProjectId: null,
  hydrated: false,
};

function replaceUnit(units: Unit[], unit: Unit) {
  return units.map((u) => (u.id === unit.id ? unit : u));
}

export const useAppStore = create<Store>()((set, get) => ({
  ...empty,

  hydrate: () => set({ hydrated: true }),

  restoreBlobs: async () => {
    // Server serves media URLs — nothing to restore from IndexedDB
  },

  bootstrap: async () => {
    const data = await api.get<AppState>('/api/bootstrap');
    set({ ...data, hydrated: true });
    get().runPaymentAlerts();
  },

  runPaymentAlerts: () => {
    const { units, notifications } = get();
    const fresh = buildPaymentAlerts(units, notifications);
    if (!fresh.length) return;
    set((s) => ({
      notifications: [...fresh, ...s.notifications].slice(0, 200),
    }));
    // Persist new alerts asynchronously
    for (const n of fresh) {
      void api.post('/api/notifications', n).catch(() => undefined);
    }
  },

  login: async (email, password) => {
    try {
      const res = await api.post<{ user: User }>('/api/auth/login', { email, password });
      set({ currentUserId: res.user.id });
      await get().bootstrap();
      return res.user.id;
    } catch {
      return null;
    }
  },

  logout: async () => {
    try {
      await api.post('/api/auth/logout');
    } catch {
      // ignore
    }
    set({ ...empty, hydrated: true });
  },

  currentUser: () => {
    const id = get().currentUserId;
    return get().users.find((u) => u.id === id) ?? null;
  },

  setSelectedProject: (id) => {
    set({ selectedProjectId: id });
    void api.put('/api/ui/selected-project', { selectedProjectId: id }).catch(() => undefined);
  },

  resetDemoData: async () => {
    await api.post('/api/demo/reset');
    await get().bootstrap();
  },

  createProject: async (data) => {
    const res = await api.post<{ project: Project }>('/api/projects', data);
    await get().bootstrap();
    set({ selectedProjectId: res.project.id });
    return res.project.id;
  },

  updateProject: async (id, data) => {
    const res = await api.patch<{ project: Project }>(`/api/projects/${id}`, data);
    set((s) => ({
      projects: s.projects.map((p) => (p.id === id ? res.project : p)),
    }));
  },

  deleteProject: async (id) => {
    await api.delete(`/api/projects/${id}`);
    await get().bootstrap();
  },

  createUnit: async (data) => {
    const res = await api.post<{ unit: Unit }>('/api/units', data);
    await get().bootstrap();
    return res.unit.id;
  },

  updateUnit: async (id, data) => {
    const res = await api.patch<{ unit: Unit }>(`/api/units/${id}`, data);
    set((s) => ({ units: replaceUnit(s.units, res.unit) }));
  },

  deleteUnit: async (id) => {
    await api.delete(`/api/units/${id}`);
    set((s) => ({
      units: s.units.filter((u) => u.id !== id),
      tasks: s.tasks.filter((t) => t.unitId !== id),
    }));
  },

  setUnitStatus: async (id, status) => {
    await get().updateUnit(id, { status });
  },

  saveSale: async (unitId, sale) => {
    const res = await api.patch<{ unit: Unit }>(`/api/units/${unitId}`, {
      _action: 'saveSale',
      sale,
    });
    set((s) => ({ units: replaceUnit(s.units, res.unit) }));
    await get().bootstrap();
  },

  saveRental: async (unitId, rental) => {
    const res = await api.patch<{ unit: Unit }>(`/api/units/${unitId}`, {
      _action: 'saveRental',
      rental,
    });
    set((s) => ({ units: replaceUnit(s.units, res.unit) }));
  },

  saveBooking: async (unitId, booking) => {
    const res = await api.patch<{ unit: Unit }>(`/api/units/${unitId}`, {
      _action: 'saveBooking',
      booking,
    });
    set((s) => ({ units: replaceUnit(s.units, res.unit) }));
    await get().bootstrap();
  },

  recordRentPayment: async (unitId, paymentId, paidAmount, paidDate) => {
    const res = await api.patch<{ unit: Unit }>(`/api/units/${unitId}`, {
      _action: 'recordRentPayment',
      paymentId,
      paidAmount,
      paidDate,
    });
    set((s) => ({ units: replaceUnit(s.units, res.unit) }));
  },

  upsertTask: async (task) => {
    if (task.id) {
      const res = await api.patch<{ task: ConstructionTask }>(`/api/tasks/${task.id}`, task);
      set((s) => ({
        tasks: s.tasks.map((t) => (t.id === task.id ? res.task : t)),
      }));
      await get().bootstrap();
      return res.task.id;
    }
    const res = await api.post<{ task: ConstructionTask }>('/api/tasks', task);
    set((s) => ({ tasks: [...s.tasks, res.task] }));
    return res.task.id;
  },

  updateTaskProgress: async (taskId, progress, comments) => {
    const res = await api.patch<{ task: ConstructionTask }>(`/api/tasks/${taskId}`, {
      progress,
      comments,
    });
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === taskId ? res.task : t)),
    }));
    await get().bootstrap();
  },

  deleteTask: async (id) => {
    await api.delete(`/api/tasks/${id}`);
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }));
  },

  setStageTemplates: async (projectId, stages) => {
    await get().updateProject(projectId, { stageTemplates: stages });
  },

  recalculateProgress: async () => {
    await get().bootstrap();
  },

  addMedia: async (item) => {
    const res = await api.post<{ media: MediaItem }>('/api/media', item);
    set((s) => ({ media: [res.media, ...s.media] }));
    return res.media.id;
  },

  removeMedia: async (id) => {
    await api.delete(`/api/media/${id}`);
    set((s) => ({ media: s.media.filter((m) => m.id !== id) }));
  },

  addProgressUpdate: async (update) => {
    const res = await api.post<{ update: ProgressUpdate }>('/api/progress-updates', update);
    set((s) => ({ updates: [res.update, ...s.updates] }));
    await get().bootstrap();
    return res.update.id;
  },

  addExpense: async (e) => {
    const res = await api.post<{ expense: Expense }>('/api/expenses', e);
    set((s) => ({ expenses: [res.expense, ...s.expenses] }));
    await get().bootstrap();
    return res.expense.id;
  },

  updateExpense: async (id, data) => {
    const res = await api.patch<{ expense: Expense }>(`/api/expenses/${id}`, data);
    set((s) => ({
      expenses: s.expenses.map((e) => (e.id === id ? res.expense : e)),
    }));
  },

  deleteExpense: async (id) => {
    await api.delete(`/api/expenses/${id}`);
    set((s) => ({ expenses: s.expenses.filter((e) => e.id !== id) }));
  },

  createPlot: async (p) => {
    const res = await api.post<{ plot: Plot }>('/api/plots', p);
    set((s) => ({ plots: [...s.plots, res.plot] }));
    return res.plot.id;
  },

  updatePlot: async (id, data) => {
    const res = await api.patch<{ plot: Plot }>(`/api/plots/${id}`, data);
    set((s) => ({
      plots: s.plots.map((p) => (p.id === id ? res.plot : p)),
    }));
  },

  deletePlot: async (id) => {
    await api.delete(`/api/plots/${id}`);
    set((s) => ({ plots: s.plots.filter((p) => p.id !== id) }));
  },

  updateGreyStructure: async (projectId, data) => {
    const res = await api.patch<{ project: Project }>(
      `/api/projects/${projectId}/grey-structure`,
      data,
    );
    set((s) => ({
      projects: s.projects.map((p) => (p.id === projectId ? res.project : p)),
    }));
  },

  createUser: async (u) => {
    const res = await api.post<{ user: User }>('/api/users', u);
    set((s) => ({ users: [...s.users, res.user] }));
    return res.user.id;
  },

  updateUser: async (id, data) => {
    const res = await api.patch<{ user: User }>(`/api/users/${id}`, data);
    set((s) => ({
      users: s.users.map((u) => (u.id === id ? res.user : u)),
    }));
  },

  deleteUser: async (id) => {
    await api.delete(`/api/users/${id}`);
    set((s) => ({ users: s.users.filter((u) => u.id !== id) }));
  },

  addNotification: async (n) => {
    const res = await api.post<{ notification: Notification }>('/api/notifications', n);
    set((s) => ({
      notifications: [res.notification, ...s.notifications].slice(0, 200),
    }));
  },

  markNotificationRead: async (id) => {
    await api.patch('/api/notifications', { id });
    set((s) => ({
      notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
    }));
  },

  markAllNotificationsRead: async () => {
    await api.patch('/api/notifications', { _action: 'readAll' });
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, read: true })),
    }));
  },

  logAudit: () => {
    // Server writes audits on mutations
  },

  addManagerReport: async (r) => {
    const res = await api.post<{ report: ManagerReport }>('/api/reports', r);
    set((s) => ({ reports: [res.report, ...s.reports] }));
    await get().bootstrap();
    return res.report.id;
  },

  addUnitDocument: async (unitId, doc) => {
    const document = {
      ...doc,
      id: crypto.randomUUID(),
      uploadedAt: new Date().toISOString(),
    };
    const res = await api.patch<{ unit: Unit }>(`/api/units/${unitId}`, {
      _action: 'addDocument',
      document,
    });
    set((s) => ({ units: replaceUnit(s.units, res.unit) }));
  },

  addPurchase: async (p) => {
    const res = await api.post<{ purchase: Purchase }>('/api/purchases', p);
    await get().bootstrap();
    return res.purchase.id;
  },

  deletePurchase: async (id) => {
    await api.delete(`/api/purchases/${id}`);
    set((s) => ({ purchases: s.purchases.filter((x) => x.id !== id) }));
    await get().bootstrap();
  },

  addAttendance: async (a) => {
    const res = await api.post<{ attendance: AttendanceRecord }>('/api/attendance', a);
    set((s) => ({ attendance: [res.attendance, ...s.attendance] }));
    return res.attendance.id;
  },

  deleteAttendance: async (id) => {
    await api.delete(`/api/attendance/${id}`);
    set((s) => ({ attendance: s.attendance.filter((x) => x.id !== id) }));
  },

  addClientPayment: async (p) => {
    const res = await api.post<{ payment: ClientPayment; unit: Unit }>('/api/payments', p);
    set((s) => ({
      clientPayments: [res.payment, ...s.clientPayments],
      units: res.unit ? replaceUnit(s.units, res.unit) : s.units,
    }));
  },
}));

export function usePermission() {
  const user = useAppStore((s) => s.users.find((u) => u.id === s.currentUserId));
  const role: UserRole | null = user?.role ?? null;
  const can = (action: Capability | string) => hasCapability(role, action as Capability);
  return {
    user,
    role,
    can,
    isAdmin: role === 'admin',
    isManager: role === 'manager',
    isAccountant: role === 'accountant',
  };
}

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [...CATALOG_EXPENSE_CATEGORIES];
