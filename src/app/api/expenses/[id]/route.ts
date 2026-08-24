import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireUser, requireRole, writeAudit } from '@/lib/auth';
import { json, handleApiError } from '@/lib/api-helpers';
import { mapExpense, syncUnitExpenseTotal } from '@/lib/mappers';
import { saveDataUrl } from '@/lib/uploads';

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const body = await req.json();
    let receiptUrl: string | undefined;
    let receiptName: string | undefined;
    if (body.receiptDataUrl) {
      const saved = await saveDataUrl(body.receiptDataUrl, body.receiptName || 'receipt');
      receiptUrl = saved.url;
      receiptName = saved.fileName;
    }
    const expense = await prisma.expense.update({
      where: { id },
      data: {
        ...(body.category !== undefined ? { category: body.category } : {}),
        ...(body.amount !== undefined ? { amount: Number(body.amount) } : {}),
        ...(body.date !== undefined ? { date: new Date(body.date) } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.unitId !== undefined ? { unitId: body.unitId || null } : {}),
        ...(body.projectId !== undefined ? { projectId: body.projectId } : {}),
        ...(body.scope !== undefined ? { scope: body.scope } : {}),
        ...(body.paymentMethod !== undefined ? { paymentMethod: body.paymentMethod } : {}),
        ...(body.remarks !== undefined ? { remarks: body.remarks } : {}),
        ...(receiptUrl ? { receiptUrl, receiptName } : {}),
      },
    });
    if (expense.unitId) await syncUnitExpenseTotal(expense.unitId);
    await writeAudit({
      userId: user.id,
      userName: user.name,
      action: 'update',
      entityType: 'expense',
      entityId: id,
      newValue: JSON.stringify(body),
    });
    return json({ expense: mapExpense(expense) });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  try {
    await requireRole('admin', 'accountant');
    const { id } = await ctx.params;
    await prisma.expense.delete({ where: { id } });
    return json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
