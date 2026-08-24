import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import {
  createSessionToken,
  setSessionCookie,
  verifyPassword,
  type SessionUser,
} from '@/lib/auth';
import { json, handleApiError } from '@/lib/api-helpers';
import { mapUser } from '@/lib/mappers';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const user = await prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
    });
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return json({ error: 'Invalid email or password' }, 401);
    }
    const session: SessionUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role as SessionUser['role'],
      assignedProjectIds: user.assignedProjectIds,
      avatarColor: user.avatarColor,
    };
    const token = await createSessionToken(session);
    await setSessionCookie(token);
    return json({ user: mapUser(user) });
  } catch (err) {
    return handleApiError(err);
  }
}
