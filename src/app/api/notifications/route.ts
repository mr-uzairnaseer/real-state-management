import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { json, handleApiError } from '@/lib/api-helpers';

export async function GET() {
  try {
    await requireUser();
    const notifications = await prisma.notification.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return json({
      notifications: notifications.map((n) => ({
        ...n,
        projectId: n.projectId ?? undefined,
        unitId: n.unitId ?? undefined,
        createdAt: n.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireUser();
    const body = await req.json();
    const n = await prisma.notification.create({
      data: {
        type: body.type ?? 'general',
        title: body.title,
        message: body.message,
        projectId: body.projectId || null,
        unitId: body.unitId || null,
        read: false,
      },
    });
    return json({
      notification: {
        ...n,
        projectId: n.projectId ?? undefined,
        unitId: n.unitId ?? undefined,
        createdAt: n.createdAt.toISOString(),
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await requireUser();
    const body = await req.json();
    if (body._action === 'readAll') {
      await prisma.notification.updateMany({ data: { read: true } });
      return json({ ok: true });
    }
    if (body.id) {
      await prisma.notification.update({ where: { id: body.id }, data: { read: true } });
      return json({ ok: true });
    }
    return json({ error: 'Bad request' }, 400);
  } catch (err) {
    return handleApiError(err);
  }
}
