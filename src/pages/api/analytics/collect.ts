import type { APIRoute } from 'astro';
import { captureException } from '@/lib/error-logger';

const BOT_PATTERNS = /bot|crawl|spider|slurp|facebook|twitter|linkedin|preview|fetch|curl|wget|python|go-http|headless|phantom|selenium/i;

export const POST: APIRoute = async ({ request, locals }) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  try {
    const ua = request.headers.get('user-agent') || '';
    if (BOT_PATTERNS.test(ua)) {
      return new Response('ok', { headers: corsHeaders });
    }

    if (!request.headers.get('accept-language')) {
      return new Response('ok', { headers: corsHeaders });
    }

    const cf = (request as any).cf;
    const botScore = cf?.botManagement?.score;
    if (botScore !== undefined && botScore < 30) {
      return new Response('ok', { headers: corsHeaders });
    }

    const body = await request.json();

    if (!body.s || !body.i || !body.p) {
      return new Response('ok', { headers: corsHeaders });
    }

    // Filter out 404 pages - these are mostly bot traffic hitting old URLs
    if (body.p === '/404') {
      return new Response('ok', { headers: corsHeaders });
    }

    const country = cf?.country || null;
    const db = (locals as any).runtime?.env?.DB;

    if (db) {
      await db.prepare(`
        INSERT INTO analytics_events (site_id, session_id, path, referrer, duration, country, created_at, session_duration, page_count)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        body.s,
        body.i,
        body.p,
        body.r || null,
        body.d || null,
        country,
        Date.now(),
        body.sd || null,
        body.pc || null
      ).run();
    }

    return new Response('ok', { headers: corsHeaders });
  } catch (e) {
    console.error('Collect error:', e);
    const db = (locals as any).runtime?.env?.DB;
    await captureException(db, e, {
      tags: { endpoint: '/api/analytics/collect', method: 'POST' },
      request
    });
    return new Response('ok', { headers: corsHeaders });
  }
};

export const OPTIONS: APIRoute = async () => {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
};
