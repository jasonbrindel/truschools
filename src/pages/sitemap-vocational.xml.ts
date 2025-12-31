import type { APIRoute } from 'astro';
import type { D1Database } from '@cloudflare/workers-types';

const SITE_URL = 'https://trueschools.com';

function escapeXml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function slugify(name: string | null): string {
  if (!name) return '';
  return name.toLowerCase()
    .replace(/['']/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function getVocationalTypeSlug(vocationalType: string | null): string {
  if (!vocationalType) return 'vocational-schools';

  const type = vocationalType.toLowerCase();
  if (type === 'beauty') return 'beauty-schools';
  if (type === 'culinary') return 'culinary-schools';
  if (type === 'healthcare') return 'healthcare-schools';
  if (type === 'technology') return 'technology-schools';
  if (type === 'trade') return 'trade-schools';

  return 'vocational-schools';
}

interface VocationalSchool {
  id: number;
  institution_name: string;
  page_name: string;
  state: string;
  vocational_type: string | null;
  updated_at: string | null;
}

export const GET: APIRoute = async ({ locals }) => {
  const runtime = locals.runtime as { env: { DB: D1Database } } | undefined;
  const db = runtime?.env?.DB;

  if (!db) {
    return new Response('Database not available', { status: 500 });
  }

  try {
    // Include updated_at to use real modification dates in sitemap
    const result = await db.prepare(`
      SELECT id, institution_name, page_name, state, vocational_type, updated_at
      FROM colleges
      WHERE active = 1 AND vocational_type IS NOT NULL
      ORDER BY id
    `).all<VocationalSchool>();

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    for (const school of result.results) {
      // Skip schools with missing data
      if (!school.state || !school.institution_name) continue;

      const typeSlug = getVocationalTypeSlug(school.vocational_type);
      const stateSlug = slugify(school.state);
      const schoolSlug = school.page_name || slugify(school.institution_name);

      // Skip if slugs are empty
      if (!stateSlug || !schoolSlug) continue;

      const url = `${SITE_URL}/${typeSlug}/${stateSlug}/${schoolSlug}`;

      // Use real updated_at from database, format as YYYY-MM-DD
      // If no updated_at, omit lastmod entirely (Google will use crawl date)
      const lastmod = school.updated_at ? formatDate(new Date(school.updated_at)) : null;

      xml += '  <url>\n';
      xml += `    <loc>${escapeXml(url)}</loc>\n`;
      if (lastmod) {
        xml += `    <lastmod>${lastmod}</lastmod>\n`;
      }
      xml += '    <changefreq>monthly</changefreq>\n';
      xml += '    <priority>0.5</priority>\n';
      xml += '  </url>\n';
    }

    xml += '</urlset>';

    return new Response(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (error) {
    console.error('Sitemap generation error:', error);
    return new Response(`Error generating sitemap: ${error}`, { status: 500 });
  }
};
