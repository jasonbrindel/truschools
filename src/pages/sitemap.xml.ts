import type { APIRoute } from 'astro';

const SITE_URL = 'https://trueschools.com';

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function generateSitemapIndex(sitemaps: { loc: string; lastmod: string }[]): string {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  for (const sitemap of sitemaps) {
    xml += '  <sitemap>\n';
    xml += `    <loc>${sitemap.loc}</loc>\n`;
    xml += `    <lastmod>${sitemap.lastmod}</lastmod>\n`;
    xml += '  </sitemap>\n';
  }

  xml += '</sitemapindex>';
  return xml;
}

export const GET: APIRoute = async () => {
  const today = formatDate(new Date());

  // List all sitemap files
  const sitemaps = [
    { loc: `${SITE_URL}/sitemap-main.xml`, lastmod: today },
    { loc: `${SITE_URL}/sitemap-schools-1.xml`, lastmod: today },
    { loc: `${SITE_URL}/sitemap-schools-2.xml`, lastmod: today },
    { loc: `${SITE_URL}/sitemap-schools-3.xml`, lastmod: today },
    { loc: `${SITE_URL}/sitemap-colleges.xml`, lastmod: today },
    { loc: `${SITE_URL}/sitemap-vocational.xml`, lastmod: today },
    { loc: `${SITE_URL}/sitemap-classes.xml`, lastmod: today },
  ];

  const xml = generateSitemapIndex(sitemaps);

  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
    },
  });
};
