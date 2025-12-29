import type { APIRoute } from 'astro';
import { captureException } from '@/lib/error-logger';

// Helper to check if user is authenticated
async function isAuthenticated(request: Request, db: any): Promise<boolean> {
  const cookies = request.headers.get('cookie') || '';
  const sessionMatch = cookies.match(/session=([^;]+)/);
  const sessionToken = sessionMatch ? sessionMatch[1] : null;

  if (!sessionToken) return false;

  try {
    const session = await db.prepare(`
      SELECT s.*, u.id as user_id
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.token = ? AND s.expires_at > datetime('now')
    `).bind(sessionToken).first();

    return !!session;
  } catch (e) {
    return false;
  }
}

// PATCH - Archive/unarchive a saved prompt
export const PATCH: APIRoute = async ({ params, request, locals }) => {
  const db = (locals as any).runtime?.env?.DB;
  const { id } = params;

  try {
    if (!db) {
      return new Response(JSON.stringify({ error: 'Database connection failed' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check authentication
    if (!await isAuthenticated(request, db)) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = await request.json();
    const { archived } = body;

    if (typeof archived !== 'number' && typeof archived !== 'boolean') {
      return new Response(JSON.stringify({ error: 'Missing required field: archived' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const archivedValue = archived ? 1 : 0;

    const result = await db.prepare(
      'UPDATE saved_prompts SET archived = ? WHERE id = ?'
    ).bind(archivedValue, id).run();

    if (result.meta.changes === 0) {
      return new Response(JSON.stringify({ error: 'Saved prompt not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      message: archived ? 'Prompt archived successfully' : 'Prompt unarchived successfully'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error updating saved prompt:', error);
    await captureException(db, error, {
      tags: { endpoint: '/admin/api/saved-prompts/[id]', method: 'PATCH' },
      extra: { id },
      request
    });
    return new Response(JSON.stringify({ error: 'Failed to update saved prompt' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// DELETE - Delete a saved prompt
export const DELETE: APIRoute = async ({ params, request, locals }) => {
  const db = (locals as any).runtime?.env?.DB;
  const { id } = params;

  try {
    if (!db) {
      return new Response(JSON.stringify({ error: 'Database connection failed' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check authentication
    if (!await isAuthenticated(request, db)) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const result = await db.prepare(
      'DELETE FROM saved_prompts WHERE id = ?'
    ).bind(id).run();

    if (result.meta.changes === 0) {
      return new Response(JSON.stringify({ error: 'Saved prompt not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Saved prompt deleted successfully'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error deleting saved prompt:', error);
    await captureException(db, error, {
      tags: { endpoint: '/admin/api/saved-prompts/[id]', method: 'DELETE' },
      extra: { id },
      request
    });
    return new Response(JSON.stringify({ error: 'Failed to delete saved prompt' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
