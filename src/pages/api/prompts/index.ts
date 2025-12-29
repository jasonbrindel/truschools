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

// GET - List all prompts
export const GET: APIRoute = async ({ request, locals }) => {
  const db = (locals as any).runtime?.env?.DB;

  try {
    if (!db) {
      return new Response(JSON.stringify({ error: 'Database connection failed' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const url = new URL(request.url);
    const activeOnly = url.searchParams.get('active') === 'true';

    let query = 'SELECT * FROM prompts';
    if (activeOnly) {
      query += ' WHERE is_active = 1';
    }
    query += ' ORDER BY sort_order ASC, name ASC';

    const results = await db.prepare(query).all();

    return new Response(JSON.stringify({
      success: true,
      prompts: results.results || []
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error fetching prompts:', error);
    await captureException(db, error, {
      tags: { endpoint: '/api/prompts', method: 'GET' },
      request
    });
    return new Response(JSON.stringify({ error: 'Failed to fetch prompts' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// POST - Create new prompt
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
    const { slug, name, description, prompt_template, sort_order, is_active } = body;

    if (!slug || !name || !prompt_template) {
      return new Response(JSON.stringify({ error: 'Missing required fields: slug, name, prompt_template' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    await db.prepare(`
      INSERT INTO prompts (slug, name, description, prompt_template, sort_order, is_active)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      slug,
      name,
      description || '',
      prompt_template,
      sort_order || 0,
      is_active !== undefined ? (is_active ? 1 : 0) : 1
    ).run();

    return new Response(JSON.stringify({
      success: true,
      message: 'Prompt created successfully'
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Error creating prompt:', error);
    if (error.message?.includes('UNIQUE constraint failed')) {
      return new Response(JSON.stringify({ error: 'A prompt with this slug already exists' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    await captureException(db, error, {
      tags: { endpoint: '/api/prompts', method: 'POST' },
      extra: { slug: body?.slug },
      request
    });
    return new Response(JSON.stringify({ error: 'Failed to create prompt' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
