import type { APIRoute } from 'astro';
import { captureException } from '@/lib/error-logger';

export const GET: APIRoute = async ({ request, locals }) => {
  const db = (locals as any).runtime?.env?.DB;

  try {
    // Get session cookie
    const cookies = request.headers.get('cookie') || '';
    const sessionMatch = cookies.match(/session=([^;]+)/);
    const sessionToken = sessionMatch ? sessionMatch[1] : null;

    if (!sessionToken) {
      return new Response(JSON.stringify({
        authenticated: false
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get database connection
    if (!db) {
      return new Response(JSON.stringify({
        authenticated: false,
        error: 'Database connection failed'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Find session and user
    const session = await db.prepare(`
      SELECT s.*, u.id as user_id, u.email, u.name
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.token = ? AND s.expires_at > datetime('now')
    `).bind(sessionToken).first();

    if (!session) {
      return new Response(JSON.stringify({
        authenticated: false
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      authenticated: true,
      user: {
        id: session.user_id,
        email: session.email,
        name: session.name
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Session check error:', error);
    await captureException(db, error, {
      tags: { endpoint: '/api/auth/session', method: 'GET' },
      request
    });
    return new Response(JSON.stringify({
      authenticated: false,
      error: 'An error occurred'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
