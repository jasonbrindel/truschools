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

// GET - Get a single note
export const GET: APIRoute = async ({ params, request, locals }) => {
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

    const note = await db.prepare(
      'SELECT * FROM notes WHERE id = ?'
    ).bind(id).first();

    if (!note) {
      return new Response(JSON.stringify({ error: 'Note not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      note
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error fetching note:', error);
    await captureException(db, error, {
      tags: { endpoint: '/admin/api/notes/[id]', method: 'GET' },
      extra: { id },
      request
    });
    return new Response(JSON.stringify({ error: 'Failed to fetch note' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// PATCH - Update a note
export const PATCH: APIRoute = async ({ params, request, locals }) => {
  const db = (locals as any).runtime?.env?.DB;
  const { id } = params;
  let body: any;

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

    body = await request.json();
    const { title, content } = body;

    if (!title && !content) {
      return new Response(JSON.stringify({ error: 'At least one field (title or content) is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Build update query dynamically
    const updates: string[] = [];
    const values: any[] = [];

    if (title !== undefined) {
      updates.push('title = ?');
      values.push(title);
    }
    if (content !== undefined) {
      updates.push('content = ?');
      values.push(content);
    }
    updates.push("updated_at = datetime('now')");
    values.push(id);

    await db.prepare(`
      UPDATE notes SET ${updates.join(', ')} WHERE id = ?
    `).bind(...values).run();

    return new Response(JSON.stringify({
      success: true,
      message: 'Note updated successfully'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error updating note:', error);
    await captureException(db, error, {
      tags: { endpoint: '/admin/api/notes/[id]', method: 'PATCH' },
      extra: { id },
      request
    });
    return new Response(JSON.stringify({ error: 'Failed to update note' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// DELETE - Delete a note
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

    await db.prepare('DELETE FROM notes WHERE id = ?').bind(id).run();

    return new Response(JSON.stringify({
      success: true,
      message: 'Note deleted successfully'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error deleting note:', error);
    await captureException(db, error, {
      tags: { endpoint: '/admin/api/notes/[id]', method: 'DELETE' },
      extra: { id },
      request
    });
    return new Response(JSON.stringify({ error: 'Failed to delete note' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
