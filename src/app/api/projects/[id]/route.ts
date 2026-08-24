import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireUser, requireRole, writeAudit } from '@/lib/auth';
import { json, handleApiError } from '@/lib/api-helpers';
import { mapProject } from '@/lib/mappers';

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireRole('admin');
    const { id } = await ctx.params;
    const body = await req.json();
    const prev = await prisma.project.findUnique({ where: { id } });
    const project = await prisma.project.update({
      where: { id },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.type !== undefined ? { type: body.type } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.location !== undefined ? { location: body.location } : {}),
        ...(body.status !== undefined ? { status: body.status } : {}),
        ...(body.totalBudget !== undefined ? { totalBudget: Number(body.totalBudget) } : {}),
        ...(body.timelineNotes !== undefined ? { timelineNotes: body.timelineNotes } : {}),
        ...(body.managerIds !== undefined ? { managerIds: body.managerIds } : {}),
        ...(body.stageTemplates !== undefined ? { stageTemplates: body.stageTemplates } : {}),
        ...(body.expectedEndDate !== undefined
          ? { expectedEndDate: body.expectedEndDate ? new Date(body.expectedEndDate) : null }
          : {}),
      },
    });
    await writeAudit({
      userId: user.id,
      userName: user.name,
      action: 'update',
      entityType: 'project',
      entityId: id,
      previousValue: prev?.name,
      newValue: JSON.stringify(body),
    });
    return json({ project: mapProject(project) });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireRole('admin');
    const { id } = await ctx.params;
    await prisma.project.delete({ where: { id } });
    await writeAudit({
      userId: user.id,
      userName: user.name,
      action: 'delete',
      entityType: 'project',
      entityId: id,
    });
    return json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    await requireUser();
    const { id } = await ctx.params;
    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) return json({ error: 'Not found' }, 404);
    return json({ project: mapProject(project) });
  } catch (err) {
    return handleApiError(err);
  }
}
