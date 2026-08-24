import { clearSessionCookie } from '@/lib/auth';
import { json, handleApiError } from '@/lib/api-helpers';

export async function POST() {
  try {
    await clearSessionCookie();
    return json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
