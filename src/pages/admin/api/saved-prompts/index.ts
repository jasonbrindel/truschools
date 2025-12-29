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

// GET - List all saved prompts
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
      'SELECT * FROM saved_prompts ORDER BY created_at DESC'
    ).all();

    return new Response(JSON.stringify({
      success: true,
      prompts: results.results || []
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error fetching saved prompts:', error);
    await captureException(db, error, {
      tags: { endpoint: '/admin/api/saved-prompts', method: 'GET' },
      request
    });
    return new Response(JSON.stringify({ error: 'Failed to fetch saved prompts' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// POST - Save a new prompt
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
    const { topic, style_name, full_prompt } = body;

    if (!topic || !style_name || !full_prompt) {
      return new Response(JSON.stringify({ error: 'Missing required fields: topic, style_name, full_prompt' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    await db.prepare(`
      INSERT INTO saved_prompts (topic, style_name, full_prompt)
      VALUES (?, ?, ?)
    `).bind(topic, style_name, full_prompt).run();

    return new Response(JSON.stringify({
      success: true,
      message: 'Prompt saved successfully'
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error saving prompt:', error);
    await captureException(db, error, {
      tags: { endpoint: '/admin/api/saved-prompts', method: 'POST' },
      extra: { topic: body?.topic },
      request
    });
    return new Response(JSON.stringify({ error: 'Failed to save prompt' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
