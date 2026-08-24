import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { json, handleApiError } from '@/lib/api-helpers';
import { seedDatabase } from '@/lib/seed-db';

export async function POST() {
  try {
    await requireRole('admin');
    await seedDatabase(prisma, { force: true });
    return json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
