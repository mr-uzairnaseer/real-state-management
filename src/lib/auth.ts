import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { prisma } from './db';
import type { UserRole } from './types';

const COOKIE = 'estate_session';

function secret() {
  const s = process.env.JWT_SECRET || 'dev-only-insecure-secret-change-me';
  return new TextEncoder().encode(s);
}

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  assignedProjectIds: string[];
  avatarColor: string;
};

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createSessionToken(user: SessionUser) {
  return new SignJWT({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    assignedProjectIds: user.assignedProjectIds,
    avatarColor: user.avatarColor,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret());
}

export async function setSessionCookie(token: string) {
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return {
      id: String(payload.id),
      name: String(payload.name),
      email: String(payload.email),
      role: payload.role as UserRole,
      assignedProjectIds: (payload.assignedProjectIds as string[]) ?? [],
      avatarColor: String(payload.avatarColor ?? '#3e63dd'),
    };
  } catch {
    return null;
  }
}

export async function requireUser() {
  const user = await getSessionUser();
  if (!user) throw new AuthError('Unauthorized');
  return user;
}

export async function requireRole(...roles: UserRole[]) {
  const user = await requireUser();
  if (user.role === 'admin') return user;
  if (!roles.includes(user.role)) throw new AuthError('Forbidden', 403);
  return user;
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}

export async function toPublicUser(id: string) {
  const u = await prisma.user.findUnique({ where: { id } });
  if (!u) return null;
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role as UserRole,
    assignedProjectIds: u.assignedProjectIds,
    avatarColor: u.avatarColor,
    createdAt: u.createdAt.toISOString(),
    password: '',
  };
}

export async function writeAudit(input: {
  userId: string;
  userName: string;
  action: string;
  entityType: string;
  entityId: string;
  field?: string;
  previousValue?: string;
  newValue?: string;
}) {
  await prisma.auditEntry.create({ data: input });
}
