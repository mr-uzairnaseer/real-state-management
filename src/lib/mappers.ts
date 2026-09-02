import { prisma } from './db';
import { iso } from './api-helpers';
import { ensureMaterialCatalog } from './ensure-materials';
import type {
  ConstructionStageTemplate,
  GreyStructure,
  SaleRecord,
  RentalRecord,
  BookingRecord,
  DocumentFile,
  MaterialCatalogItem,
  MaterialConsumption,
  MaterialDelivery,
  MaterialEstimate,
  MaterialEstimateLine,
  MaterialFormula,
  MaterialMeasurements,
  MaterialRequest,
} from './types';

export function mapUser(u: {
  id: string;
  name: string;
  email: string;
  role: string;
  assignedProjectIds: string[];
  avatarColor: string;
  createdAt: Date;
}) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    password: '',
    role: u.role,
    assignedProjectIds: u.assignedProjectIds,
    avatarColor: u.avatarColor,
    createdAt: u.createdAt.toISOString(),
  };
}

export function mapProject(p: {
  id: string;
  name: string;
  type: string;
  description: string;
  location: string;
  status: string;
  totalBudget: number;
  startDate: Date;
  expectedEndDate: Date | null;
  managerIds: string[];
  stageTemplates: unknown;
  greyStructure: unknown;
  timelineNotes: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: p.id,
    name: p.name,
    type: p.type,
    description: p.description,
    location: p.location,
    status: p.status,
    totalBudget: p.totalBudget,
    startDate: p.startDate.toISOString(),
    expectedEndDate: iso(p.expectedEndDate),
    managerIds: p.managerIds,
    stageTemplates: (p.stageTemplates as ConstructionStageTemplate[]) ?? [],
    greyStructure: p.greyStructure as GreyStructure,
    timelineNotes: p.timelineNotes,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

export function mapUnit(u: {
  id: string;
  projectId: string;
  number: string;
  type: string;
  size: string;
  floor: string;
  status: string;
  salePrice: number;
  rentalPrice: number;
  constructionProgress: number;
  sale: unknown;
  rental: unknown;
  booking: unknown;
  expenses: number;
  notes: string;
  documents: unknown;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: u.id,
    projectId: u.projectId,
    number: u.number,
    type: u.type,
    size: u.size,
    floor: u.floor,
    status: u.status,
    salePrice: u.salePrice,
    rentalPrice: u.rentalPrice,
    constructionProgress: u.constructionProgress,
    sale: (u.sale as SaleRecord | null) ?? undefined,
    rental: (u.rental as RentalRecord | null) ?? undefined,
    booking: (u.booking as BookingRecord | null) ?? undefined,
    expenses: u.expenses,
    notes: u.notes,
    documents: (u.documents as DocumentFile[]) ?? [],
    createdAt: u.createdAt.toISOString(),
    updatedAt: u.updatedAt.toISOString(),
  };
}

export function mapTask(t: {
  id: string;
  projectId: string;
  unitId: string | null;
  name: string;
  weight: number;
  progress: number;
  startDate: Date | null;
  expectedCompletionDate: Date | null;
  status: string;
  comments: string;
  order: number;
}) {
  return {
    id: t.id,
    projectId: t.projectId,
    unitId: t.unitId ?? undefined,
    name: t.name,
    weight: t.weight,
    progress: t.progress,
    startDate: iso(t.startDate),
    expectedCompletionDate: iso(t.expectedCompletionDate),
    status: t.status,
    comments: t.comments,
    order: t.order,
  };
}

export function mapMedia(m: {
  id: string;
  projectId: string;
  unitId: string | null;
  taskId: string | null;
  kind: string;
  url: string;
  mimeType: string;
  fileName: string;
  comment: string;
  progressPercentage: number;
  workCategory: string;
  managerName: string;
  managerId: string;
  createdAt: Date;
}) {
  return {
    id: m.id,
    projectId: m.projectId,
    unitId: m.unitId ?? undefined,
    taskId: m.taskId ?? undefined,
    kind: m.kind,
    dataUrl: m.url,
    mimeType: m.mimeType,
    fileName: m.fileName,
    comment: m.comment,
    progressPercentage: m.progressPercentage,
    workCategory: m.workCategory,
    managerName: m.managerName,
    managerId: m.managerId,
    createdAt: m.createdAt.toISOString(),
  };
}

export function mapExpense(e: {
  id: string;
  projectId: string;
  unitId: string | null;
  category: string;
  amount: number;
  date: Date;
  description: string;
  receiptUrl: string | null;
  receiptName: string | null;
  scope?: string;
  paymentMethod?: string;
  remarks?: string;
  addedById: string;
  addedByName: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: e.id,
    projectId: e.projectId,
    unitId: e.unitId ?? undefined,
    category: e.category,
    amount: e.amount,
    date: e.date.toISOString(),
    description: e.description,
    receiptDataUrl: e.receiptUrl ?? undefined,
    receiptName: e.receiptName ?? undefined,
    scope: (e.scope as 'unit' | 'common' | 'admin' | 'daily' | 'purchase') || 'unit',
    paymentMethod: (e.paymentMethod as 'cash' | 'bank_transfer' | 'cheque' | 'online' | 'other') || 'cash',
    remarks: e.remarks ?? '',
    addedById: e.addedById,
    addedByName: e.addedByName,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  };
}

export function mapPurchase(p: {
  id: string;
  projectId: string;
  unitId: string | null;
  date: Date;
  item: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  supplier: string;
  paymentMethod: string;
  billUrl: string | null;
  billName: string | null;
  remarks: string;
  expenseId: string | null;
  addedById: string;
  addedByName: string;
  createdAt: Date;
}) {
  return {
    id: p.id,
    projectId: p.projectId,
    unitId: p.unitId ?? undefined,
    date: p.date.toISOString(),
    item: p.item,
    quantity: p.quantity,
    unitPrice: p.unitPrice,
    totalAmount: p.totalAmount,
    supplier: p.supplier,
    paymentMethod: p.paymentMethod as 'cash' | 'bank_transfer' | 'cheque' | 'online' | 'other',
    billDataUrl: p.billUrl ?? undefined,
    billName: p.billName ?? undefined,
    remarks: p.remarks,
    expenseId: p.expenseId ?? undefined,
    addedById: p.addedById,
    addedByName: p.addedByName,
    createdAt: p.createdAt.toISOString(),
  };
}

export function mapAttendance(a: {
  id: string;
  projectId: string;
  date: Date;
  totalWorkers: number;
  present: number;
  absent: number;
  category: string;
  remarks: string;
  addedById: string;
  addedByName: string;
  createdAt: Date;
}) {
  return {
    id: a.id,
    projectId: a.projectId,
    date: a.date.toISOString(),
    totalWorkers: a.totalWorkers,
    present: a.present,
    absent: a.absent,
    category: a.category,
    remarks: a.remarks,
    addedById: a.addedById,
    addedByName: a.addedByName,
    createdAt: a.createdAt.toISOString(),
  };
}

export function mapClientPayment(p: {
  id: string;
  projectId: string;
  unitId: string;
  amount: number;
  date: Date;
  method: string;
  remarks: string;
  kind: string;
  addedById: string;
  addedByName: string;
  createdAt: Date;
}) {
  return {
    id: p.id,
    projectId: p.projectId,
    unitId: p.unitId,
    amount: p.amount,
    date: p.date.toISOString(),
    method: p.method as 'cash' | 'bank_transfer' | 'cheque' | 'online' | 'other',
    remarks: p.remarks,
    kind: p.kind as 'sale' | 'rental' | 'booking',
    addedById: p.addedById,
    addedByName: p.addedByName,
    createdAt: p.createdAt.toISOString(),
  };
}

export function mapPlot(p: {
  id: string;
  projectId: string;
  plotNumber: string;
  size: string;
  location: string;
  salePrice: number;
  buyerName: string | null;
  buyerContact: string | null;
  paymentReceived: number;
  remainingPayment: number;
  saleDate: Date | null;
  status: string;
  documents: unknown;
  notes: string;
  createdAt: Date;
}) {
  return {
    id: p.id,
    projectId: p.projectId,
    plotNumber: p.plotNumber,
    size: p.size,
    location: p.location,
    salePrice: p.salePrice,
    buyerName: p.buyerName ?? undefined,
    buyerContact: p.buyerContact ?? undefined,
    paymentReceived: p.paymentReceived,
    remainingPayment: p.remainingPayment,
    saleDate: iso(p.saleDate),
    status: p.status,
    documents: (p.documents as DocumentFile[]) ?? [],
    notes: p.notes,
    createdAt: p.createdAt.toISOString(),
  };
}

export function mapMaterialCatalog(c: {
  id: string;
  code: string;
  name: string;
  unit: string;
  active: boolean;
}): MaterialCatalogItem {
  return { id: c.id, code: c.code, name: c.name, unit: c.unit, active: c.active };
}

export function mapMaterialFormula(f: {
  id: string;
  projectId: string | null;
  workType: string;
  materialId: string;
  ratePerSqFt: number;
  notes: string;
}): MaterialFormula {
  return {
    id: f.id,
    projectId: f.projectId ?? undefined,
    workType: f.workType,
    materialId: f.materialId,
    ratePerSqFt: f.ratePerSqFt,
    notes: f.notes,
  };
}

export function mapMaterialEstimate(e: {
  id: string;
  projectId: string;
  unitId: string | null;
  workType: string;
  measurements: unknown;
  status: string;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
  lines?: {
    id: string;
    estimateId: string;
    materialId: string;
    formulaQty: number;
    plannedQty: number;
  }[];
}): MaterialEstimate {
  return {
    id: e.id,
    projectId: e.projectId,
    unitId: e.unitId ?? undefined,
    workType: e.workType,
    measurements: (e.measurements as MaterialMeasurements) ?? {
      length: 0,
      height: 0,
    },
    status: e.status,
    notes: e.notes,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
    lines: (e.lines ?? []).map(
      (l): MaterialEstimateLine => ({
        id: l.id,
        estimateId: l.estimateId,
        materialId: l.materialId,
        formulaQty: l.formulaQty,
        plannedQty: l.plannedQty,
      }),
    ),
  };
}

export function mapMaterialDelivery(d: {
  id: string;
  projectId: string;
  unitId: string | null;
  materialId: string;
  quantity: number;
  purchaseId: string | null;
  createdAt: Date;
}): MaterialDelivery {
  return {
    id: d.id,
    projectId: d.projectId,
    unitId: d.unitId ?? undefined,
    materialId: d.materialId,
    quantity: d.quantity,
    purchaseId: d.purchaseId ?? undefined,
    createdAt: d.createdAt.toISOString(),
  };
}

export function mapMaterialConsumption(c: {
  id: string;
  projectId: string;
  unitId: string | null;
  materialId: string;
  estimateId: string | null;
  workDoneArea: number;
  progressPct: number;
  actualQty: number;
  formulaExpectedQty: number;
  variancePct: number;
  flagged: boolean;
  remarks: string;
  mediaIds: string[];
  reportedById: string;
  reportedByName: string;
  createdAt: Date;
}): MaterialConsumption {
  return {
    id: c.id,
    projectId: c.projectId,
    unitId: c.unitId ?? undefined,
    materialId: c.materialId,
    estimateId: c.estimateId ?? undefined,
    workDoneArea: c.workDoneArea,
    progressPct: c.progressPct,
    actualQty: c.actualQty,
    formulaExpectedQty: c.formulaExpectedQty,
    variancePct: c.variancePct,
    flagged: c.flagged,
    remarks: c.remarks,
    mediaIds: c.mediaIds,
    reportedById: c.reportedById,
    reportedByName: c.reportedByName,
    createdAt: c.createdAt.toISOString(),
  };
}

export function mapMaterialRequest(r: {
  id: string;
  projectId: string;
  unitId: string | null;
  materialId: string;
  qtyRequested: number;
  reason: string;
  status: string;
  stockAtRequest: number;
  expectedRemaining: number;
  warnHigh: boolean;
  requestedById: string;
  requestedByName: string;
  decidedById: string | null;
  decidedByName: string | null;
  createdAt: Date;
  decidedAt: Date | null;
}): MaterialRequest {
  return {
    id: r.id,
    projectId: r.projectId,
    unitId: r.unitId ?? undefined,
    materialId: r.materialId,
    qtyRequested: r.qtyRequested,
    reason: r.reason,
    status: r.status,
    stockAtRequest: r.stockAtRequest,
    expectedRemaining: r.expectedRemaining,
    warnHigh: r.warnHigh,
    requestedById: r.requestedById,
    requestedByName: r.requestedByName,
    decidedById: r.decidedById ?? undefined,
    decidedByName: r.decidedByName ?? undefined,
    createdAt: r.createdAt.toISOString(),
    decidedAt: r.decidedAt ? r.decidedAt.toISOString() : undefined,
  };
}

export async function loadBootstrap(userId: string | null) {
  await ensureMaterialCatalog(prisma);

  const [
    users,
    projects,
    units,
    plots,
    tasks,
    media,
    updates,
    expenses,
    purchases,
    attendance,
    clientPayments,
    materialCatalog,
    materialFormulas,
    materialEstimates,
    materialDeliveries,
    materialConsumptions,
    materialRequests,
    notifications,
    auditLog,
    reports,
    meta,
  ] = await Promise.all([
    prisma.user.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.project.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.unit.findMany({ orderBy: { number: 'asc' } }),
    prisma.plot.findMany({ orderBy: { plotNumber: 'asc' } }),
    prisma.constructionTask.findMany({ orderBy: { order: 'asc' } }),
    prisma.mediaItem.findMany({ orderBy: { createdAt: 'desc' } }),
    prisma.progressUpdate.findMany({ orderBy: { createdAt: 'desc' } }),
    prisma.expense.findMany({ orderBy: { date: 'desc' } }),
    prisma.purchase.findMany({ orderBy: { date: 'desc' } }),
    prisma.attendance.findMany({ orderBy: { date: 'desc' } }),
    prisma.clientPayment.findMany({ orderBy: { date: 'desc' } }),
    prisma.materialCatalog.findMany({ orderBy: { name: 'asc' } }),
    prisma.materialFormula.findMany({ orderBy: { workType: 'asc' } }),
    prisma.materialEstimate.findMany({
      include: { lines: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.materialDelivery.findMany({ orderBy: { createdAt: 'desc' } }),
    prisma.materialConsumption.findMany({ orderBy: { createdAt: 'desc' } }),
    prisma.materialRequest.findMany({ orderBy: { createdAt: 'desc' } }),
    prisma.notification.findMany({ orderBy: { createdAt: 'desc' }, take: 200 }),
    prisma.auditEntry.findMany({ orderBy: { createdAt: 'desc' }, take: 500 }),
    prisma.managerReport.findMany({ orderBy: { createdAt: 'desc' } }),
    prisma.appMeta.findUnique({ where: { id: 'singleton' } }),
  ]);

  return {
    users: users.map(mapUser),
    currentUserId: userId,
    projects: projects.map(mapProject),
    units: units.map(mapUnit),
    plots: plots.map(mapPlot),
    tasks: tasks.map(mapTask),
    media: media.map(mapMedia),
    updates: updates.map((u) => ({
      id: u.id,
      projectId: u.projectId,
      unitId: u.unitId ?? undefined,
      taskId: u.taskId ?? undefined,
      title: u.title,
      comment: u.comment,
      progressPercentage: u.progressPercentage,
      workCategory: u.workCategory,
      managerId: u.managerId,
      managerName: u.managerName,
      mediaIds: u.mediaIds,
      createdAt: u.createdAt.toISOString(),
    })),
    expenses: expenses.map(mapExpense),
    purchases: purchases.map(mapPurchase),
    attendance: attendance.map(mapAttendance),
    clientPayments: clientPayments.map(mapClientPayment),
    materialCatalog: materialCatalog.map(mapMaterialCatalog),
    materialFormulas: materialFormulas.map(mapMaterialFormula),
    materialEstimates: materialEstimates.map(mapMaterialEstimate),
    materialDeliveries: materialDeliveries.map(mapMaterialDelivery),
    materialConsumptions: materialConsumptions.map(mapMaterialConsumption),
    materialRequests: materialRequests.map(mapMaterialRequest),
    notifications: notifications.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      projectId: n.projectId ?? undefined,
      unitId: n.unitId ?? undefined,
      read: n.read,
      createdAt: n.createdAt.toISOString(),
    })),
    auditLog: auditLog.map((a) => ({
      id: a.id,
      userId: a.userId,
      userName: a.userName,
      action: a.action,
      entityType: a.entityType,
      entityId: a.entityId,
      field: a.field ?? undefined,
      previousValue: a.previousValue ?? undefined,
      newValue: a.newValue ?? undefined,
      createdAt: a.createdAt.toISOString(),
    })),
    reports: reports.map((r) => ({
      id: r.id,
      projectId: r.projectId,
      managerId: r.managerId,
      managerName: r.managerName,
      period: r.period,
      title: r.title,
      completedWork: r.completedWork,
      pendingWork: r.pendingWork,
      notes: r.notes,
      createdAt: r.createdAt.toISOString(),
    })),
    selectedProjectId: meta?.selectedProjectId ?? projects[0]?.id ?? null,
    hydrated: true,
  };
}

export async function syncUnitExpenseTotal(unitId: string) {
  const rows = await prisma.expense.findMany({ where: { unitId } });
  const total = rows.reduce((s, e) => s + e.amount, 0);
  await prisma.unit.update({ where: { id: unitId }, data: { expenses: total } });
}

export async function recalculateUnitAndGrey(projectId: string, unitId?: string) {
  if (unitId) {
    const tasks = await prisma.constructionTask.findMany({ where: { unitId } });
    if (tasks.length) {
      const totalWeight = tasks.reduce((s, t) => s + t.weight, 0) || 1;
      const weighted = tasks.reduce((s, t) => s + t.weight * (t.progress / 100), 0);
      const progress = Math.round((weighted / totalWeight) * 1000) / 10;
      await prisma.unit.update({
        where: { id: unitId },
        data: { constructionProgress: progress },
      });
    }
  }

  const gsTask = await prisma.constructionTask.findFirst({
    where: {
      projectId,
      unitId: null,
      name: { contains: 'Grey', mode: 'insensitive' },
    },
  });
  if (gsTask) {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (project) {
      const gs = project.greyStructure as Record<string, unknown>;
      await prisma.project.update({
        where: { id: projectId },
        data: {
          greyStructure: { ...gs, progress: gsTask.progress, projectId },
        },
      });
    }
  }
}
