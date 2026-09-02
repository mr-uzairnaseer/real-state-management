import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireUser, writeAudit } from '@/lib/auth';
import { json, handleApiError } from '@/lib/api-helpers';
import { mapMaterialRequest } from '@/lib/mappers';
import { hasCapability } from '@/lib/access';
import type { UserRole } from '@/lib/types';
import { computeStock } from '@/lib/materials-sync';
import { round2 } from '@/lib/material-calc';

export async function GET(req: NextRequest) {
  try {
    await requireUser();
    const projectId = req.nextUrl.searchParams.get('projectId');
    const rows = await prisma.materialRequest.findMany({
      where: projectId ? { projectId } : undefined,
      orderBy: { createdAt: 'desc' },
    });
    return json({ requests: rows.map(mapMaterialRequest) });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    if (!hasCapability(user.role as UserRole, 'request_materials')) {
      return json({ error: 'Forbidden' }, 403);
    }
    const body = await req.json();
    const projectId = body.projectId as string;
    const materialId = body.materialId as string;
    const qtyRequested = Number(body.qtyRequested);
    if (!projectId || !materialId || !(qtyRequested > 0)) {
      return json({ error: 'projectId, materialId, qtyRequested required' }, 400);
    }

    const stock = await computeStock(projectId, materialId, body.unitId || null);

    const lines = await prisma.materialEstimateLine.findMany({
      where: {
        materialId,
        estimate: {
          projectId,
          status: 'active',
          ...(body.unitId ? { unitId: body.unitId } : {}),
        },
      },
    });
    const planned = lines.reduce((s, l) => s + l.plannedQty, 0);
    const expectedRemaining = round2(planned - stock.consumed);
    const warnHigh = qtyRequested > stock.onHand + Math.max(0, expectedRemaining);

    const row = await prisma.materialRequest.create({
      data: {
        projectId,
        unitId: body.unitId || null,
        materialId,
        qtyRequested,
        reason: body.reason ?? '',
        status: 'pending',
        stockAtRequest: stock.onHand,
        expectedRemaining,
        warnHigh,
        requestedById: user.id,
        requestedByName: user.name,
      },
    });

    await prisma.notification.create({
      data: {
        type: 'material_request',
        title: warnHigh ? 'Material request (high)' : 'Material request',
        message: `${user.name} requested ${qtyRequested} — stock ${stock.onHand}, expected remaining ${expectedRemaining}`,
        projectId,
        unitId: body.unitId || null,
      },
    });

    await writeAudit({
      userId: user.id,
      userName: user.name,
      action: 'create',
      entityType: 'material_request',
      entityId: row.id,
      newValue: `qty=${qtyRequested} warn=${warnHigh}`,
    });

    return json({ request: mapMaterialRequest(row) });
  } catch (err) {
    return handleApiError(err);
  }
}
