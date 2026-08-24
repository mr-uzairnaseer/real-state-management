import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireUser, writeAudit } from '@/lib/auth';
import { json, handleApiError } from '@/lib/api-helpers';
import { mapExpense, syncUnitExpenseTotal } from '@/lib/mappers';
import { saveDataUrl } from '@/lib/uploads';

export async function GET(req: NextRequest) {
  try {
    await requireUser();
    const projectId = req.nextUrl.searchParams.get('projectId');
    const expenses = await prisma.expense.findMany({
      where: projectId ? { projectId } : undefined,
      orderBy: { date: 'desc' },
    });
    return json({ expenses: expenses.map(mapExpense) });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json();
    let receiptUrl: string | undefined;
    let receiptName: string | undefined;
    if (body.receiptDataUrl) {
      const saved = await saveDataUrl(body.receiptDataUrl, body.receiptName || 'receipt');
      receiptUrl = saved.url;
      receiptName = saved.fileName;
    }
    const expense = await prisma.expense.create({
      data: {
        projectId: body.projectId,
        unitId: body.unitId || null,
        category: body.category,
        amount: Number(body.amount) || 0,
        date: body.date ? new Date(body.date) : new Date(),
        description: body.description ?? '',
        receiptUrl,
        receiptName,
        scope: body.scope || (body.unitId ? 'unit' : 'common'),
        paymentMethod: body.paymentMethod || 'cash',
        remarks: body.remarks ?? '',
        addedById: user.id,
        addedByName: user.name,
      },
    });
    if (expense.unitId) await syncUnitExpenseTotal(expense.unitId);
    await prisma.notification.create({
      data: {
        type: 'expense_added',
        title: 'Expense Added',
        message: `${expense.category}: ${expense.amount}`,
        projectId: expense.projectId,
        unitId: expense.unitId,
      },
    });
    await writeAudit({
      userId: user.id,
      userName: user.name,
      action: 'create',
      entityType: 'expense',
      entityId: expense.id,
      newValue: `${expense.category} ${expense.amount}`,
    });
    return json({ expense: mapExpense(expense) });
  } catch (err) {
    return handleApiError(err);
  }
}
