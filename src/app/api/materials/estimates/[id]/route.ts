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

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireUser();
    if (!hasCapability(user.role as UserRole, 'manage_material_plans')) {
      return json({ error: 'Forbidden' }, 403);
    }
    const { id } = await ctx.params;
    const body = await req.json();
    const existing = await prisma.materialEstimate.findUnique({
      where: { id },
      include: { lines: true },
    });
    if (!existing) return json({ error: 'Not found' }, 404);

    if (body.plannedOverrides) {
      const overrides = body.plannedOverrides as Record<string, number>;
      for (const line of existing.lines) {
        if (overrides[line.materialId] != null) {
          await prisma.materialEstimateLine.update({
            where: { id: line.id },
            data: { plannedQty: Number(overrides[line.materialId]) },
          });
        }
      }
    }

    if (body.measurements) {
      const measurements: Measurements = {
        length: Number(body.measurements.length) || 0,
        height: Number(body.measurements.height) || 0,
        thickness:
          body.measurements.thickness != null ? Number(body.measurements.thickness) : undefined,
        openingsArea: Number(body.measurements.openingsArea) || 0,
        netArea:
          body.measurements.netArea != null ? Number(body.measurements.netArea) : undefined,
      };
      const netArea = netAreaFromMeasurements(measurements);
      measurements.netArea = netArea;

      const formulas = await prisma.materialFormula.findMany({
        where: {
          OR: [{ projectId: existing.projectId }, { projectId: null }],
          workType: existing.workType,
        },
      });
      const byMaterial = new Map<string, (typeof formulas)[0]>();
      for (const f of formulas) {
        if (f.projectId === existing.projectId) byMaterial.set(f.materialId, f);
        else if (!byMaterial.has(f.materialId)) byMaterial.set(f.materialId, f);
      }

      for (const line of existing.lines) {
        const f = byMaterial.get(line.materialId);
        if (!f) continue;
        const formulaQty = formulaQtyForRate(netArea, f.ratePerSqFt);
        await prisma.materialEstimateLine.update({
          where: { id: line.id },
          data: {
            formulaQty,
            plannedQty:
              body.keepPlanned === true ? line.plannedQty : formulaQty,
          },
        });
      }

      await prisma.materialEstimate.update({
        where: { id },
        data: {
          measurements,
          notes: body.notes ?? existing.notes,
          status: body.status ?? existing.status,
          unitId: body.unitId !== undefined ? body.unitId || null : existing.unitId,
        },
      });
    } else {
      await prisma.materialEstimate.update({
        where: { id },
        data: {
          notes: body.notes ?? existing.notes,
          status: body.status ?? existing.status,
          unitId: body.unitId !== undefined ? body.unitId || null : existing.unitId,
        },
      });
    }

    const updated = await prisma.materialEstimate.findUnique({
      where: { id },
      include: { lines: true },
    });
    await writeAudit({
      userId: user.id,
      userName: user.name,
      action: 'update',
      entityType: 'material_estimate',
      entityId: id,
    });
    return json({ estimate: mapMaterialEstimate(updated!) });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireUser();
    if (!hasCapability(user.role as UserRole, 'manage_material_plans')) {
      return json({ error: 'Forbidden' }, 403);
    }
    const { id } = await ctx.params;
    await prisma.materialEstimate.delete({ where: { id } });
    await writeAudit({
      userId: user.id,
      userName: user.name,
      action: 'delete',
      entityType: 'material_estimate',
      entityId: id,
    });
    return json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
