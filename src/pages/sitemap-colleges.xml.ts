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

interface College {
  id: number;
  institution_name: string;
  page_name: string;
  state: string;
}

export const GET: APIRoute = async ({ locals }) => {
  const runtime = locals.runtime as { env: { DB: D1Database } } | undefined;
  const db = runtime?.env?.DB;

  if (!db) {
    return new Response('Database not available', { status: 500 });
  }

  const today = formatDate(new Date());

  try {
    const result = await db.prepare(`
      SELECT id, institution_name, page_name, state
      FROM colleges
      WHERE active = 1
      ORDER BY id
    `).all<College>();

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    for (const college of result.results) {
      // Skip colleges with missing data
      if (!college.state || !college.institution_name) continue;

      const stateSlug = slugify(college.state);
      const collegeSlug = college.page_name || slugify(college.institution_name);

      // Skip if slugs are empty
      if (!stateSlug || !collegeSlug) continue;

      // Main college page
      const mainUrl = `${SITE_URL}/colleges-universities/${stateSlug}/${collegeSlug}`;
      xml += '  <url>\n';
      xml += `    <loc>${escapeXml(mainUrl)}</loc>\n`;
      xml += `    <lastmod>${today}</lastmod>\n`;
      xml += '    <changefreq>monthly</changefreq>\n';
      xml += '    <priority>0.6</priority>\n';
      xml += '  </url>\n';

      // Subpages
      const subpages = ['admissions', 'programs', 'faculty', 'financial-aid'];
      for (const subpage of subpages) {
        const subUrl = `${SITE_URL}/colleges-universities/${stateSlug}/${collegeSlug}/${subpage}`;
        xml += '  <url>\n';
        xml += `    <loc>${escapeXml(subUrl)}</loc>\n`;
        xml += `    <lastmod>${today}</lastmod>\n`;
        xml += '    <changefreq>monthly</changefreq>\n';
        xml += '    <priority>0.5</priority>\n';
        xml += '  </url>\n';
      }
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
