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

// GET - List all notes
export const GET: APIRoute = async ({ request, locals }) => {
  const db = (locals as any).runtime?.env?.DB;

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

    const results = await db.prepare(
      'SELECT * FROM notes ORDER BY updated_at DESC'
    ).all();

    return new Response(JSON.stringify({
      success: true,
      notes: results.results || []
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error fetching notes:', error);
    await captureException(db, error, {
      tags: { endpoint: '/admin/api/notes', method: 'GET' },
      request
    });
    return new Response(JSON.stringify({ error: 'Failed to fetch notes' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// POST - Create a new note
export const POST: APIRoute = async ({ request, locals }) => {
  const db = (locals as any).runtime?.env?.DB;
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

    if (!title || !content) {
      return new Response(JSON.stringify({ error: 'Missing required fields: title, content' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const result = await db.prepare(`
      INSERT INTO notes (title, content)
      VALUES (?, ?)
    `).bind(title, content).run();

    return new Response(JSON.stringify({
      success: true,
      message: 'Note created successfully',
      id: result.meta.last_row_id
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error creating note:', error);
    await captureException(db, error, {
      tags: { endpoint: '/admin/api/notes', method: 'POST' },
      extra: { title: body?.title },
      request
    });
    return new Response(JSON.stringify({ error: 'Failed to create note' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
