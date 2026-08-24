import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireUser, writeAudit } from '@/lib/auth';
import { json, handleApiError } from '@/lib/api-helpers';
import { mapTask, recalculateUnitAndGrey } from '@/lib/mappers';

export async function GET(req: NextRequest) {
  try {
    await requireUser();
    const projectId = req.nextUrl.searchParams.get('projectId');
    const tasks = await prisma.constructionTask.findMany({
      where: projectId ? { projectId } : undefined,
      orderBy: { order: 'asc' },
    });
    return json({ tasks: tasks.map(mapTask) });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    if (user.role === 'accountant') return json({ error: 'Forbidden' }, 403);
    const body = await req.json();
    const task = await prisma.constructionTask.create({
      data: {
        projectId: body.projectId,
        unitId: body.unitId || null,
        name: body.name,
        weight: Number(body.weight) || 0,
        progress: Number(body.progress) || 0,
        status: body.status ?? 'not_started',
        comments: body.comments ?? '',
        order: Number(body.order) || 0,
        startDate: body.startDate ? new Date(body.startDate) : null,
        expectedCompletionDate: body.expectedCompletionDate
          ? new Date(body.expectedCompletionDate)
          : null,
      },
    });
    await recalculateUnitAndGrey(task.projectId, task.unitId ?? undefined);
    return json({ task: mapTask(task) });
  } catch (err) {
    return handleApiError(err);
  }
}
