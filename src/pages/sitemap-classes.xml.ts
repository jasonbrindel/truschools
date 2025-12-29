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

interface ClassVideo {
  dept_page: string;
  course_page: string;
  class_page: string;
}

export const GET: APIRoute = async ({ locals }) => {
  const runtime = locals.runtime as { env: { DB: D1Database } } | undefined;
  const db = runtime?.env?.DB;

  if (!db) {
    return new Response('Database not available', { status: 500 });
  }

  const today = formatDate(new Date());

  try {
    // Get all unique department pages
    const depts = await db.prepare(`
      SELECT DISTINCT dept_page FROM class_videos ORDER BY dept_page
    `).all<{ dept_page: string }>();

    // Get all unique course pages with their departments
    const courses = await db.prepare(`
      SELECT DISTINCT dept_page, course_page FROM class_videos ORDER BY dept_page, course_page
    `).all<{ dept_page: string; course_page: string }>();

    // Get all class pages
    const classes = await db.prepare(`
      SELECT dept_page, course_page, class_page FROM class_videos ORDER BY dept_page, course_page, class_order
    `).all<ClassVideo>();

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    // Add department pages
    for (const dept of depts.results) {
      if (!dept.dept_page) continue;

      const url = `${SITE_URL}/classes/${dept.dept_page}`;
      xml += '  <url>\n';
      xml += `    <loc>${escapeXml(url)}</loc>\n`;
      xml += `    <lastmod>${today}</lastmod>\n`;
      xml += '    <changefreq>weekly</changefreq>\n';
      xml += '    <priority>0.6</priority>\n';
      xml += '  </url>\n';
    }

    // Add course pages
    for (const course of courses.results) {
      if (!course.dept_page || !course.course_page) continue;

      const url = `${SITE_URL}/classes/${course.dept_page}/${course.course_page}`;
      xml += '  <url>\n';
      xml += `    <loc>${escapeXml(url)}</loc>\n`;
      xml += `    <lastmod>${today}</lastmod>\n`;
      xml += '    <changefreq>weekly</changefreq>\n';
      xml += '    <priority>0.5</priority>\n';
      xml += '  </url>\n';
    }

    // Add individual class pages
    for (const cls of classes.results) {
      if (!cls.dept_page || !cls.course_page || !cls.class_page) continue;

      const url = `${SITE_URL}/classes/${cls.dept_page}/${cls.course_page}/${cls.class_page}`;
      xml += '  <url>\n';
      xml += `    <loc>${escapeXml(url)}</loc>\n`;
      xml += `    <lastmod>${today}</lastmod>\n`;
      xml += '    <changefreq>monthly</changefreq>\n';
      xml += '    <priority>0.4</priority>\n';
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
