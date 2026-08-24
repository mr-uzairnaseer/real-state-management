import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { json, handleApiError } from '@/lib/api-helpers';
import { mapProject } from '@/lib/mappers';

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireUser();
    if (user.role === 'accountant') return json({ error: 'Forbidden' }, 403);
    const { id } = await ctx.params;
    const body = await req.json();
    const prev = await prisma.project.findUnique({ where: { id } });
    if (!prev) return json({ error: 'Not found' }, 404);
    const gs = { ...(prev.greyStructure as object), ...body, projectId: id };
    const project = await prisma.project.update({
      where: { id },
      data: { greyStructure: gs },
    });
    return json({ project: mapProject(project) });
  } catch (err) {
    return handleApiError(err);
  }
}
