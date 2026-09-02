import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const DEFAULT_STAGES = [
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

function stages() {
  return DEFAULT_STAGES.map((s, i) => ({
    id: `stage-${i + 1}-${s.order}`,
    ...s,
  }));
}

export async function seedDatabase(client: PrismaClient, opts?: { force?: boolean }) {
  const existing = await client.user.count();
  if (existing && !opts?.force && process.env.FORCE_SEED !== '1') {
    console.log('Database already has data — ensuring material catalog, skipping full seed.');
    const { ensureMaterialCatalog } = await import('./ensure-materials');
    await ensureMaterialCatalog(client);
    return;
  }

  console.log('Seeding database...');

  await client.materialRequest.deleteMany();
  await client.materialConsumption.deleteMany();
  await client.materialDelivery.deleteMany();
  await client.materialEstimateLine.deleteMany();
  await client.materialEstimate.deleteMany();
  await client.materialFormula.deleteMany();
  await client.materialCatalog.deleteMany();
  await client.clientPayment.deleteMany();
  await client.attendance.deleteMany();
  await client.purchase.deleteMany();
  await client.auditEntry.deleteMany();
  await client.notification.deleteMany();
  await client.managerReport.deleteMany();
  await client.progressUpdate.deleteMany();
  await client.mediaItem.deleteMany();
  await client.expense.deleteMany();
  await client.constructionTask.deleteMany();
  await client.plot.deleteMany();
  await client.unit.deleteMany();
  await client.project.deleteMany();
  await client.user.deleteMany();
  await client.appMeta.deleteMany();

  const { ensureMaterialCatalog } = await import('./ensure-materials');
  await ensureMaterialCatalog(client);

  const adminHash = await bcrypt.hash('admin123', 10);
  const managerHash = await bcrypt.hash('manager123', 10);
  const accountHash = await bcrypt.hash('account123', 10);

  const admin = await client.user.create({
    data: {
      name: 'Main Admin',
      email: 'admin@estate.local',
      passwordHash: adminHash,
      role: 'admin',
      avatarColor: '#3e63dd',
      assignedProjectIds: [],
    },
  });
  const manager = await client.user.create({
    data: {
      name: 'Ahmed Khan',
      email: 'manager@estate.local',
      passwordHash: managerHash,
      role: 'manager',
      avatarColor: '#30a46c',
      assignedProjectIds: [],
    },
  });
  await client.user.create({
    data: {
      name: 'Sara Ali',
      email: 'accountant@estate.local',
      passwordHash: accountHash,
      role: 'accountant',
      avatarColor: '#f76b15',
      assignedProjectIds: [],
    },
  });

  const stagesA = stages();
  const plaza = await client.project.create({
    data: {
      name: 'Commercial Plaza',
      type: 'Commercial',
      description: '30-shop commercial plaza with parking and food court.',
      location: 'Main Boulevard, Lahore',
      status: 'active',
      totalBudget: 85000000,
      startDate: new Date(Date.now() - 200 * 86400000),
      expectedEndDate: new Date(Date.now() + 120 * 86400000),
      managerIds: [manager.id],
      stageTemplates: stagesA,
      greyStructure: {
        projectId: 'temp',
        progress: 75,
        budget: 20000000,
        expenses: 15000000,
        completedWork: 'Columns, slabs up to floor 3',
        remainingWork: 'Roof slab finishing',
        constructionStatus: 'In Progress',
        notes: 'On track',
      },
      timelineNotes: 'Target handover Q4 2026',
    },
  });

  await client.project.update({
    where: { id: plaza.id },
    data: {
      greyStructure: {
        projectId: plaza.id,
        progress: 75,
        budget: 20000000,
        expenses: 15000000,
        completedWork: 'Columns, slabs up to floor 3',
        remainingWork: 'Roof slab finishing',
        constructionStatus: 'In Progress',
        notes: 'On track',
      },
    },
  });

  const residential = await client.project.create({
    data: {
      name: 'Residential Building',
      type: 'Residential',
      description: '20-unit residential apartments.',
      location: 'Gulberg, Lahore',
      status: 'active',
      totalBudget: 120000000,
      managerIds: [manager.id],
      stageTemplates: stages(),
      greyStructure: {
        projectId: 'temp',
        progress: 45,
        budget: 35000000,
        expenses: 18000000,
        completedWork: 'Foundation and basement',
        remainingWork: 'Upper floors',
        constructionStatus: 'In Progress',
        notes: '',
      },
    },
  });

  await client.project.update({
    where: { id: residential.id },
    data: {
      greyStructure: {
        projectId: residential.id,
        progress: 45,
        budget: 35000000,
        expenses: 18000000,
        completedWork: 'Foundation and basement',
        remainingWork: 'Upper floors',
        constructionStatus: 'In Progress',
        notes: '',
      },
    },
  });

  const restaurant = await client.project.create({
    data: {
      name: 'Restaurant / Food Project',
      type: 'Food/Restaurant',
      description: 'Standalone restaurant fit-out.',
      location: 'DHA Phase 5, Lahore',
      status: 'active',
      totalBudget: 25000000,
      managerIds: [],
      stageTemplates: stages(),
      greyStructure: {
        projectId: 'temp',
        progress: 90,
        budget: 8000000,
        expenses: 7200000,
        completedWork: 'Shell complete',
        remainingWork: 'Waterproofing',
        constructionStatus: 'Near Complete',
        notes: '',
      },
    },
  });

  await client.project.update({
    where: { id: restaurant.id },
    data: {
      greyStructure: {
        projectId: restaurant.id,
        progress: 90,
        budget: 8000000,
        expenses: 7200000,
        completedWork: 'Shell complete',
        remainingWork: 'Waterproofing',
        constructionStatus: 'Near Complete',
        notes: '',
      },
    },
  });

  await client.user.update({
    where: { id: admin.id },
    data: { assignedProjectIds: [plaza.id, residential.id, restaurant.id] },
  });
  await client.user.update({
    where: { id: manager.id },
    data: { assignedProjectIds: [plaza.id, residential.id] },
  });

  // Plaza shops
  for (let i = 1; i <= 30; i++) {
    const num = String(i).padStart(2, '0');
    const floor = i <= 10 ? 'Ground' : i <= 20 ? 'First' : 'Second';
    let status = 'under_construction';
    if (i <= 10) status = 'sold';
    else if (i <= 20) status = 'rented';
    else if (i <= 25) status = 'available';
    else if (i <= 28) status = 'under_construction';
    else status = 'reserved';

    const salePrice = 3500000 + i * 50000;
    const rentalPrice = 70000 + i * 1000;

    const data: Record<string, unknown> = {
      projectId: plaza.id,
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
    };

    if (status === 'sold') {
      const received = salePrice * (i % 3 === 0 ? 1 : 0.7);
      data.sale = {
        buyer: { name: `Buyer ${num}`, contact: `0300-${1000000 + i}` },
        salePrice,
        bookingDate: new Date(Date.now() - 100 * 86400000).toISOString(),
        saleDate: new Date(Date.now() - 60 * 86400000).toISOString(),
        advancePayment: salePrice * 0.25,
        amountReceived: received,
        remainingAmount: salePrice - received,
        paymentStatus: received >= salePrice ? 'paid' : 'partial',
        additionalExpenses: 50000,
        totalCost: 2200000,
        profit: salePrice - 2200000 - 50000,
        documents: [],
        notes: '',
      };
    }

    if (status === 'rented') {
      const isPaid = i % 3 !== 0;
      data.rental = {
        tenant: { name: `Tenant ${num}`, contact: `0321-${2000000 + i}` },
        monthlyRent: rentalPrice,
        securityDeposit: rentalPrice * 2,
        advancePayment: rentalPrice,
        startDate: new Date(Date.now() - 90 * 86400000).toISOString(),
        contractNotes: '12-month lease',
        paymentHistory: [
          {
            id: `rent-${num}`,
            month: '2026-08',
            amount: rentalPrice,
            paidAmount: isPaid ? rentalPrice : 0,
            dueDate: new Date(2026, 7, 5 + (i % 10)).toISOString(),
            paidDate: isPaid ? new Date(Date.now() - 5 * 86400000).toISOString() : undefined,
            status: isPaid ? 'paid' : i % 5 === 0 ? 'overdue' : 'pending',
          },
        ],
      };
    }

    if (i === 15 || status === 'reserved') {
      data.status = i === 15 ? 'booked' : 'reserved';
      data.booking = {
        customerName: `Customer ${num}`,
        contact: `0333-${3000000 + i}`,
        totalPrice: salePrice,
        advanceAmount: 1000000,
        remainingAmount: salePrice - 1000000,
        bookingDate: new Date(Date.now() - 10 * 86400000).toISOString(),
        expectedPaymentDate: new Date(Date.now() + 30 * 86400000).toISOString(),
        status: 'booked',
        paymentSchedule: [],
        notes: 'Booking confirmed',
      };
    }

    await client.unit.create({ data: data as never });
  }

  const commonAreas = [
    { number: 'Basement Parking', type: 'parking', progress: 80, status: 'under_construction' },
    { number: 'Main Entrance', type: 'entrance', progress: 70, status: 'under_construction' },
    { number: 'Main Boulevard', type: 'boulevard', progress: 55, status: 'under_construction' },
    { number: 'Staircases', type: 'staircase', progress: 90, status: 'under_construction' },
    { number: 'Elevators', type: 'elevator', progress: 40, status: 'under_construction' },
    { number: 'Rooftop', type: 'rooftop', progress: 25, status: 'under_construction' },
    { number: 'Banquet Hall', type: 'hall', progress: 60, status: 'under_construction' },
    { number: 'Exterior / Façade', type: 'facade', progress: 45, status: 'under_construction' },
    { number: 'Common Corridors', type: 'common_area', progress: 50, status: 'under_construction' },
  ];
  for (const area of commonAreas) {
    await client.unit.create({
      data: {
        projectId: plaza.id,
        number: area.number,
        type: area.type,
        size: 'Common',
        floor: 'All',
        status: area.status,
        constructionProgress: area.progress,
        expenses: 150000,
        notes: 'Common project infrastructure',
        documents: [],
      },
    });
  }

  for (let i = 1; i <= 20; i++) {
    const num = String(i).padStart(2, '0');
    await client.unit.create({
      data: {
        projectId: residential.id,
        number: `Apt ${num}`,
        type: 'apartment',
        size: `${900 + (i % 4) * 150} sq ft`,
        floor: String(Math.ceil(i / 4)),
        status: i <= 3 ? 'sold' : i <= 6 ? 'booked' : 'under_construction',
        salePrice: 12000000 + i * 200000,
        constructionProgress: 30 + (i % 40),
        expenses: 500000,
        documents: [],
        sale:
          i <= 3
            ? {
                buyer: { name: `Owner ${num}`, contact: `0301-555${num}` },
                salePrice: 12000000 + i * 200000,
                saleDate: new Date(Date.now() - 40 * 86400000).toISOString(),
                advancePayment: 3000000,
                amountReceived: 6000000,
                remainingAmount: 6000000 + i * 200000,
                paymentStatus: 'partial',
                additionalExpenses: 0,
                totalCost: 8000000,
                profit: 4000000,
                documents: [],
                notes: '',
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
                bookingDate: new Date(Date.now() - 15 * 86400000).toISOString(),
                status: 'booked',
                paymentSchedule: [],
                notes: '',
              }
            : undefined,
      },
    });
  }

  const progresses = [100, 100, 100, 90, 85, 90, 85, 75, 100, 60, 50, 40, 30, 70, 20, 20, 10];
  for (const stage of stagesA) {
    const progress = progresses[stage.order - 1] ?? 0;
    await client.constructionTask.create({
      data: {
        projectId: plaza.id,
        name: stage.name,
        weight: stage.weight,
        progress,
        status: progress >= 100 ? 'completed' : progress > 0 ? 'in_progress' : 'not_started',
        comments: '',
        order: stage.order,
        startDate: new Date(Date.now() - 180 * 86400000),
        expectedCompletionDate: new Date(Date.now() + 30 * 86400000),
      },
    });
  }

  for (const stage of stages()) {
    const progress = Math.min(100, Math.max(0, 45 - stage.order * 3));
    await client.constructionTask.create({
      data: {
        projectId: residential.id,
        name: stage.name,
        weight: stage.weight,
        progress,
        status: progress > 0 ? 'in_progress' : 'not_started',
        order: stage.order,
      },
    });
  }

  await client.plot.createMany({
    data: [
      {
        projectId: plaza.id,
        plotNumber: 'LP-01',
        size: '5 Marla',
        location: 'Rear block',
        salePrice: 8500000,
        buyerName: 'Imran Malik',
        buyerContact: '0300-1112233',
        paymentReceived: 8500000,
        remainingPayment: 0,
        saleDate: new Date(Date.now() - 30 * 86400000),
        status: 'sold_land_only',
        notes: 'Buyer responsible for own construction',
        documents: [],
      },
      {
        projectId: plaza.id,
        plotNumber: 'LP-02',
        size: '5 Marla',
        location: 'Rear block',
        salePrice: 8200000,
        paymentReceived: 0,
        remainingPayment: 8200000,
        status: 'available',
        documents: [],
      },
    ],
  });

  await client.expense.createMany({
    data: [
      {
        projectId: plaza.id,
        category: 'Cement',
        amount: 1200000,
        date: new Date(Date.now() - 20 * 86400000),
        description: 'Bulk cement',
        scope: 'common',
        paymentMethod: 'bank_transfer',
        remarks: 'Supplier: Lucky Cement',
        addedById: manager.id,
        addedByName: manager.name,
      },
      {
        projectId: plaza.id,
        category: 'Steel',
        amount: 3500000,
        date: new Date(Date.now() - 35 * 86400000),
        description: 'Grade 60 steel',
        scope: 'common',
        paymentMethod: 'cheque',
        remarks: '',
        addedById: manager.id,
        addedByName: manager.name,
      },
      {
        projectId: plaza.id,
        category: 'Labour',
        amount: 800000,
        date: new Date(Date.now() - 7 * 86400000),
        description: 'Weekly payroll',
        scope: 'common',
        paymentMethod: 'cash',
        remarks: '',
        addedById: admin.id,
        addedByName: admin.name,
      },
      {
        projectId: plaza.id,
        category: 'Food / Refreshments',
        amount: 12500,
        date: new Date(),
        description: 'Site lunch for labour',
        scope: 'daily',
        paymentMethod: 'cash',
        remarks: '22 workers',
        addedById: manager.id,
        addedByName: manager.name,
      },
      {
        projectId: plaza.id,
        category: 'Transportation',
        amount: 8000,
        date: new Date(),
        description: 'Material pickup from mandi',
        scope: 'daily',
        paymentMethod: 'cash',
        remarks: '',
        addedById: manager.id,
        addedByName: manager.name,
      },
      {
        projectId: plaza.id,
        category: 'Administrative',
        amount: 45000,
        date: new Date(Date.now() - 3 * 86400000),
        description: 'Office stationery and bills',
        scope: 'admin',
        paymentMethod: 'online',
        remarks: '',
        addedById: admin.id,
        addedByName: admin.name,
      },
    ],
  });

  const shop01 = await client.unit.findFirst({
    where: { projectId: plaza.id, number: 'Shop #01' },
  });
  if (shop01) {
    await client.expense.create({
      data: {
        projectId: plaza.id,
        unitId: shop01.id,
        category: 'Flooring',
        amount: 40000,
        date: new Date(Date.now() - 4 * 86400000),
        description: 'Tiles for Shop #01',
        scope: 'unit',
        paymentMethod: 'cash',
        remarks: '',
        addedById: manager.id,
        addedByName: manager.name,
      },
    });
    await client.expense.create({
      data: {
        projectId: plaza.id,
        unitId: shop01.id,
        category: 'Electrical',
        amount: 25000,
        date: new Date(Date.now() - 6 * 86400000),
        description: 'Wiring and fixtures',
        scope: 'unit',
        paymentMethod: 'cash',
        remarks: '',
        addedById: manager.id,
        addedByName: manager.name,
      },
    });
    await client.clientPayment.create({
      data: {
        projectId: plaza.id,
        unitId: shop01.id,
        amount: shop01.salePrice * 0.25,
        date: new Date(Date.now() - 90 * 86400000),
        method: 'bank_transfer',
        remarks: 'Booking advance',
        kind: 'sale',
        addedById: admin.id,
        addedByName: admin.name,
      },
    });
  }

  await client.purchase.createMany({
    data: [
      {
        projectId: plaza.id,
        unitId: shop01?.id,
        date: new Date(),
        item: 'Cement',
        quantity: 50,
        unitPrice: 1400,
        totalAmount: 70000,
        supplier: 'Lucky Cement Depot',
        paymentMethod: 'cash',
        remarks: 'Today site delivery',
        addedById: manager.id,
        addedByName: manager.name,
      },
      {
        projectId: plaza.id,
        date: new Date(Date.now() - 2 * 86400000),
        item: 'Steel',
        quantity: 2,
        unitPrice: 280000,
        totalAmount: 560000,
        supplier: 'Mughal Steel',
        paymentMethod: 'bank_transfer',
        remarks: '12mm bars',
        addedById: manager.id,
        addedByName: manager.name,
      },
      {
        projectId: plaza.id,
        date: new Date(Date.now() - 1 * 86400000),
        item: 'Paint',
        quantity: 40,
        unitPrice: 2200,
        totalAmount: 88000,
        supplier: 'Berger Paints',
        paymentMethod: 'cash',
        remarks: '',
        addedById: manager.id,
        addedByName: manager.name,
      },
    ],
  });

  await client.attendance.createMany({
    data: [
      {
        projectId: plaza.id,
        date: new Date(),
        totalWorkers: 25,
        present: 22,
        absent: 3,
        category: 'General labour',
        remarks: 'Two masons on leave',
        addedById: manager.id,
        addedByName: manager.name,
      },
      {
        projectId: plaza.id,
        date: new Date(Date.now() - 86400000),
        totalWorkers: 24,
        present: 24,
        absent: 0,
        category: 'General labour',
        remarks: 'Full crew',
        addedById: manager.id,
        addedByName: manager.name,
      },
    ],
  });

  await client.notification.createMany({
    data: [
      {
        type: 'milestone',
        title: 'Milestone',
        message: 'Commercial Plaza grey structure reached 75%',
        projectId: plaza.id,
        read: false,
      },
      {
        type: 'new_booking',
        title: 'New Booking',
        message: 'Shop #15 booked with advance payment',
        projectId: plaza.id,
        read: true,
      },
    ],
  });

  await client.managerReport.create({
    data: {
      projectId: plaza.id,
      managerId: manager.id,
      managerName: manager.name,
      period: 'weekly',
      title: 'Week progress',
      completedWork: 'Paint and electrical rough-in',
      pendingWork: 'Decoration and landscaping',
      notes: 'Labour availability good',
    },
  });

  await client.appMeta.create({
    data: { id: 'singleton', selectedProjectId: plaza.id },
  });

  console.log('Seed complete.');
  console.log('Logins: admin@estate.local / admin123');
  console.log('         manager@estate.local / manager123');
  console.log('         accountant@estate.local / account123');
}

