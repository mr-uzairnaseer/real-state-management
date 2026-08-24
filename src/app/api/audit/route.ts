import { requireRole } from '@/lib/auth';
import { json, handleApiError } from '@/lib/api-helpers';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    await requireRole('admin');
    const auditLog = await prisma.auditEntry.findMany({
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
    return json({
      auditLog: auditLog.map((a) => ({
        ...a,
        field: a.field ?? undefined,
        previousValue: a.previousValue ?? undefined,
        newValue: a.newValue ?? undefined,
        createdAt: a.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    return handleApiError(err);
  }
}
