import { getSessionUser } from '@/lib/auth';
import { loadBootstrap } from '@/lib/mappers';
import { json, handleApiError } from '@/lib/api-helpers';

export async function GET() {
  try {
    const session = await getSessionUser();
    if (!session) return json({ error: 'Unauthorized' }, 401);
    const data = await loadBootstrap(session.id);
    return json(data);
  } catch (err) {
    return handleApiError(err);
  }
}
