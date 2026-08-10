export type UserRole = 'admin' | 'manager' | 'accountant';

export type UnitStatus =
  | 'available'
  | 'sold'
  | 'rented'
  | 'reserved'
  | 'booked'
  | 'under_construction'
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
  | 'Machinery'
  | 'Transportation'
  | 'Parking'
  | 'Decoration'
  | 'Grey Structure'
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
  type: 'shop' | 'apartment' | 'office' | 'plot' | 'other';
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
  notifications: Notification[];
  auditLog: AuditEntry[];
  reports: ManagerReport[];
  selectedProjectId: string | null;
  hydrated: boolean;
}
