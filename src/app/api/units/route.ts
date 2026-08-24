import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireUser, writeAudit } from '@/lib/auth';
import { json, handleApiError } from '@/lib/api-helpers';
import { mapUnit } from '@/lib/mappers';

export async function GET(req: NextRequest) {
  try {
    await requireUser();
    const projectId = req.nextUrl.searchParams.get('projectId');
    const units = await prisma.unit.findMany({
      where: projectId ? { projectId } : undefined,
      orderBy: { number: 'asc' },
    });
    return json({ units: units.map(mapUnit) });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    if (user.role === 'accountant') return json({ error: 'Forbidden' }, 403);
    const body = await req.json();
    const unit = await prisma.unit.create({
      data: {
        projectId: body.projectId,
        number: body.number,
        type: body.type ?? 'shop',
        size: body.size ?? '',
        floor: body.floor ?? '',
        status: body.status ?? 'under_construction',
        salePrice: Number(body.salePrice) || 0,
        rentalPrice: Number(body.rentalPrice) || 0,
        constructionProgress: Number(body.constructionProgress) || 0,
        notes: body.notes ?? '',
        documents: [],
      },
    });
    const project = await prisma.project.findUnique({ where: { id: body.projectId } });
    const stages = (project?.stageTemplates as { name: string; weight: number; order: number }[]) ?? [];
    if (stages.length) {
      await prisma.constructionTask.createMany({
        data: stages.map((st) => ({
          projectId: body.projectId,
          unitId: unit.id,
          name: st.name,
          weight: st.weight,
          progress: 0,
          status: 'not_started',
          comments: '',
          order: st.order,
        })),
      });
    }
    await writeAudit({
      userId: user.id,
      userName: user.name,
      action: 'create',
      entityType: 'unit',
      entityId: unit.id,
      newValue: unit.number,
    });
    return json({ unit: mapUnit(unit) });
  } catch (err) {
    return handleApiError(err);
  }
}
