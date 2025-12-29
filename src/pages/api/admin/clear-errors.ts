import type { APIRoute } from 'astro';
import { clearOldErrors } from '@/lib/error-logger';

export const POST: APIRoute = async ({ request, locals }) => {
  const db = (locals as any).runtime?.env?.DB;

  // Check authentication
  const cookies = request.headers.get('cookie') || '';
  const sessionMatch = cookies.match(/session=([^;]+)/);
  const sessionToken = sessionMatch ? sessionMatch[1] : null;

  if (!sessionToken || !db) {
    return new Response(null, {
      status: 302,
      headers: { 'Location': '/login' }
    });
  }

  const session = await db.prepare(`
    SELECT s.*, u.id as user_id
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.token = ? AND s.expires_at > datetime('now')
  `).bind(sessionToken).first();

  if (!session) {
    return new Response(null, {
      status: 302,
      headers: { 'Location': '/login' }
    });
  }

  // Clear errors older than 30 days
  const deleted = await clearOldErrors(db, 30);
  console.log(`Cleared ${deleted} old errors`);

  return new Response(null, {
    status: 302,
    headers: { 'Location': '/admin/errors' }
  });
};
