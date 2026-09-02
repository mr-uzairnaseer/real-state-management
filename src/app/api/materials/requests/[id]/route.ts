import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireUser, writeAudit } from '@/lib/auth';
import { json, handleApiError } from '@/lib/api-helpers';
import { mapMaterialRequest } from '@/lib/mappers';
import { hasCapability } from '@/lib/access';
import type { UserRole } from '@/lib/types';

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireUser();
    if (!hasCapability(user.role as UserRole, 'manage_material_plans')) {
      return json({ error: 'Forbidden' }, 403);
    }
    const { id } = await ctx.params;
    const body = await req.json();
    const status = body.status as string;
    if (status !== 'approved' && status !== 'rejected') {
      return json({ error: 'status must be approved or rejected' }, 400);
    }

    const row = await prisma.materialRequest.update({
      where: { id },
      data: {
        status,
        decidedById: user.id,
        decidedByName: user.name,
        decidedAt: new Date(),
      },
    });

    await prisma.notification.create({
      data: {
        type: 'material_request_decision',
        title: `Material request ${status}`,
        message: `${user.name} ${status} request for qty ${row.qtyRequested}. Record a Purchase when material arrives.`,
        projectId: row.projectId,
        unitId: row.unitId,
      },
    });

    await writeAudit({
      userId: user.id,
      userName: user.name,
      action: 'update',
      entityType: 'material_request',
      entityId: id,
      newValue: status,
    });

    return json({ request: mapMaterialRequest(row) });
  } catch (err) {
    return handleApiError(err);
  }
}
