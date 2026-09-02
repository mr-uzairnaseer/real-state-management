import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireUser, writeAudit } from '@/lib/auth';
import { json, handleApiError } from '@/lib/api-helpers';
import { mapMaterialEstimate } from '@/lib/mappers';
import {
  formulaQtyForRate,
  netAreaFromMeasurements,
  type Measurements,
} from '@/lib/material-calc';
import { hasCapability } from '@/lib/access';
import type { UserRole } from '@/lib/types';

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    if (!hasCapability(user.role as UserRole, 'view_material_stock') && user.role !== 'admin') {
      return json({ error: 'Forbidden' }, 403);
    }
    const projectId = req.nextUrl.searchParams.get('projectId');
    const rows = await prisma.materialEstimate.findMany({
      where: projectId ? { projectId } : undefined,
      include: { lines: true },
      orderBy: { createdAt: 'desc' },
    });
    return json({ estimates: rows.map(mapMaterialEstimate) });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    if (!hasCapability(user.role as UserRole, 'manage_material_plans')) {
      return json({ error: 'Forbidden' }, 403);
    }
    const body = await req.json();
    const projectId = body.projectId as string;
    const workType = body.workType as string;
    if (!projectId || !workType) return json({ error: 'projectId and workType required' }, 400);

    const measurements: Measurements = {
      length: Number(body.measurements?.length) || 0,
      height: Number(body.measurements?.height) || 0,
      thickness: body.measurements?.thickness != null ? Number(body.measurements.thickness) : undefined,
      openingsArea: Number(body.measurements?.openingsArea) || 0,
      netArea: body.measurements?.netArea != null ? Number(body.measurements.netArea) : undefined,
    };
    const netArea = netAreaFromMeasurements(measurements);
    measurements.netArea = netArea;

    const projectFormulas = await prisma.materialFormula.findMany({
      where: { OR: [{ projectId }, { projectId: null }], workType },
    });
    const byMaterial = new Map<string, (typeof projectFormulas)[0]>();
    for (const f of projectFormulas) {
      if (f.projectId === projectId) byMaterial.set(f.materialId, f);
      else if (!byMaterial.has(f.materialId)) byMaterial.set(f.materialId, f);
    }
    if (byMaterial.size === 0) {
      return json({ error: 'No formulas for this work type' }, 400);
    }

    const plannedOverrides = (body.plannedOverrides ?? {}) as Record<string, number>;

    const estimate = await prisma.materialEstimate.create({
      data: {
        projectId,
        unitId: body.unitId || null,
        workType,
        measurements,
        status: body.status || 'active',
        notes: body.notes ?? '',
        lines: {
          create: Array.from(byMaterial.values()).map((f) => {
            const formulaQty = formulaQtyForRate(netArea, f.ratePerSqFt);
            const planned =
              plannedOverrides[f.materialId] != null
                ? Number(plannedOverrides[f.materialId])
                : formulaQty;
            return {
              materialId: f.materialId,
              formulaQty,
              plannedQty: planned,
            };
          }),
        },
      },
      include: { lines: true },
    });

    await writeAudit({
      userId: user.id,
      userName: user.name,
      action: 'create',
      entityType: 'material_estimate',
      entityId: estimate.id,
      newValue: `${workType} netArea=${netArea}`,
    });

    return json({ estimate: mapMaterialEstimate(estimate) });
  } catch (err) {
    return handleApiError(err);
  }
}
