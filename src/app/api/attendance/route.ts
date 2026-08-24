import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireUser, writeAudit } from '@/lib/auth';
import { json, handleApiError } from '@/lib/api-helpers';
import { mapAttendance } from '@/lib/mappers';

export async function GET(req: NextRequest) {
  try {
    await requireUser();
    const projectId = req.nextUrl.searchParams.get('projectId');
    const rows = await prisma.attendance.findMany({
      where: projectId ? { projectId } : undefined,
      orderBy: { date: 'desc' },
    });
    return json({ attendance: rows.map(mapAttendance) });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    if (user.role === 'accountant') return json({ error: 'Forbidden' }, 403);
    const body = await req.json();
    const present = Number(body.present) || 0;
    const absent = Number(body.absent) || 0;
    const totalWorkers = Number(body.totalWorkers) || present + absent;
    const row = await prisma.attendance.create({
      data: {
        projectId: body.projectId,
        date: body.date ? new Date(body.date) : new Date(),
        totalWorkers,
        present,
        absent,
        category: body.category || 'General labour',
        remarks: body.remarks ?? '',
        addedById: user.id,
        addedByName: user.name,
      },
    });
    await prisma.notification.create({
      data: {
        type: 'attendance_update',
        title: 'Site Attendance',
        message: `${row.present}/${row.totalWorkers} present (${row.category})`,
        projectId: row.projectId,
      },
    });
    await writeAudit({
      userId: user.id,
      userName: user.name,
      action: 'create',
      entityType: 'attendance',
      entityId: row.id,
      newValue: `${row.present}/${row.totalWorkers}`,
    });
    return json({ attendance: mapAttendance(row) });
  } catch (err) {
    return handleApiError(err);
  }
}
