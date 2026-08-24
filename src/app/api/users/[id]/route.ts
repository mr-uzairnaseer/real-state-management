import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRole, hashPassword } from '@/lib/auth';
import { json, handleApiError } from '@/lib/api-helpers';
import { mapUser } from '@/lib/mappers';

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    await requireRole('admin');
    const { id } = await ctx.params;
    const body = await req.json();
    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.email !== undefined ? { email: body.email } : {}),
        ...(body.role !== undefined ? { role: body.role } : {}),
        ...(body.assignedProjectIds !== undefined
          ? { assignedProjectIds: body.assignedProjectIds }
          : {}),
        ...(body.avatarColor !== undefined ? { avatarColor: body.avatarColor } : {}),
        ...(body.password ? { passwordHash: await hashPassword(body.password) } : {}),
      },
    });
    return json({ user: mapUser(user) });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  try {
    const actor = await requireRole('admin');
    const { id } = await ctx.params;
    if (id === actor.id) return json({ error: 'Cannot delete yourself' }, 400);
    await prisma.user.delete({ where: { id } });
    return json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
