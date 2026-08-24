import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRole, writeAudit } from '@/lib/auth';
import { json, handleApiError } from '@/lib/api-helpers';
import { mapPurchase, syncUnitExpenseTotal } from '@/lib/mappers';

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireRole('admin');
    const { id } = await ctx.params;
    const prev = await prisma.purchase.findUnique({ where: { id } });
    if (!prev) return json({ error: 'Not found' }, 404);
    if (prev.expenseId) {
      await prisma.expense.delete({ where: { id: prev.expenseId } }).catch(() => undefined);
    }
    await prisma.purchase.delete({ where: { id } });
    if (prev.unitId) await syncUnitExpenseTotal(prev.unitId);
    await writeAudit({
      userId: user.id,
      userName: user.name,
      action: 'delete',
      entityType: 'purchase',
      entityId: id,
    });
    return json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
