import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { json, handleApiError } from '@/lib/api-helpers';

export async function PUT(req: NextRequest) {
  try {
    await requireUser();
    const body = await req.json();
    const meta = await prisma.appMeta.upsert({
      where: { id: 'singleton' },
      create: { id: 'singleton', selectedProjectId: body.selectedProjectId ?? null },
      update: { selectedProjectId: body.selectedProjectId ?? null },
    });
    return json({ selectedProjectId: meta.selectedProjectId });
  } catch (err) {
    return handleApiError(err);
  }
}
