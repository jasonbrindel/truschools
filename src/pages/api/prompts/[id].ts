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

// GET - Get single prompt by ID or slug
export const GET: APIRoute = async ({ params, request, locals }) => {
  const db = (locals as any).runtime?.env?.DB;

  try {
    if (!db) {
      return new Response(JSON.stringify({ error: 'Database connection failed' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { id } = params;

    // Check if id is numeric or a slug
    const isNumeric = /^\d+$/.test(id || '');
    const query = isNumeric
      ? 'SELECT * FROM prompts WHERE id = ?'
      : 'SELECT * FROM prompts WHERE slug = ?';

    const prompt = await db.prepare(query).bind(id).first();

    if (!prompt) {
      return new Response(JSON.stringify({ error: 'Prompt not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      prompt
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error fetching prompt:', error);
    await captureException(db, error, {
      tags: { endpoint: '/api/prompts/[id]', method: 'GET' },
      extra: { id: params.id },
      request
    });
    return new Response(JSON.stringify({ error: 'Failed to fetch prompt' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// PUT - Update prompt
export const PUT: APIRoute = async ({ params, request, locals }) => {
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

    const { id } = params;
    body = await request.json();
    const { slug, name, description, prompt_template, sort_order, is_active } = body;

    if (!slug || !name || !prompt_template) {
      return new Response(JSON.stringify({ error: 'Missing required fields: slug, name, prompt_template' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if id is numeric or a slug
    const isNumeric = /^\d+$/.test(id || '');
    const whereClause = isNumeric ? 'id = ?' : 'slug = ?';

    const result = await db.prepare(`
      UPDATE prompts
      SET slug = ?, name = ?, description = ?, prompt_template = ?, sort_order = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
      WHERE ${whereClause}
    `).bind(
      slug,
      name,
      description || '',
      prompt_template,
      sort_order || 0,
      is_active !== undefined ? (is_active ? 1 : 0) : 1,
      id
    ).run();

    if (result.meta.changes === 0) {
      return new Response(JSON.stringify({ error: 'Prompt not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Prompt updated successfully'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Error updating prompt:', error);
    if (error.message?.includes('UNIQUE constraint failed')) {
      return new Response(JSON.stringify({ error: 'A prompt with this slug already exists' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    await captureException(db, error, {
      tags: { endpoint: '/api/prompts/[id]', method: 'PUT' },
      extra: { id: params.id },
      request
    });
    return new Response(JSON.stringify({ error: 'Failed to update prompt' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// DELETE - Delete prompt
export const DELETE: APIRoute = async ({ params, request, locals }) => {
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

    const { id } = params;

    // Check if id is numeric or a slug
    const isNumeric = /^\d+$/.test(id || '');
    const query = isNumeric
      ? 'DELETE FROM prompts WHERE id = ?'
      : 'DELETE FROM prompts WHERE slug = ?';

    const result = await db.prepare(query).bind(id).run();

    if (result.meta.changes === 0) {
      return new Response(JSON.stringify({ error: 'Prompt not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Prompt deleted successfully'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error deleting prompt:', error);
    await captureException(db, error, {
      tags: { endpoint: '/api/prompts/[id]', method: 'DELETE' },
      extra: { id: params.id },
      request
    });
    return new Response(JSON.stringify({ error: 'Failed to delete prompt' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
