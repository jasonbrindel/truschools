import type { APIRoute } from 'astro';
import type { D1Database } from '@cloudflare/workers-types';

const SITE_URL = 'https://trueschools.com';
const BATCH_SIZE = 50000; // Last batch can be larger
const BATCH_NUMBER = 3;

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

function slugify(name: string): string {
  return name.toLowerCase()
    .replace(/['']/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function getSchoolTypeSlug(school: School): string {
  if (school.is_charter) return 'charter-schools';
  if (school.is_magnet) return 'magnet-schools';
  if (!school.is_public) return 'private-schools';

  if (school.is_high_school) return 'high-schools';
  if (school.is_middle_school) return 'middle-schools';
  if (school.is_elementary) return 'elementary-schools';
  if (school.is_kindergarten) return 'kindergartens';
  if (school.is_preschool) return 'preschools';

  return 'schools';
}

interface School {
  id: number;
  school_name: string;
  page_name: string;
  state: string;
  city: string;
  is_public: number;
  is_charter: number;
  is_magnet: number;
  is_high_school: number;
  is_middle_school: number;
  is_elementary: number;
  is_kindergarten: number;
  is_preschool: number;
}

export const GET: APIRoute = async ({ locals }) => {
  const runtime = locals.runtime as { env: { DB: D1Database } } | undefined;
  const db = runtime?.env?.DB;

  if (!db) {
    return new Response('Database not available', { status: 500 });
  }

  const today = formatDate(new Date());
  const offset = (BATCH_NUMBER - 1) * 40000; // First two batches are 40k each

  try {
    const result = await db.prepare(`
      SELECT id, school_name, page_name, state, city, is_public, is_charter, is_magnet,
             is_high_school, is_middle_school, is_elementary, is_kindergarten, is_preschool
      FROM schools
      ORDER BY id
      LIMIT ? OFFSET ?
    `).bind(BATCH_SIZE, offset).all<School>();

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    for (const school of result.results) {
      const typeSlug = getSchoolTypeSlug(school);
      const stateSlug = slugify(school.state);
      const citySlug = slugify(school.city);
      const schoolSlug = school.page_name || slugify(school.school_name);

      const url = `${SITE_URL}/${typeSlug}/${stateSlug}/${citySlug}/${schoolSlug}`;

      xml += '  <url>\n';
      xml += `    <loc>${escapeXml(url)}</loc>\n`;
      xml += `    <lastmod>${today}</lastmod>\n`;
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
