import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { json, handleApiError } from '@/lib/api-helpers';

export async function GET() {
  try {
    await requireUser();
    const reports = await prisma.managerReport.findMany({ orderBy: { createdAt: 'desc' } });
    return json({
      reports: reports.map((r) => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    if (user.role === 'accountant') return json({ error: 'Forbidden' }, 403);
    const body = await req.json();
    const report = await prisma.managerReport.create({
      data: {
        projectId: body.projectId,
        managerId: user.id,
        managerName: user.name,
        period: body.period ?? 'daily',
        title: body.title,
        completedWork: body.completedWork ?? '',
        pendingWork: body.pendingWork ?? '',
        notes: body.notes ?? '',
      },
    });
    await prisma.notification.create({
      data: {
        type: 'manager_report',
        title: 'Manager Report Submitted',
        message: `${user.name}: ${report.title}`,
        projectId: report.projectId,
      },
    });
    return json({
      report: { ...report, createdAt: report.createdAt.toISOString() },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
