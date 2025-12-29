#!/usr/bin/env node
/**
 * Generate XML sitemaps for TruSchools
 * Creates multiple sitemap files and a sitemap index
 */

const fs = require('fs');
const path = require('path');

const SITE_URL = 'https://trueschools.com';
const OUTPUT_DIR = path.join(__dirname, '..', 'public');
const MAX_URLS_PER_SITEMAP = 45000; // Keep under 50k limit

// US States for URL generation
const states = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware',
  'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky',
  'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi',
  'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico',
  'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania',
  'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont',
  'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming', 'District of Columbia'
];

function slugify(name) {
  return name.toLowerCase().replace(/\s+/g, '-');
}

function escapeXml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

function generateSitemapXml(urls) {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  for (const url of urls) {
    xml += '  <url>\n';
    xml += `    <loc>${escapeXml(url.loc)}</loc>\n`;
    if (url.lastmod) {
      xml += `    <lastmod>${url.lastmod}</lastmod>\n`;
    }
    if (url.changefreq) {
      xml += `    <changefreq>${url.changefreq}</changefreq>\n`;
    }
    if (url.priority) {
      xml += `    <priority>${url.priority}</priority>\n`;
    }
    xml += '  </url>\n';
  }

  xml += '</urlset>';
  return xml;
}

function generateSitemapIndex(sitemaps) {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  for (const sitemap of sitemaps) {
    xml += '  <sitemap>\n';
    xml += `    <loc>${escapeXml(sitemap.loc)}</loc>\n`;
    if (sitemap.lastmod) {
      xml += `    <lastmod>${sitemap.lastmod}</lastmod>\n`;
    }
    xml += '  </sitemap>\n';
  }

  xml += '</sitemapindex>';
  return xml;
}

// Static pages that don't require database queries
function getStaticUrls() {
  const today = formatDate(new Date());
  const urls = [];

  // Homepage
  urls.push({ loc: SITE_URL, lastmod: today, changefreq: 'daily', priority: '1.0' });

  // Main category pages
  const mainPages = [
    { path: '/schools', priority: '0.9' },
    { path: '/preschools', priority: '0.8' },
    { path: '/kindergartens', priority: '0.8' },
    { path: '/elementary-schools', priority: '0.8' },
    { path: '/middle-schools', priority: '0.8' },
    { path: '/high-schools', priority: '0.8' },
    { path: '/charter-schools', priority: '0.8' },
    { path: '/magnet-schools', priority: '0.8' },
    { path: '/private-schools', priority: '0.8' },
    { path: '/colleges-universities', priority: '0.9' },
    { path: '/vocational-schools', priority: '0.8' },
    { path: '/beauty-schools', priority: '0.7' },
    { path: '/trade-schools', priority: '0.7' },
    { path: '/healthcare-schools', priority: '0.7' },
    { path: '/technology-schools', priority: '0.7' },
    { path: '/culinary-schools', priority: '0.7' },
    { path: '/classes', priority: '0.7' },
    { path: '/financial-aid', priority: '0.8' },
    { path: '/financial-aid/fafsa/application-guide', priority: '0.7' },
    { path: '/financial-aid/fafsa/common-mistakes', priority: '0.7' },
    { path: '/financial-aid/fafsa/deadlines', priority: '0.7' },
    { path: '/financial-aid/fafsa/federal-school-codes', priority: '0.7' },
    { path: '/financial-aid/grants', priority: '0.7' },
    { path: '/financial-aid/scholarships', priority: '0.7' },
    { path: '/about', priority: '0.5' },
    { path: '/search', priority: '0.5' },
    { path: '/sitemap', priority: '0.3' },
    { path: '/privacy-policy', priority: '0.3' },
    { path: '/terms-of-use', priority: '0.3' },
  ];

  for (const page of mainPages) {
    urls.push({
      loc: `${SITE_URL}${page.path}`,
      lastmod: today,
      changefreq: 'weekly',
      priority: page.priority
    });
  }

  // State pages for schools
  const schoolTypes = [
    'schools', 'preschools', 'kindergartens', 'elementary-schools',
    'middle-schools', 'high-schools', 'charter-schools', 'magnet-schools', 'private-schools'
  ];

  for (const type of schoolTypes) {
    for (const state of states) {
      urls.push({
        loc: `${SITE_URL}/${type}/${slugify(state)}`,
        lastmod: today,
        changefreq: 'weekly',
        priority: '0.6'
      });
    }
  }

  // State pages for colleges
  for (const state of states) {
    urls.push({
      loc: `${SITE_URL}/colleges-universities/${slugify(state)}`,
      lastmod: today,
      changefreq: 'weekly',
      priority: '0.6'
    });
  }

  // State pages for vocational schools
  const vocationalTypes = ['beauty-schools', 'trade-schools', 'healthcare-schools', 'technology-schools', 'culinary-schools'];
  for (const type of vocationalTypes) {
    for (const state of states) {
      urls.push({
        loc: `${SITE_URL}/${type}/${slugify(state)}`,
        lastmod: today,
        changefreq: 'weekly',
        priority: '0.5'
      });
    }
  }

  // State pages for scholarships
  for (const state of states) {
    urls.push({
      loc: `${SITE_URL}/financial-aid/scholarships/${slugify(state)}`,
      lastmod: today,
      changefreq: 'monthly',
      priority: '0.5'
    });
  }

  return urls;
}

// Education articles
function getArticleUrls() {
  const today = formatDate(new Date());
  const articles = [
    // Preschool
    'choosing-a-preschool',
    'how-to-choose-a-preschool',
    'is-preschool-worth-it',
    'montessori-vs-traditional-preschool',
    'what-actually-matters-in-preschool',
    'what-does-a-good-preschool-look-like',
    'when-your-preschooler-needs-more-help',
    // Kindergarten
    'california-universal-transitional-kindergarten',
    'how-to-choose-the-right-kindergarten',
    'is-my-child-ready-for-kindergarten',
    'kindergarten-age-cutoff-dates-by-state',
    'kindergarten-separation-anxiety',
    'should-you-delay-kindergarten',
    'what-kindergarten-really-requires',
    // Elementary & Middle
    'how-to-choose-the-right-elementary-school',
    'middle-school-transition-guide',
    'cyberbullying-middle-school-guide',
    'signs-your-child-is-being-bullied',
    'when-worry-becomes-something-more',
    // High School
    'ap-classes-explained',
    'high-school-graduation-requirements-by-state',
    'weighted-vs-unweighted-gpa',
    'what-is-a-stem-school',
    // Charter Schools
    'charter-schools-what-parents-need-to-know',
    'is-a-charter-school-right-for-your-child',
    'how-to-apply-to-charter-schools',
    'charter-school-lottery-explained',
    'charter-lottery-what-to-do-next',
    'charter-school-warning-signs',
    'charter-schools-and-special-education',
    'what-to-ask-on-a-charter-school-tour',
    // Magnet Schools
    'understanding-magnet-schools',
    'magnet-schools-guide',
    'magnet-school-admissions-guide',
    'magnet-school-requirements-explained',
    'how-magnet-school-lotteries-work',
    'magnet-school-transportation',
    'magnet-vs-charter-vs-neighborhood-school',
    // School Choice
    'how-to-find-the-right-school',
    'public-vs-private-school',
    'the-rise-of-school-choice',
    'ieps-vs-504-plans',
    // College Admissions
    'college-application-timeline',
    'common-app-essay-guide',
    'choosing-a-college-major',
    'medical-school-mcat-gpa-requirements',
    'law-school-lsat-vs-gre',
    'how-to-pay-for-graduate-school',
    // Financial Aid
    'fafsa-2026-2027-parents-guide',
    'the-price-of-admission',
    'the-numbers-behind-the-promise',
    'architecture-of-college-funding-grants',
    'scholarships-running-on-software',
    'student-loan-infrastructure-guide',
    // Vocational
    'the-comeback-of-vocational-schools',
    'the-diploma-and-the-torque-wrench',
    // Future of Education
    'the-stillness-epidemic',
    'what-to-teach-when-ai-does-the-work',
  ];

  return articles.map(slug => ({
    loc: `${SITE_URL}/education-articles/${slug}`,
    lastmod: today,
    changefreq: 'monthly',
    priority: '0.7'
  }));
}

async function main() {
  console.log('Generating sitemaps for TruSchools...\n');

  const sitemapFiles = [];
  const today = formatDate(new Date());

  // 1. Generate static pages sitemap
  console.log('Generating static pages sitemap...');
  const staticUrls = getStaticUrls();
  const articleUrls = getArticleUrls();
  const mainUrls = [...staticUrls, ...articleUrls];

  const mainSitemapXml = generateSitemapXml(mainUrls);
  fs.writeFileSync(path.join(OUTPUT_DIR, 'sitemap-main.xml'), mainSitemapXml);
  console.log(`  Created sitemap-main.xml with ${mainUrls.length} URLs`);
  sitemapFiles.push({ loc: `${SITE_URL}/sitemap-main.xml`, lastmod: today });

  // 2. For schools, colleges, and vocational - we need database access
  // Since we can't access D1 directly from Node, we'll create placeholder sitemaps
  // that list the pattern, and later we can generate via API endpoint

  console.log('\nNote: School/college/vocational URLs require database access.');
  console.log('Creating API endpoint to generate these dynamically...\n');

  // 3. Generate sitemap index
  console.log('Generating sitemap index...');
  const sitemapIndexXml = generateSitemapIndex(sitemapFiles);
  fs.writeFileSync(path.join(OUTPUT_DIR, 'sitemap.xml'), sitemapIndexXml);
  console.log('  Created sitemap.xml (index)\n');

  console.log('Static sitemaps generated successfully!');
  console.log('\nTo generate school/college sitemaps, we need to create an API endpoint');
  console.log('that queries the D1 database and outputs XML.\n');
}

main().catch(console.error);
