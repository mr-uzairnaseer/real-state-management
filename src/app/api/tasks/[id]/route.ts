import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireUser, writeAudit } from '@/lib/auth';
import { json, handleApiError } from '@/lib/api-helpers';
import { mapTask, recalculateUnitAndGrey } from '@/lib/mappers';

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireUser();
    if (user.role === 'accountant') return json({ error: 'Forbidden' }, 403);
    const { id } = await ctx.params;
    const body = await req.json();
    const prev = await prisma.constructionTask.findUnique({ where: { id } });
    if (!prev) return json({ error: 'Not found' }, 404);

    let progress = body.progress !== undefined ? Number(body.progress) : prev.progress;
    progress = Math.min(100, Math.max(0, progress));
    const status =
      body.status ??
      (progress >= 100 ? 'completed' : progress > 0 ? 'in_progress' : 'not_started');

    const task = await prisma.constructionTask.update({
      where: { id },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.weight !== undefined ? { weight: Number(body.weight) } : {}),
        progress,
        status,
        ...(body.comments !== undefined ? { comments: body.comments } : {}),
        ...(body.order !== undefined ? { order: Number(body.order) } : {}),
        ...(body.startDate !== undefined
          ? { startDate: body.startDate ? new Date(body.startDate) : null }
          : {}),
        ...(body.expectedCompletionDate !== undefined
          ? {
              expectedCompletionDate: body.expectedCompletionDate
                ? new Date(body.expectedCompletionDate)
                : null,
            }
          : {}),
      },
    });

    await recalculateUnitAndGrey(task.projectId, task.unitId ?? undefined);

    if (body.progress !== undefined && body.progress !== prev.progress) {
      await writeAudit({
        userId: user.id,
        userName: user.name,
        action: 'update',
        entityType: 'task',
        entityId: id,
        field: 'progress',
        previousValue: String(prev.progress),
        newValue: String(progress),
      });
      await prisma.notification.create({
        data: {
          type: 'construction_update',
          title: 'Construction Update',
          message: `${task.name} progress set to ${progress}%`,
          projectId: task.projectId,
          unitId: task.unitId,
        },
      });
    }

    return json({ task: mapTask(task) });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireUser();
    if (user.role !== 'admin') return json({ error: 'Forbidden' }, 403);
    const { id } = await ctx.params;
    const prev = await prisma.constructionTask.findUnique({ where: { id } });
    await prisma.constructionTask.delete({ where: { id } });
    if (prev) await recalculateUnitAndGrey(prev.projectId, prev.unitId ?? undefined);
    return json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
