import type { APIRoute } from 'astro';
import { BUILD_DATE } from '@/lib/build-timestamp';

const SITE_URL = 'https://trueschools.com';

// BUILD_DATE is set at build time - represents when static/prerendered pages were last updated
// This ensures lastmod only changes when we actually deploy new content

const states = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware',
  'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky',
  'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi',
  'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico',
  'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania',
  'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont',
  'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming', 'District of Columbia'
];

function slugify(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-');
}

function escapeXml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

interface UrlEntry {
  loc: string;
  lastmod?: string;
  changefreq?: string;
  priority?: string;
}

function generateSitemapXml(urls: UrlEntry[]): string {
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

export const GET: APIRoute = async () => {
  // Use BUILD_DATE for all static/prerendered content
  // This date only changes when we actually deploy new code
  const staticLastmod = BUILD_DATE;
  const urls: UrlEntry[] = [];

  // Homepage
  urls.push({ loc: SITE_URL, lastmod: staticLastmod, changefreq: 'daily', priority: '1.0' });

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
    { path: '/education-articles', priority: '0.7' },
  ];

  for (const page of mainPages) {
    urls.push({
      loc: `${SITE_URL}${page.path}`,
      lastmod: staticLastmod,
      changefreq: 'weekly',
      priority: page.priority
    });
  }

  // State pages for K-12 schools
  const schoolTypes = [
    'schools', 'preschools', 'kindergartens', 'elementary-schools',
    'middle-schools', 'high-schools', 'charter-schools', 'magnet-schools', 'private-schools'
  ];

  // Note: State pages are SSR (they query DB for counts), but the page template
  // only changes when we deploy. We use staticLastmod here.
  // The actual school data updates are reflected in the school-specific sitemaps.
  for (const type of schoolTypes) {
    for (const state of states) {
      urls.push({
        loc: `${SITE_URL}/${type}/${slugify(state)}`,
        lastmod: staticLastmod,
        changefreq: 'weekly',
        priority: '0.6'
      });
    }
  }

  // State pages for colleges
  for (const state of states) {
    urls.push({
      loc: `${SITE_URL}/colleges-universities/${slugify(state)}`,
      lastmod: staticLastmod,
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
        lastmod: staticLastmod,
        changefreq: 'weekly',
        priority: '0.5'
      });
    }
  }

  // State pages for scholarships
  for (const state of states) {
    urls.push({
      loc: `${SITE_URL}/financial-aid/scholarships/${slugify(state)}`,
      lastmod: staticLastmod,
      changefreq: 'monthly',
      priority: '0.5'
    });
  }

  // Education articles
  const articles = [
    'choosing-a-preschool', 'how-to-choose-a-preschool', 'is-preschool-worth-it',
    'montessori-vs-traditional-preschool', 'what-actually-matters-in-preschool',
    'what-does-a-good-preschool-look-like', 'when-your-preschooler-needs-more-help',
    'california-universal-transitional-kindergarten', 'how-to-choose-the-right-kindergarten',
    'is-my-child-ready-for-kindergarten', 'kindergarten-age-cutoff-dates-by-state',
    'kindergarten-separation-anxiety', 'should-you-delay-kindergarten',
    'what-kindergarten-really-requires', 'how-to-choose-the-right-elementary-school',
    'middle-school-transition-guide', 'cyberbullying-middle-school-guide',
    'signs-your-child-is-being-bullied', 'when-worry-becomes-something-more',
    'ap-classes-explained', 'high-school-graduation-requirements-by-state',
    'weighted-vs-unweighted-gpa', 'what-is-a-stem-school',
    'charter-schools-what-parents-need-to-know', 'is-a-charter-school-right-for-your-child',
    'how-to-apply-to-charter-schools', 'charter-school-lottery-explained',
    'charter-lottery-what-to-do-next', 'charter-school-warning-signs',
    'charter-schools-and-special-education', 'what-to-ask-on-a-charter-school-tour',
    'understanding-magnet-schools', 'magnet-schools-guide', 'magnet-school-admissions-guide',
    'magnet-school-requirements-explained', 'how-magnet-school-lotteries-work',
    'magnet-school-transportation', 'magnet-vs-charter-vs-neighborhood-school',
    'how-to-find-the-right-school', 'public-vs-private-school', 'the-rise-of-school-choice',
    'ieps-vs-504-plans', 'college-application-timeline', 'common-app-essay-guide',
    'choosing-a-college-major', 'medical-school-mcat-gpa-requirements',
    'law-school-lsat-vs-gre', 'how-to-pay-for-graduate-school',
    'fafsa-2026-2027-parents-guide', 'the-price-of-admission', 'the-numbers-behind-the-promise',
    'architecture-of-college-funding-grants', 'scholarships-running-on-software',
    'student-loan-infrastructure-guide', 'the-comeback-of-vocational-schools',
    'the-diploma-and-the-torque-wrench', 'the-stillness-epidemic',
    'what-to-teach-when-ai-does-the-work',
    'how-to-tell-if-your-school-uses-the-science-of-reading',
  ];

  // Articles use build date since they're prerendered static content
  for (const slug of articles) {
    urls.push({
      loc: `${SITE_URL}/education-articles/${slug}`,
      lastmod: staticLastmod,
      changefreq: 'monthly',
      priority: '0.7'
    });
  }

  const xml = generateSitemapXml(urls);

  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
    },
  });
};
