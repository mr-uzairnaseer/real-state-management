import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { json, handleApiError } from '@/lib/api-helpers';
import { mapMedia } from '@/lib/mappers';
import { saveDataUrl } from '@/lib/uploads';

export async function GET(req: NextRequest) {
  try {
    await requireUser();
    const projectId = req.nextUrl.searchParams.get('projectId');
    const media = await prisma.mediaItem.findMany({
      where: projectId ? { projectId } : undefined,
      orderBy: { createdAt: 'desc' },
    });
    return json({ media: media.map(mapMedia) });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    if (user.role === 'accountant') return json({ error: 'Forbidden' }, 403);
    const body = await req.json();
    const saved = body.dataUrl
      ? await saveDataUrl(body.dataUrl, body.fileName || 'media')
      : { url: body.url, fileName: body.fileName || 'media', mimeType: body.mimeType || 'image/jpeg' };
    const media = await prisma.mediaItem.create({
      data: {
        projectId: body.projectId,
        unitId: body.unitId || null,
        taskId: body.taskId || null,
        kind: body.kind || 'other',
        url: saved.url,
        mimeType: saved.mimeType || body.mimeType || 'image/jpeg',
        fileName: saved.fileName,
        comment: body.comment ?? '',
        progressPercentage: Number(body.progressPercentage) || 0,
        workCategory: body.workCategory ?? '',
        managerName: user.name,
        managerId: user.id,
      },
    });
    return json({ media: mapMedia(media) });
  } catch (err) {
    return handleApiError(err);
  }
}
