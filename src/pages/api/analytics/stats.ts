import type { APIRoute } from 'astro';

// Use POST to bypass Cloudflare edge caching (GET requests are cached by default)
export const POST: APIRoute = async ({ request, locals }) => {
  const body = await request.json().catch(() => ({}));
  const site = body.site;

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

  // Calculate time range based on input
  // All times are calculated at midnight UTC for consistency
  let since: number;
  let until: number | null = null;

  // Get current date at midnight UTC
  const now = new Date();
  const todayMidnightUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());

  if (body.days === 'yesterday') {
    // Yesterday: from midnight yesterday UTC to midnight today UTC
    since = todayMidnightUTC - (24 * 60 * 60 * 1000); // midnight yesterday
    until = todayMidnightUTC; // midnight today
  } else if (body.days === '1' || body.days === 1) {
    // Today: from midnight today UTC to now
    since = todayMidnightUTC;
    // No until - includes all events up to now
  } else if (body.days === 'this_month') {
    // This month: from 1st of current month at midnight UTC to now
    since = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);
    // No until - includes all events up to now
  } else if (body.days === 'last_month') {
    // Last month: from 1st of last month to 1st of current month
    const lastMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
    since = lastMonthStart.getTime();
    until = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1); // 1st of current month
  } else if (body.startDate && body.endDate) {
    // Custom date range
    since = new Date(body.startDate).getTime();
    // End date should include the entire day
    const endDate = new Date(body.endDate);
    endDate.setDate(endDate.getDate() + 1);
    until = endDate.getTime();
  } else {
    // Last N days: from midnight N days ago UTC to now
    const days = parseInt(body.days || '7');
    since = todayMidnightUTC - ((days - 1) * 24 * 60 * 60 * 1000); // Include today as day 1
  }

  const db = (locals as any).runtime?.env?.DB;

  if (!db) {
    return new Response(JSON.stringify({ error: 'database not available' }), {
      status: 500,
      headers: corsHeaders,
    });
  }

  // Build WHERE clause based on whether we have an end date
  const timeCondition = until
    ? 'created_at >= ? AND created_at < ?'
    : 'created_at > ?';
  const timeParams = until ? [since, until] : [since];

  // Exclude sessions that:
  // 1. Have visited /login or /admin/* (admin users)
  // 2. Have 10+ pageviews (likely internal testing/admin browsing)
  const adminSessionFilter = `
    AND session_id NOT IN (
      SELECT DISTINCT session_id FROM analytics_events
      WHERE site_id = ? AND (path LIKE '/admin/%' OR path = '/login')
    )
    AND session_id NOT IN (
      SELECT session_id FROM analytics_events
      WHERE site_id = ?
      GROUP BY session_id
      HAVING COUNT(*) >= 10
    )
  `;
  // Also exclude admin/login pages from results
  const excludeAdminPaths = `AND path NOT LIKE '/admin/%' AND path != '/login'`;

  try {
    const pageviews = await db.prepare(`
      SELECT COUNT(*) as count FROM analytics_events
      WHERE site_id = ? AND ${timeCondition} ${excludeAdminPaths} ${adminSessionFilter}
    `).bind(site, ...timeParams, site, site).first();

    const sessions = await db.prepare(`
      SELECT COUNT(DISTINCT session_id) as count FROM analytics_events
      WHERE site_id = ? AND ${timeCondition} ${excludeAdminPaths} ${adminSessionFilter}
    `).bind(site, ...timeParams, site, site).first();

    const duration = await db.prepare(`
      SELECT AVG(duration) as avg FROM analytics_events
      WHERE site_id = ? AND duration > 0 AND duration < 3600 AND ${timeCondition} ${excludeAdminPaths} ${adminSessionFilter}
    `).bind(site, ...timeParams, site, site).first();

    const pagesPerSession = await db.prepare(`
      SELECT AVG(page_count) as avg FROM (
        SELECT session_id, COUNT(*) as page_count FROM analytics_events
        WHERE site_id = ? AND ${timeCondition} ${excludeAdminPaths} ${adminSessionFilter}
        GROUP BY session_id
      )
    `).bind(site, ...timeParams, site, site).first();

    // Get average session duration from the last pageview of each session
    const avgSessionDuration = await db.prepare(`
      SELECT AVG(session_duration) as avg FROM (
        SELECT session_id, MAX(session_duration) as session_duration FROM analytics_events
        WHERE site_id = ? AND session_duration > 0 AND session_duration < 7200 AND ${timeCondition} ${excludeAdminPaths} ${adminSessionFilter}
        GROUP BY session_id
      )
    `).bind(site, ...timeParams, site, site).first();

    const topPages = await db.prepare(`
      SELECT path, COUNT(*) as views, AVG(CASE WHEN duration > 0 AND duration < 3600 THEN duration ELSE NULL END) as avg_duration
      FROM analytics_events
      WHERE site_id = ? AND ${timeCondition} ${excludeAdminPaths} ${adminSessionFilter}
      GROUP BY path ORDER BY views DESC LIMIT 100
    `).bind(site, ...timeParams, site, site).all();

    const topReferrers = await db.prepare(`
      SELECT referrer, COUNT(*) as count FROM analytics_events
      WHERE site_id = ? AND referrer IS NOT NULL AND referrer != '' AND ${timeCondition} ${excludeAdminPaths} ${adminSessionFilter}
      GROUP BY referrer ORDER BY count DESC LIMIT 10
    `).bind(site, ...timeParams, site, site).all();

    const byDay = await db.prepare(`
      SELECT
        DATE(created_at / 1000, 'unixepoch') as date,
        COUNT(*) as views
      FROM analytics_events
      WHERE site_id = ? AND ${timeCondition} ${excludeAdminPaths} ${adminSessionFilter}
      GROUP BY date ORDER BY date
    `).bind(site, ...timeParams, site, site).all();

    const countries = await db.prepare(`
      SELECT country, COUNT(*) as count FROM analytics_events
      WHERE site_id = ? AND country IS NOT NULL AND ${timeCondition} ${excludeAdminPaths} ${adminSessionFilter}
      GROUP BY country ORDER BY count DESC LIMIT 10
    `).bind(site, ...timeParams, site, site).all();

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
