import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { json, handleApiError } from '@/lib/api-helpers';
import { mapUser } from '@/lib/mappers';

export async function GET() {
  try {
    const session = await getSessionUser();
    if (!session) return json({ user: null }, 401);
    const user = await prisma.user.findUnique({ where: { id: session.id } });
    if (!user) return json({ user: null }, 401);
    return json({ user: mapUser(user) });
  } catch (err) {
    return handleApiError(err);
  }
}
