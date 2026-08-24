import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRole, hashPassword, writeAudit } from '@/lib/auth';
import { json, handleApiError } from '@/lib/api-helpers';
import { mapUser } from '@/lib/mappers';

export async function GET() {
  try {
    await requireRole('admin');
    const users = await prisma.user.findMany({ orderBy: { createdAt: 'asc' } });
    return json({ users: users.map(mapUser) });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const actor = await requireRole('admin');
    const body = await req.json();
    const user = await prisma.user.create({
      data: {
        name: body.name,
        email: body.email,
        passwordHash: await hashPassword(body.password || 'changeme'),
        role: body.role || 'manager',
        assignedProjectIds: body.assignedProjectIds ?? [],
        avatarColor: body.avatarColor || '#3e63dd',
      },
    });
    await writeAudit({
      userId: actor.id,
      userName: actor.name,
      action: 'create',
      entityType: 'user',
      entityId: user.id,
      newValue: user.email,
    });
    return json({ user: mapUser(user) });
  } catch (err) {
    return handleApiError(err);
  }
}
