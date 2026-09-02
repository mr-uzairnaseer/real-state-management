import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireUser, writeAudit } from '@/lib/auth';
import { json, handleApiError } from '@/lib/api-helpers';
import { mapMaterialConsumption } from '@/lib/mappers';
import { hasCapability } from '@/lib/access';
import type { UserRole } from '@/lib/types';
import {
  formulaExpectedForProgress,
  isVarianceFlagged,
  netAreaFromMeasurements,
  variancePct,
  type Measurements,
} from '@/lib/material-calc';
import { saveDataUrl } from '@/lib/uploads';

export async function GET(req: NextRequest) {
  try {
    await requireUser();
    const projectId = req.nextUrl.searchParams.get('projectId');
    const rows = await prisma.materialConsumption.findMany({
      where: projectId ? { projectId } : undefined,
      orderBy: { createdAt: 'desc' },
    });
    return json({ consumptions: rows.map(mapMaterialConsumption) });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    if (!hasCapability(user.role as UserRole, 'record_material_usage')) {
      return json({ error: 'Forbidden' }, 403);
    }
    const body = await req.json();
    const projectId = body.projectId as string;
    const materialId = body.materialId as string;
    const actualQty = Number(body.actualQty);
    if (!projectId || !materialId || !(actualQty >= 0)) {
      return json({ error: 'projectId, materialId, actualQty required' }, 400);
    }

    let formulaQty = 0;
    let netArea = 0;
    let estimateId: string | null = body.estimateId || null;

    if (estimateId) {
      const estimate = await prisma.materialEstimate.findUnique({
        where: { id: estimateId },
        include: { lines: true },
      });
      if (estimate) {
        const line = estimate.lines.find((l) => l.materialId === materialId);
        formulaQty = line?.formulaQty ?? 0;
        netArea = netAreaFromMeasurements(estimate.measurements as Measurements);
      }
    } else if (body.unitId) {
      const estimate = await prisma.materialEstimate.findFirst({
        where: {
          projectId,
          unitId: body.unitId,
          status: 'active',
          lines: { some: { materialId } },
        },
        include: { lines: true },
        orderBy: { createdAt: 'desc' },
      });
      if (estimate) {
        estimateId = estimate.id;
        const line = estimate.lines.find((l) => l.materialId === materialId);
        formulaQty = line?.formulaQty ?? 0;
        netArea = netAreaFromMeasurements(estimate.measurements as Measurements);
      }
    }

    const workDoneArea = Number(body.workDoneArea) || 0;
    const progressPct = Number(body.progressPct) || 0;
    const formulaExpectedQty = formulaExpectedForProgress(formulaQty, {
      workDoneArea,
      netArea,
      progressPct: progressPct || undefined,
    });
    const vp = variancePct(actualQty, formulaExpectedQty);
    const flagged = isVarianceFlagged(actualQty, formulaExpectedQty);

    const mediaIds: string[] = [...(body.mediaIds ?? [])];
    if (body.photoDataUrl) {
      const saved = await saveDataUrl(body.photoDataUrl, body.photoName || 'usage.jpg');
      const media = await prisma.mediaItem.create({
        data: {
          projectId,
          unitId: body.unitId || null,
          kind: 'during',
          url: saved.url,
          mimeType: saved.mimeType,
          fileName: saved.fileName,
          comment: body.remarks || 'Material usage evidence',
          workCategory: 'materials',
          managerId: user.id,
          managerName: user.name,
        },
      });
      mediaIds.push(media.id);
    }

    const row = await prisma.materialConsumption.create({
      data: {
        projectId,
        unitId: body.unitId || null,
        materialId,
        estimateId,
        workDoneArea,
        progressPct,
        actualQty,
        formulaExpectedQty,
        variancePct: vp,
        flagged,
        remarks: body.remarks ?? '',
        mediaIds,
        reportedById: user.id,
        reportedByName: user.name,
      },
    });

    if (flagged) {
      await prisma.notification.create({
        data: {
          type: 'material_variance',
          title: 'Material usage variance',
          message: `${user.name} reported ${actualQty} vs expected ${formulaExpectedQty} (${vp}%)`,
          projectId,
          unitId: body.unitId || null,
        },
      });
    }

    await writeAudit({
      userId: user.id,
      userName: user.name,
      action: 'create',
      entityType: 'material_consumption',
      entityId: row.id,
      newValue: `qty=${actualQty} expected=${formulaExpectedQty} flagged=${flagged}`,
    });

    return json({ consumption: mapMaterialConsumption(row) });
  } catch (err) {
    return handleApiError(err);
  }
}
