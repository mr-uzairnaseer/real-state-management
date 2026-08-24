import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { json, handleApiError } from '@/lib/api-helpers';

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    if (user.role === 'accountant') return json({ error: 'Forbidden' }, 403);
    const body = await req.json();
    const update = await prisma.progressUpdate.create({
      data: {
        projectId: body.projectId,
        unitId: body.unitId || null,
        taskId: body.taskId || null,
        title: body.title,
        comment: body.comment ?? '',
        progressPercentage: Number(body.progressPercentage) || 0,
        workCategory: body.workCategory ?? '',
        managerId: user.id,
        managerName: user.name,
        mediaIds: body.mediaIds ?? [],
      },
    });
    await prisma.notification.create({
      data: {
        type: 'construction_update',
        title: 'Progress Update',
        message: update.title,
        projectId: update.projectId,
        unitId: update.unitId,
      },
    });
    return json({
      update: {
        ...update,
        unitId: update.unitId ?? undefined,
        taskId: update.taskId ?? undefined,
        createdAt: update.createdAt.toISOString(),
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
