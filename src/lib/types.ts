export type UserRole = 'admin' | 'manager' | 'accountant';

export type UnitStatus =
  | 'available'
  | 'sold'
  | 'rented'
  | 'reserved'
  | 'booked'
  | 'under_construction'
  | 'completed'
  | 'sold_land_only';

export type TaskStatus =
  | 'not_started'
  | 'in_progress'
  | 'completed'
  | 'on_hold'
  | 'delayed';

export type PaymentStatus = 'pending' | 'partial' | 'paid' | 'overdue';

export type BookingStatus = 'pending' | 'booked' | 'cancelled' | 'converted';

export type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed';

export type MediaKind = 'before' | 'during' | 'completed' | 'other';

export type UnitType =
  | 'shop'
  | 'apartment'
  | 'office'
  | 'hall'
  | 'parking'
  | 'rooftop'
  | 'entrance'
  | 'boulevard'
  | 'staircase'
  | 'elevator'
  | 'facade'
  | 'common_area'
  | 'plot'
  | 'other';

export type ExpenseScope = 'unit' | 'common' | 'admin' | 'daily' | 'purchase';

export type PaymentMethod = 'cash' | 'bank_transfer' | 'cheque' | 'online' | 'other';

export type ExpenseCategory =
  | 'Cement'
  | 'Steel'
  | 'Bricks'
  | 'Sand'
  | 'Labour'
  | 'Electrical'
  | 'Plumbing'
  | 'Paint'
  | 'Flooring'
  | 'Tiles'
  | 'Wood'
  | 'Glass'
  | 'Hardware'
  | 'Machinery'
  | 'Transportation'
  | 'Parking'
  | 'Decoration'
  | 'Grey Structure'
  | 'Food / Refreshments'
  | 'Site Maintenance'
  | 'Utilities'
  | 'Miscellaneous'
  | 'Administrative'
  | 'Other Expenses';

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  assignedProjectIds: string[];
  avatarColor: string;
  createdAt: string;
}

export interface ConstructionStageTemplate {
  id: string;
  name: string;
  weight: number;
  order: number;
}

export interface ConstructionTask {
  id: string;
  projectId: string;
  unitId?: string;
  name: string;
  weight: number;
  progress: number;
  startDate?: string;
  expectedCompletionDate?: string;
  status: TaskStatus;
  comments: string;
  order: number;
}

export interface MediaItem {
  id: string;
  projectId: string;
  unitId?: string;
  taskId?: string;
  kind: MediaKind;
  dataUrl: string;
  mimeType: string;
  fileName: string;
  comment: string;
  progressPercentage: number;
  workCategory: string;
  managerName: string;
  managerId: string;
  createdAt: string;
}

export interface ProgressUpdate {
  id: string;
  projectId: string;
  unitId?: string;
  taskId?: string;
  title: string;
  comment: string;
  progressPercentage: number;
  workCategory: string;
  managerId: string;
  managerName: string;
  mediaIds: string[];
  createdAt: string;
}

export interface BuyerInfo {
  name: string;
  contact: string;
  email?: string;
  cnic?: string;
  address?: string;
}

export interface TenantInfo {
  name: string;
  contact: string;
  email?: string;
  cnic?: string;
  address?: string;
}

export interface SaleRecord {
  buyer: BuyerInfo;
  salePrice: number;
  bookingDate?: string;
  saleDate?: string;
  advancePayment: number;
  amountReceived: number;
  remainingAmount: number;
  paymentStatus: PaymentStatus;
  additionalExpenses: number;
  totalCost: number;
  profit: number;
  documents: DocumentFile[];
  notes: string;
}

export interface RentPayment {
  id: string;
  month: string;
  amount: number;
  paidAmount: number;
  dueDate: string;
  paidDate?: string;
  status: PaymentStatus;
  notes?: string;
}

export interface RentalRecord {
  tenant: TenantInfo;
  monthlyRent: number;
  securityDeposit: number;
  advancePayment: number;
  startDate: string;
  endDate?: string;
  contractNotes: string;
  paymentHistory: RentPayment[];
}

export interface BookingRecord {
  customerName: string;
  contact: string;
  email?: string;
  totalPrice: number;
  advanceAmount: number;
  remainingAmount: number;
  bookingDate: string;
  expectedPaymentDate?: string;
  status: BookingStatus;
  paymentSchedule: PaymentScheduleItem[];
  notes: string;
}

export interface PaymentScheduleItem {
  id: string;
  label: string;
  amount: number;
  dueDate: string;
  paidAmount: number;
  status: PaymentStatus;
}

export interface DocumentFile {
  id: string;
  name: string;
  dataUrl: string;
  mimeType: string;
  uploadedAt: string;
}

export interface Unit {
  id: string;
  projectId: string;
  number: string;
  type: UnitType;
  size: string;
  floor: string;
  status: UnitStatus;
  salePrice: number;
  rentalPrice: number;
  constructionProgress: number;
  sale?: SaleRecord;
  rental?: RentalRecord;
  booking?: BookingRecord;
  expenses: number;
  notes: string;
  documents: DocumentFile[];
  createdAt: string;
  updatedAt: string;
}

export interface Plot {
  id: string;
  projectId: string;
  plotNumber: string;
  size: string;
  location: string;
  salePrice: number;
  buyerName?: string;
  buyerContact?: string;
  paymentReceived: number;
  remainingPayment: number;
  saleDate?: string;
  status: 'available' | 'reserved' | 'sold_land_only';
  documents: DocumentFile[];
  notes: string;
  createdAt: string;
}

export interface Expense {
  id: string;
  projectId: string;
  unitId?: string;
  category: ExpenseCategory;
  amount: number;
  date: string;
  description: string;
  receiptDataUrl?: string;
  receiptName?: string;
  scope: ExpenseScope;
  paymentMethod: PaymentMethod;
  remarks: string;
  addedById: string;
  addedByName: string;
  createdAt: string;
  updatedAt: string;
}

export interface GreyStructure {
  projectId: string;
  progress: number;
  budget: number;
  expenses: number;
  completedWork: string;
  remainingWork: string;
  constructionStatus: string;
  notes: string;
}

export interface Project {
  id: string;
  name: string;
  type: string;
  description: string;
  location: string;
  status: ProjectStatus;
  totalBudget: number;
  startDate: string;
  expectedEndDate?: string;
  managerIds: string[];
  stageTemplates: ConstructionStageTemplate[];
  greyStructure: GreyStructure;
  timelineNotes: string;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  type:
    | 'rent_due'
    | 'rent_overdue'
    | 'payment_due'
    | 'new_booking'
    | 'new_sale'
    | 'construction_update'
    | 'expense_added'
    | 'purchase_added'
    | 'bill_uploaded'
    | 'payment_received'
    | 'attendance_update'
    | 'milestone'
    | 'manager_report'
    | 'general';
  title: string;
  message: string;
  projectId?: string;
  unitId?: string;
  read: boolean;
  createdAt: string;
}

export interface AuditEntry {
  id: string;
  userId: string;
  userName: string;
  action: string;
  entityType: string;
  entityId: string;
  field?: string;
  previousValue?: string;
  newValue?: string;
  createdAt: string;
}

export interface ManagerReport {
  id: string;
  projectId: string;
  managerId: string;
  managerName: string;
  period: 'daily' | 'weekly';
  title: string;
  completedWork: string;
  pendingWork: string;
  notes: string;
  createdAt: string;
}

export interface Purchase {
  id: string;
  projectId: string;
  unitId?: string;
  date: string;
  item: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  supplier: string;
  paymentMethod: PaymentMethod;
  billDataUrl?: string;
  billName?: string;
  remarks: string;
  expenseId?: string;
  addedById: string;
  addedByName: string;
  createdAt: string;
}

export interface AttendanceRecord {
  id: string;
  projectId: string;
  date: string;
  totalWorkers: number;
  present: number;
  absent: number;
  category: string;
  remarks: string;
  addedById: string;
  addedByName: string;
  createdAt: string;
}

export interface ClientPayment {
  id: string;
  projectId: string;
  unitId: string;
  amount: number;
  date: string;
  method: PaymentMethod;
  remarks: string;
  kind: 'sale' | 'rental' | 'booking';
  addedById: string;
  addedByName: string;
  createdAt: string;
}

export type MaterialWorkType = 'brick_masonry' | 'plaster';

export interface MaterialMeasurements {
  length: number;
  height: number;
  thickness?: number;
  openingsArea?: number;
  netArea?: number;
}

export interface MaterialCatalogItem {
  id: string;
  code: string;
  name: string;
  unit: string;
  active: boolean;
}

export interface MaterialFormula {
  id: string;
  projectId?: string;
  workType: MaterialWorkType | string;
  materialId: string;
  ratePerSqFt: number;
  notes: string;
}

export interface MaterialEstimateLine {
  id: string;
  estimateId: string;
  materialId: string;
  formulaQty: number;
  plannedQty: number;
}

export interface MaterialEstimate {
  id: string;
  projectId: string;
  unitId?: string;
  workType: MaterialWorkType | string;
  measurements: MaterialMeasurements;
  status: 'draft' | 'active' | string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  lines: MaterialEstimateLine[];
}

export interface MaterialDelivery {
  id: string;
  projectId: string;
  unitId?: string;
  materialId: string;
  quantity: number;
  purchaseId?: string;
  createdAt: string;
}

export interface MaterialConsumption {
  id: string;
  projectId: string;
  unitId?: string;
  materialId: string;
  estimateId?: string;
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
  createdAt: string;
}

export interface MaterialRequest {
  id: string;
  projectId: string;
  unitId?: string;
  materialId: string;
  qtyRequested: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | string;
  stockAtRequest: number;
  expectedRemaining: number;
  warnHigh: boolean;
  requestedById: string;
  requestedByName: string;
  decidedById?: string;
  decidedByName?: string;
  createdAt: string;
  decidedAt?: string;
}

export interface AppState {
  users: User[];
  currentUserId: string | null;
  projects: Project[];
  units: Unit[];
  plots: Plot[];
  tasks: ConstructionTask[];
  media: MediaItem[];
  updates: ProgressUpdate[];
  expenses: Expense[];
  purchases: Purchase[];
  attendance: AttendanceRecord[];
  clientPayments: ClientPayment[];
  materialCatalog: MaterialCatalogItem[];
  materialFormulas: MaterialFormula[];
  materialEstimates: MaterialEstimate[];
  materialDeliveries: MaterialDelivery[];
  materialConsumptions: MaterialConsumption[];
  materialRequests: MaterialRequest[];
  notifications: Notification[];
  auditLog: AuditEntry[];
  reports: ManagerReport[];
  selectedProjectId: string | null;
  hydrated: boolean;
}
