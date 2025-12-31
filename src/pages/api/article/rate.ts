import type { APIRoute } from 'astro';
import { captureException } from '@/lib/error-logger';

// Hash IP address for privacy using Web Crypto API (Cloudflare compatible)
async function hashIP(ip: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(ip + 'truschools-article-rating-salt');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex.substring(0, 16);
}

// POST - Submit a helpful vote for an article
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

    body = await request.json();
    const { slug } = body;

    if (!slug) {
      return new Response(JSON.stringify({ error: 'Missing slug' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get IP for duplicate prevention
    const ip = request.headers.get('cf-connecting-ip') ||
               request.headers.get('x-forwarded-for')?.split(',')[0] ||
               'unknown';
    const ipHash = await hashIP(ip);

    // Check if this IP already voted on this article (using a separate votes tracking table)
    // First, ensure the article_rating_votes table exists for tracking individual votes
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS article_rating_votes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        slug TEXT NOT NULL,
        ip_hash TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(slug, ip_hash)
      )
    `).run();

    // Check for existing vote
    const existingVote = await db.prepare(`
      SELECT id FROM article_rating_votes WHERE slug = ? AND ip_hash = ?
    `).bind(slug, ipHash).first();

    if (existingVote) {
      // Already voted - return current count without incrementing
      const rating = await db.prepare(`
        SELECT helpful_count FROM article_ratings WHERE slug = ?
      `).bind(slug).first();

      return new Response(JSON.stringify({
        success: true,
        alreadyVoted: true,
        helpfulCount: rating?.helpful_count || 0
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Record the vote
    await db.prepare(`
      INSERT OR IGNORE INTO article_rating_votes (slug, ip_hash) VALUES (?, ?)
    `).bind(slug, ipHash).run();

    // Upsert the article rating count
    await db.prepare(`
      INSERT INTO article_ratings (slug, helpful_count, created_at, updated_at)
      VALUES (?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT(slug) DO UPDATE SET
        helpful_count = helpful_count + 1,
        updated_at = CURRENT_TIMESTAMP
    `).bind(slug).run();

    // Get updated count
    const rating = await db.prepare(`
      SELECT helpful_count FROM article_ratings WHERE slug = ?
    `).bind(slug).first();

    return new Response(JSON.stringify({
      success: true,
      alreadyVoted: false,
      helpfulCount: rating?.helpful_count || 1
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error submitting article rating:', error);
    await captureException(db, error, {
      tags: { endpoint: '/api/article/rate', method: 'POST' },
      extra: { slug: body?.slug },
      request
    });
    return new Response(JSON.stringify({ error: 'Failed to submit rating' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// GET - Get article rating and check if user already voted
export const GET: APIRoute = async ({ request, locals }) => {
  const db = (locals as any).runtime?.env?.DB;
  const url = new URL(request.url);

  try {
    if (!db) {
      return new Response(JSON.stringify({ error: 'Database connection failed' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const slug = url.searchParams.get('slug');

    if (!slug) {
      return new Response(JSON.stringify({ error: 'Missing slug parameter' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get IP to check if already voted
    const ip = request.headers.get('cf-connecting-ip') ||
               request.headers.get('x-forwarded-for')?.split(',')[0] ||
               'unknown';
    const ipHash = await hashIP(ip);

    // Check if user already voted
    let hasVoted = false;
    try {
      const existingVote = await db.prepare(`
        SELECT id FROM article_rating_votes WHERE slug = ? AND ip_hash = ?
      `).bind(slug, ipHash).first();
      hasVoted = !!existingVote;
    } catch {
      // Table might not exist yet, that's ok
    }

    // Get current count
    const rating = await db.prepare(`
      SELECT helpful_count FROM article_ratings WHERE slug = ?
    `).bind(slug).first();

    return new Response(JSON.stringify({
      success: true,
      hasVoted,
      helpfulCount: rating?.helpful_count || 0
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error fetching article rating:', error);
    await captureException(db, error, {
      tags: { endpoint: '/api/article/rate', method: 'GET' },
      extra: { slug: url.searchParams.get('slug') },
      request
    });
    return new Response(JSON.stringify({ error: 'Failed to fetch rating' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// GET all ratings (for the index page sorting)
export const ALL: APIRoute = async ({ request, locals }) => {
  const db = (locals as any).runtime?.env?.DB;
  const url = new URL(request.url);

  // Only handle this if explicitly requesting all ratings
  if (url.searchParams.get('all') !== 'true') {
    return new Response(JSON.stringify({ error: 'Invalid request' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    if (!db) {
      return new Response(JSON.stringify({ error: 'Database connection failed' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const ratings = await db.prepare(`
      SELECT slug, helpful_count FROM article_ratings ORDER BY helpful_count DESC
    `).all();

    return new Response(JSON.stringify({
      success: true,
      ratings: ratings.results || []
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error fetching all article ratings:', error);
    await captureException(db, error, {
      tags: { endpoint: '/api/article/rate', method: 'ALL' },
      request
    });
    return new Response(JSON.stringify({ error: 'Failed to fetch ratings' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
