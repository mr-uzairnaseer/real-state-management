import { v4 as uuid } from 'uuid';
import type {
  ConstructionStageTemplate,
  ConstructionTask,
  Expense,
  MediaItem,
  Notification,
  Plot,
  ProgressUpdate,
  Project,
  Unit,
  User,
  ManagerReport,
  AuditEntry,
} from './types';

const now = () => new Date().toISOString();
const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
};
const daysFromNow = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString();
};

export const DEFAULT_STAGES: Omit<ConstructionStageTemplate, 'id'>[] = [
  { name: 'Land/Site Preparation', weight: 5, order: 1 },
  { name: 'Foundation', weight: 10, order: 2 },
  { name: 'Grey Structure', weight: 25, order: 3 },
  { name: 'Brickwork', weight: 5, order: 4 },
  { name: 'Plaster', weight: 5, order: 5 },
  { name: 'Electrical Work', weight: 5, order: 6 },
  { name: 'Plumbing', weight: 5, order: 7 },
  { name: 'Flooring', weight: 5, order: 8 },
  { name: 'Paint Work', weight: 5, order: 9 },
  { name: 'Doors & Windows', weight: 4, order: 10 },
  { name: 'Ceiling', weight: 4, order: 11 },
  { name: 'Lighting', weight: 3, order: 12 },
  { name: 'Fans/AC Installation', weight: 3, order: 13 },
  { name: 'Parking', weight: 4, order: 14 },
  { name: 'Landscaping', weight: 4, order: 15 },
  { name: 'Interior Decoration', weight: 5, order: 16 },
  { name: 'Final Finishing', weight: 3, order: 17 },
];

function makeStages(): ConstructionStageTemplate[] {
  return DEFAULT_STAGES.map((s) => ({ ...s, id: uuid() }));
}

const ADMIN_ID = 'user-admin';
const MANAGER_ID = 'user-manager';
const ACCOUNTANT_ID = 'user-accountant';

const PROJECT_A = 'proj-commercial';
const PROJECT_B = 'proj-residential';
const PROJECT_C = 'proj-restaurant';

export function createSeedData() {
  const users: User[] = [
    {
      id: ADMIN_ID,
      name: 'Main Admin',
      email: 'admin@estate.local',
      password: 'admin123',
      role: 'admin',
      assignedProjectIds: [PROJECT_A, PROJECT_B, PROJECT_C],
      avatarColor: '#3e63dd',
      createdAt: daysAgo(90),
    },
    {
      id: MANAGER_ID,
      name: 'Ahmed Khan',
      email: 'manager@estate.local',
      password: 'manager123',
      role: 'manager',
      assignedProjectIds: [PROJECT_A, PROJECT_B],
      avatarColor: '#30a46c',
      createdAt: daysAgo(60),
    },
    {
      id: ACCOUNTANT_ID,
      name: 'Sara Ali',
      email: 'accountant@estate.local',
      password: 'account123',
      role: 'accountant',
      assignedProjectIds: [PROJECT_A, PROJECT_B, PROJECT_C],
      avatarColor: '#f76b15',
      createdAt: daysAgo(45),
    },
  ];

  const stagesA = makeStages();
  const stagesB = makeStages();
  const stagesC = makeStages();

  const projects: Project[] = [
    {
      id: PROJECT_A,
      name: 'Commercial Plaza',
      type: 'Commercial',
      description: '30-shop commercial plaza with parking and food court.',
      location: 'Main Boulevard, Lahore',
      status: 'active',
      totalBudget: 85000000,
      startDate: daysAgo(200),
      expectedEndDate: daysFromNow(120),
      managerIds: [MANAGER_ID],
      stageTemplates: stagesA,
      greyStructure: {
        projectId: PROJECT_A,
        progress: 75,
        budget: 20000000,
        expenses: 15000000,
        completedWork: 'Columns, slabs up to floor 3, staircases',
        remainingWork: 'Roof slab finishing, shaft walls',
        constructionStatus: 'In Progress',
        notes: 'Grey structure budget on track.',
      },
      timelineNotes: 'Target handover Q4 2026',
      createdAt: daysAgo(200),
      updatedAt: daysAgo(1),
    },
    {
      id: PROJECT_B,
      name: 'Residential Building',
      type: 'Residential',
      description: '20-unit residential apartments with amenities.',
      location: 'Gulberg, Lahore',
      status: 'active',
      totalBudget: 120000000,
      startDate: daysAgo(150),
      expectedEndDate: daysFromNow(200),
      managerIds: [MANAGER_ID],
      stageTemplates: stagesB,
      greyStructure: {
        projectId: PROJECT_B,
        progress: 45,
        budget: 35000000,
        expenses: 18000000,
        completedWork: 'Foundation and basement',
        remainingWork: 'Upper floors grey structure',
        constructionStatus: 'In Progress',
        notes: '',
      },
      timelineNotes: 'Phase 1 units priority',
      createdAt: daysAgo(150),
      updatedAt: daysAgo(2),
    },
    {
      id: PROJECT_C,
      name: 'Restaurant / Food Project',
      type: 'Food/Restaurant',
      description: 'Standalone restaurant fit-out and outdoor seating.',
      location: 'DHA Phase 5, Lahore',
      status: 'active',
      totalBudget: 25000000,
      startDate: daysAgo(80),
      expectedEndDate: daysFromNow(60),
      managerIds: [],
      stageTemplates: stagesC,
      greyStructure: {
        projectId: PROJECT_C,
        progress: 90,
        budget: 8000000,
        expenses: 7200000,
        completedWork: 'Shell complete',
        remainingWork: 'Minor waterproofing',
        constructionStatus: 'Near Complete',
        notes: '',
      },
      timelineNotes: 'Interior finishing in progress',
      createdAt: daysAgo(80),
      updatedAt: daysAgo(0),
    },
  ];

  const units: Unit[] = [];
  // Commercial Plaza — 30 shops
  for (let i = 1; i <= 30; i++) {
    const num = String(i).padStart(2, '0');
    const floor = i <= 10 ? 'Ground' : i <= 20 ? 'First' : 'Second';
    let status: Unit['status'] = 'under_construction';
    if (i <= 10) status = 'sold';
    else if (i <= 20) status = 'rented';
    else if (i <= 25) status = 'available';
    else if (i <= 28) status = 'under_construction';
    else status = 'reserved';

    const unitId = `unit-a-${num}`;
    const salePrice = 3500000 + i * 50000;
    const rentalPrice = 70000 + i * 1000;

    const unit: Unit = {
      id: unitId,
      projectId: PROJECT_A,
      number: `Shop #${num}`,
      type: 'shop',
      size: `${180 + (i % 5) * 20} sq ft`,
      floor,
      status,
      salePrice,
      rentalPrice,
      constructionProgress: status === 'sold' || status === 'rented' ? 85 + (i % 10) : 40 + (i % 40),
      expenses: 200000 + i * 5000,
      notes: '',
      documents: [],
      createdAt: daysAgo(180),
      updatedAt: daysAgo(i % 10),
    };

    if (status === 'sold') {
      const received = salePrice * (i % 3 === 0 ? 1 : 0.7);
      unit.sale = {
        buyer: {
          name: `Buyer ${num}`,
          contact: `0300-${1000000 + i}`,
          email: `buyer${num}@mail.com`,
        },
        salePrice,
        bookingDate: daysAgo(100 + i),
        saleDate: daysAgo(60 + i),
        advancePayment: salePrice * 0.25,
        amountReceived: received,
        remainingAmount: salePrice - received,
        paymentStatus: received >= salePrice ? 'paid' : 'partial',
        additionalExpenses: 50000,
        totalCost: 2200000,
        profit: salePrice - 2200000 - 50000,
        documents: [],
        notes: received >= salePrice ? 'Fully paid' : 'Installment plan active',
      };
      if (received >= salePrice) unit.status = 'sold';
    }

    if (status === 'rented') {
      const monthKey = '2026-08';
      const due = new Date(2026, 7, 5 + (i % 10));
      const isPaid = i % 3 !== 0;
      unit.rental = {
        tenant: {
          name: `Tenant ${num}`,
          contact: `0321-${2000000 + i}`,
        },
        monthlyRent: rentalPrice,
        securityDeposit: rentalPrice * 2,
        advancePayment: rentalPrice,
        startDate: daysAgo(90),
        contractNotes: '12-month lease',
        paymentHistory: [
          {
            id: uuid(),
            month: monthKey,
            amount: rentalPrice,
            paidAmount: isPaid ? rentalPrice : 0,
            dueDate: due.toISOString(),
            paidDate: isPaid ? daysAgo(5) : undefined,
            status: isPaid ? 'paid' : i % 5 === 0 ? 'overdue' : 'pending',
          },
        ],
      };
    }

    if (status === 'reserved' || (status === 'available' && i === 15)) {
      if (i === 15 || status === 'reserved') {
        unit.status = i === 15 ? 'booked' : 'reserved';
        unit.booking = {
          customerName: `Customer ${num}`,
          contact: `0333-${3000000 + i}`,
          totalPrice: salePrice,
          advanceAmount: 1000000,
          remainingAmount: salePrice - 1000000,
          bookingDate: daysAgo(10),
          expectedPaymentDate: daysFromNow(30),
          status: 'booked',
          paymentSchedule: [
            {
              id: uuid(),
              label: 'Advance',
              amount: 1000000,
              dueDate: daysAgo(10),
              paidAmount: 1000000,
              status: 'paid',
            },
            {
              id: uuid(),
              label: 'Second Installment',
              amount: Math.round((salePrice - 1000000) / 2),
              dueDate: daysFromNow(30),
              paidAmount: 0,
              status: 'pending',
            },
            {
              id: uuid(),
              label: 'Final Payment',
              amount: Math.round((salePrice - 1000000) / 2),
              dueDate: daysFromNow(60),
              paidAmount: 0,
              status: 'pending',
            },
          ],
          notes: 'Booking confirmed',
        };
      }
    }

    units.push(unit);
  }

  // Residential — 20 units
  for (let i = 1; i <= 20; i++) {
    const num = String(i).padStart(2, '0');
    units.push({
      id: `unit-b-${num}`,
      projectId: PROJECT_B,
      number: `Apt ${num}`,
      type: 'apartment',
      size: `${900 + (i % 4) * 150} sq ft`,
      floor: String(Math.ceil(i / 4)),
      status: i <= 3 ? 'sold' : i <= 6 ? 'booked' : 'under_construction',
      salePrice: 12000000 + i * 200000,
      rentalPrice: 0,
      constructionProgress: 30 + (i % 40),
      expenses: 500000,
      notes: '',
      documents: [],
      createdAt: daysAgo(140),
      updatedAt: daysAgo(3),
      sale:
        i <= 3
          ? {
              buyer: { name: `Owner ${num}`, contact: `0301-555${num}` },
              salePrice: 12000000 + i * 200000,
              saleDate: daysAgo(40),
              advancePayment: 3000000,
              amountReceived: 6000000,
              remainingAmount: 6000000 + i * 200000,
              paymentStatus: 'partial',
              additionalExpenses: 0,
              totalCost: 8000000,
              profit: 4000000,
              documents: [],
              notes: '',
              bookingDate: daysAgo(70),
            }
          : undefined,
      booking:
        i > 3 && i <= 6
          ? {
              customerName: `Booker ${num}`,
              contact: `0345-444${num}`,
              totalPrice: 12000000 + i * 200000,
              advanceAmount: 2000000,
              remainingAmount: 10000000 + i * 200000,
              bookingDate: daysAgo(15),
              status: 'booked',
              paymentSchedule: [],
              notes: '',
            }
          : undefined,
    });
  }

  // Tasks for project A (project-level)
  const tasks: ConstructionTask[] = stagesA.map((stage, idx) => {
    const progresses = [100, 100, 100, 90, 85, 90, 85, 75, 100, 60, 50, 40, 30, 70, 20, 20, 10];
    const progress = progresses[idx] ?? 0;
    return {
      id: `task-a-${stage.id}`,
      projectId: PROJECT_A,
      name: stage.name,
      weight: stage.weight,
      progress,
      startDate: daysAgo(180 - idx * 5),
      expectedCompletionDate: daysFromNow(30 + idx * 3),
      status: progress >= 100 ? 'completed' : progress > 0 ? 'in_progress' : 'not_started',
      comments: progress >= 100 ? 'Completed' : 'In progress',
      order: stage.order,
    };
  });

  // Sample unit-level tasks for Shop #12
  const shop12 = units.find((u) => u.number === 'Shop #12');
  if (shop12) {
    const shopWeights = [
      { name: 'Grey Structure', weight: 30, progress: 100 },
      { name: 'Plaster', weight: 10, progress: 100 },
      { name: 'Electrical', weight: 10, progress: 100 },
      { name: 'Flooring', weight: 10, progress: 50 },
      { name: 'Paint', weight: 15, progress: 100 },
      { name: 'Ceiling', weight: 10, progress: 50 },
      { name: 'Fans/Lighting', weight: 5, progress: 20 },
      { name: 'Decoration', weight: 10, progress: 20 },
    ];
    shopWeights.forEach((w, i) => {
      tasks.push({
        id: `task-shop12-${i}`,
        projectId: PROJECT_A,
        unitId: shop12.id,
        name: w.name,
        weight: w.weight,
        progress: w.progress,
        status: w.progress >= 100 ? 'completed' : 'in_progress',
        comments: '',
        order: i + 1,
        startDate: daysAgo(60),
        expectedCompletionDate: daysFromNow(20),
      });
    });
    shop12.constructionProgress = Math.round(
      shopWeights.reduce((s, w) => s + w.weight * (w.progress / 100), 0),
    );
  }

  stagesB.forEach((stage, idx) => {
    const progress = Math.min(100, Math.max(0, 45 - idx * 3 + (idx % 5) * 5));
    tasks.push({
      id: `task-b-${stage.id}`,
      projectId: PROJECT_B,
      name: stage.name,
      weight: stage.weight,
      progress,
      status: progress >= 100 ? 'completed' : progress > 0 ? 'in_progress' : 'not_started',
      comments: '',
      order: stage.order,
      startDate: daysAgo(140),
      expectedCompletionDate: daysFromNow(100),
    });
  });

  stagesC.forEach((stage, idx) => {
    const progress = Math.min(100, 65 + (10 - idx));
    tasks.push({
      id: `task-c-${stage.id}`,
      projectId: PROJECT_C,
      name: stage.name,
      weight: stage.weight,
      progress: Math.max(0, progress),
      status: progress >= 100 ? 'completed' : 'in_progress',
      comments: '',
      order: stage.order,
    });
  });

  const plots: Plot[] = [
    {
      id: 'plot-1',
      projectId: PROJECT_A,
      plotNumber: 'LP-01',
      size: '5 Marla',
      location: 'Rear block, Commercial Plaza',
      salePrice: 8500000,
      buyerName: 'Imran Malik',
      buyerContact: '0300-1112233',
      paymentReceived: 8500000,
      remainingPayment: 0,
      saleDate: daysAgo(30),
      status: 'sold_land_only',
      documents: [],
      notes: 'Buyer responsible for own construction',
      createdAt: daysAgo(50),
    },
    {
      id: 'plot-2',
      projectId: PROJECT_A,
      plotNumber: 'LP-02',
      size: '5 Marla',
      location: 'Rear block, Commercial Plaza',
      salePrice: 8200000,
      paymentReceived: 0,
      remainingPayment: 8200000,
      status: 'available',
      documents: [],
      notes: '',
      createdAt: daysAgo(50),
    },
    {
      id: 'plot-3',
      projectId: PROJECT_B,
      plotNumber: 'RP-01',
      size: '10 Marla',
      location: 'Adjacent vacant land',
      salePrice: 15000000,
      paymentReceived: 5000000,
      remainingPayment: 10000000,
      buyerName: 'Nida Hassan',
      buyerContact: '0322-9988776',
      status: 'reserved',
      documents: [],
      notes: 'Partial payment received',
      createdAt: daysAgo(40),
    },
  ];

  const expenses: Expense[] = [
    {
      id: uuid(),
      projectId: PROJECT_A,
      category: 'Cement',
      amount: 1200000,
      date: daysAgo(20),
      description: 'Bulk cement for grey structure',
      addedById: MANAGER_ID,
      addedByName: 'Ahmed Khan',
      createdAt: daysAgo(20),
      updatedAt: daysAgo(20),
    },
    {
      id: uuid(),
      projectId: PROJECT_A,
      category: 'Steel',
      amount: 3500000,
      date: daysAgo(35),
      description: 'Grade 60 steel bars',
      addedById: MANAGER_ID,
      addedByName: 'Ahmed Khan',
      createdAt: daysAgo(35),
      updatedAt: daysAgo(35),
    },
    {
      id: uuid(),
      projectId: PROJECT_A,
      category: 'Labour',
      amount: 800000,
      date: daysAgo(7),
      description: 'Weekly labour payroll',
      addedById: ACCOUNTANT_ID,
      addedByName: 'Sara Ali',
      createdAt: daysAgo(7),
      updatedAt: daysAgo(7),
    },
    {
      id: uuid(),
      projectId: PROJECT_A,
      unitId: shop12?.id,
      category: 'Paint',
      amount: 85000,
      date: daysAgo(3),
      description: 'Shop #12 paint materials',
      addedById: MANAGER_ID,
      addedByName: 'Ahmed Khan',
      createdAt: daysAgo(3),
      updatedAt: daysAgo(3),
    },
    {
      id: uuid(),
      projectId: PROJECT_B,
      category: 'Grey Structure',
      amount: 4500000,
      date: daysAgo(15),
      description: 'Residential grey structure phase 1',
      addedById: MANAGER_ID,
      addedByName: 'Ahmed Khan',
      createdAt: daysAgo(15),
      updatedAt: daysAgo(15),
    },
    {
      id: uuid(),
      projectId: PROJECT_C,
      category: 'Decoration',
      amount: 650000,
      date: daysAgo(5),
      description: 'Interior décor package',
      addedById: ADMIN_ID,
      addedByName: 'Main Admin',
      createdAt: daysAgo(5),
      updatedAt: daysAgo(5),
    },
  ];

  // Placeholder SVG media as data URLs for gallery demo
  const placeholderSvg = (label: string, color: string) =>
    `data:image/svg+xml,${encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400"><rect fill="${color}" width="100%" height="100%"/><text x="50%" y="50%" fill="#fff" font-family="Arial" font-size="28" text-anchor="middle" dominant-baseline="middle">${label}</text></svg>`,
    )}`;

  const media: MediaItem[] = shop12
    ? [
        {
          id: 'media-1',
          projectId: PROJECT_A,
          unitId: shop12.id,
          kind: 'before',
          dataUrl: placeholderSvg('Shop #12 — Before', '#666666'),
          mimeType: 'image/svg+xml',
          fileName: 'shop12-before.svg',
          comment: 'Before paint work started',
          progressPercentage: 70,
          workCategory: 'Paint Work',
          managerName: 'Ahmed Khan',
          managerId: MANAGER_ID,
          createdAt: daysAgo(8),
        },
        {
          id: 'media-2',
          projectId: PROJECT_A,
          unitId: shop12.id,
          kind: 'during',
          dataUrl: placeholderSvg('Shop #12 — During', '#3e63dd'),
          mimeType: 'image/svg+xml',
          fileName: 'shop12-during.svg',
          comment: 'Paint in progress',
          progressPercentage: 85,
          workCategory: 'Paint Work',
          managerName: 'Ahmed Khan',
          managerId: MANAGER_ID,
          createdAt: daysAgo(5),
        },
        {
          id: 'media-3',
          projectId: PROJECT_A,
          unitId: shop12.id,
          kind: 'completed',
          dataUrl: placeholderSvg('Shop #12 — Completed', '#30a46c'),
          mimeType: 'image/svg+xml',
          fileName: 'shop12-completed.svg',
          comment:
            'Paint work has been completed. Only decoration and final finishing are remaining.',
          progressPercentage: 100,
          workCategory: 'Paint Work',
          managerName: 'Ahmed Khan',
          managerId: MANAGER_ID,
          createdAt: daysAgo(2),
        },
      ]
    : [];

  const updates: ProgressUpdate[] = [
    {
      id: uuid(),
      projectId: PROJECT_A,
      unitId: shop12?.id,
      title: 'Shop #12 Paint Work Completed',
      comment:
        'Paint work has been completed. Only decoration and final finishing are remaining.',
      progressPercentage: 100,
      workCategory: 'Paint Work',
      managerId: MANAGER_ID,
      managerName: 'Ahmed Khan',
      mediaIds: media.map((m) => m.id),
      createdAt: daysAgo(2),
    },
    {
      id: uuid(),
      projectId: PROJECT_A,
      title: 'Grey Structure Update',
      comment: 'Floor 3 slab poured successfully. Curing in progress.',
      progressPercentage: 75,
      workCategory: 'Grey Structure',
      managerId: MANAGER_ID,
      managerName: 'Ahmed Khan',
      mediaIds: [],
      createdAt: daysAgo(4),
    },
    {
      id: uuid(),
      projectId: PROJECT_B,
      title: 'Foundation Complete',
      comment: 'Basement waterproofing started.',
      progressPercentage: 45,
      workCategory: 'Foundation',
      managerId: MANAGER_ID,
      managerName: 'Ahmed Khan',
      mediaIds: [],
      createdAt: daysAgo(6),
    },
  ];

  const notifications: Notification[] = [
    {
      id: uuid(),
      type: 'rent_due',
      title: 'Rent Due',
      message: 'Shop #11 – Monthly Rent pending. Due Date: 10 August 2026',
      projectId: PROJECT_A,
      read: false,
      createdAt: daysAgo(1),
    },
    {
      id: uuid(),
      type: 'construction_update',
      title: 'Construction Update',
      message: 'Ahmed Khan submitted paint completion for Shop #12',
      projectId: PROJECT_A,
      unitId: shop12?.id,
      read: false,
      createdAt: daysAgo(2),
    },
    {
      id: uuid(),
      type: 'new_booking',
      title: 'New Booking',
      message: 'Shop #15 booked with PKR 1,000,000 advance',
      projectId: PROJECT_A,
      read: true,
      createdAt: daysAgo(10),
    },
    {
      id: uuid(),
      type: 'expense_added',
      title: 'Expense Added',
      message: 'Paint materials PKR 85,000 added for Shop #12',
      projectId: PROJECT_A,
      read: true,
      createdAt: daysAgo(3),
    },
    {
      id: uuid(),
      type: 'milestone',
      title: 'Milestone',
      message: 'Commercial Plaza grey structure reached 75%',
      projectId: PROJECT_A,
      read: false,
      createdAt: daysAgo(4),
    },
  ];

  const reports: ManagerReport[] = [
    {
      id: uuid(),
      projectId: PROJECT_A,
      managerId: MANAGER_ID,
      managerName: 'Ahmed Khan',
      period: 'weekly',
      title: 'Week of 4 Aug 2026',
      completedWork: 'Paint on Shop #12, electrical rough-in floors 1-2',
      pendingWork: 'Decoration, landscaping, final inspection prep',
      notes: 'Labour availability good this week',
      createdAt: daysAgo(2),
    },
  ];

  const auditLog: AuditEntry[] = [
    {
      id: uuid(),
      userId: MANAGER_ID,
      userName: 'Ahmed Khan',
      action: 'update',
      entityType: 'task',
      entityId: 'shop12-paint',
      field: 'progress',
      previousValue: '80',
      newValue: '100',
      createdAt: daysAgo(2),
    },
    {
      id: uuid(),
      userId: ADMIN_ID,
      userName: 'Main Admin',
      action: 'create',
      entityType: 'booking',
      entityId: 'shop15',
      field: 'status',
      previousValue: 'available',
      newValue: 'booked',
      createdAt: daysAgo(10),
    },
  ];

  return {
    users,
    currentUserId: null as string | null,
    projects,
    units,
    plots,
    tasks,
    media,
    updates,
    expenses,
    notifications,
    auditLog,
    reports,
    selectedProjectId: PROJECT_A as string | null,
    hydrated: false,
  };
}

export const DEMO_CREDENTIALS = [
  { role: 'Main Admin', email: 'admin@estate.local', password: 'admin123' },
  { role: 'Manager', email: 'manager@estate.local', password: 'manager123' },
  { role: 'Accountant', email: 'accountant@estate.local', password: 'account123' },
];
