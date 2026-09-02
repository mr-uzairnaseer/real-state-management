import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { json, handleApiError } from '@/lib/api-helpers';
import { hasCapability } from '@/lib/access';
import type { UserRole } from '@/lib/types';
import { round2 } from '@/lib/material-calc';

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    if (!hasCapability(user.role as UserRole, 'view_material_stock') && user.role !== 'admin') {
      // admin always has view; managers have view_material_stock
      return json({ error: 'Forbidden' }, 403);
    }
    const projectId = req.nextUrl.searchParams.get('projectId');
    const unitId = req.nextUrl.searchParams.get('unitId');
    if (!projectId) return json({ error: 'projectId required' }, 400);

    const catalog = await prisma.materialCatalog.findMany({ where: { active: true } });

    const stock = await Promise.all(
      catalog.map(async (m) => {
        const [del, con, planned] = await Promise.all([
          prisma.materialDelivery.aggregate({
            where: { projectId, materialId: m.id, ...(unitId ? { unitId } : {}) },
            _sum: { quantity: true },
          }),
          prisma.materialConsumption.aggregate({
            where: { projectId, materialId: m.id, ...(unitId ? { unitId } : {}) },
            _sum: { actualQty: true },
          }),
          prisma.materialEstimateLine.findMany({
            where: {
              materialId: m.id,
              estimate: {
                projectId,
                status: 'active',
                ...(unitId ? { unitId } : {}),
              },
            },
          }),
        ]);
        const delivered = del._sum.quantity ?? 0;
        const consumed = con._sum.actualQty ?? 0;
        const plannedQty = planned.reduce((s, l) => s + l.plannedQty, 0);
        return {
          materialId: m.id,
          code: m.code,
          name: m.name,
          unit: m.unit,
          delivered: round2(delivered),
          consumed: round2(consumed),
          onHand: round2(Math.max(0, delivered - consumed)),
          planned: round2(plannedQty),
          plannedRemaining: round2(plannedQty - consumed),
        };
      }),
    );

    return json({ stock, unitId: unitId ?? null });
  } catch (err) {
    return handleApiError(err);
  }
}
