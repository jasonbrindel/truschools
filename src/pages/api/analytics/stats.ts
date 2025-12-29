import type { APIRoute } from 'astro';

// Use POST to bypass Cloudflare edge caching (GET requests are cached by default)
export const POST: APIRoute = async ({ request, locals }) => {
  const body = await request.json().catch(() => ({}));
  const site = body.site;
  const days = parseInt(body.days || '7');

  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'private, no-store, no-cache, must-revalidate, max-age=0',
    'CDN-Cache-Control': 'no-store',
    'Cloudflare-CDN-Cache-Control': 'no-store',
    'Pragma': 'no-cache',
    'Expires': '0',
  };

  if (!site) {
    return new Response(JSON.stringify({ error: 'site required' }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  const since = Date.now() - (days * 24 * 60 * 60 * 1000);
  const db = (locals as any).runtime?.env?.DB;

  if (!db) {
    return new Response(JSON.stringify({ error: 'database not available' }), {
      status: 500,
      headers: corsHeaders,
    });
  }

  try {
    const pageviews = await db.prepare(`
      SELECT COUNT(*) as count FROM analytics_events
      WHERE site_id = ? AND created_at > ?
    `).bind(site, since).first();

    const sessions = await db.prepare(`
      SELECT COUNT(DISTINCT session_id) as count FROM analytics_events
      WHERE site_id = ? AND created_at > ?
    `).bind(site, since).first();

    const duration = await db.prepare(`
      SELECT AVG(duration) as avg FROM analytics_events
      WHERE site_id = ? AND duration > 0 AND duration < 3600 AND created_at > ?
    `).bind(site, since).first();

    const pagesPerSession = await db.prepare(`
      SELECT AVG(page_count) as avg FROM (
        SELECT session_id, COUNT(*) as page_count FROM analytics_events
        WHERE site_id = ? AND created_at > ?
        GROUP BY session_id
      )
    `).bind(site, since).first();

    // Get average session duration from the last pageview of each session
    const avgSessionDuration = await db.prepare(`
      SELECT AVG(session_duration) as avg FROM (
        SELECT session_id, MAX(session_duration) as session_duration FROM analytics_events
        WHERE site_id = ? AND session_duration > 0 AND session_duration < 7200 AND created_at > ?
        GROUP BY session_id
      )
    `).bind(site, since).first();

    const topPages = await db.prepare(`
      SELECT path, COUNT(*) as views FROM analytics_events
      WHERE site_id = ? AND created_at > ?
      GROUP BY path ORDER BY views DESC LIMIT 20
    `).bind(site, since).all();

    const topReferrers = await db.prepare(`
      SELECT referrer, COUNT(*) as count FROM analytics_events
      WHERE site_id = ? AND referrer IS NOT NULL AND referrer != '' AND created_at > ?
      GROUP BY referrer ORDER BY count DESC LIMIT 10
    `).bind(site, since).all();

    const byDay = await db.prepare(`
      SELECT
        DATE(created_at / 1000, 'unixepoch') as date,
        COUNT(*) as views
      FROM analytics_events
      WHERE site_id = ? AND created_at > ?
      GROUP BY date ORDER BY date
    `).bind(site, since).all();

    const countries = await db.prepare(`
      SELECT country, COUNT(*) as count FROM analytics_events
      WHERE site_id = ? AND country IS NOT NULL AND created_at > ?
      GROUP BY country ORDER BY count DESC LIMIT 10
    `).bind(site, since).all();

    return new Response(JSON.stringify({
      pageviews: pageviews?.count || 0,
      sessions: sessions?.count || 0,
      avgDuration: Math.round(duration?.avg || 0),
      avgSessionDuration: Math.round(avgSessionDuration?.avg || 0),
      pagesPerSession: Math.round((pagesPerSession?.avg || 0) * 10) / 10,
      topPages: topPages?.results || [],
      topReferrers: topReferrers?.results || [],
      byDay: byDay?.results || [],
      countries: countries?.results || [],
    }), { headers: corsHeaders });

  } catch (e) {
    console.error('Stats error:', e);
    return new Response(JSON.stringify({ error: 'query failed', details: String(e) }), {
      status: 500,
      headers: corsHeaders,
    });
  }
};
