import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  // School subpage redirects - redirect /stats/, /reviews/, /map/ to main school page
  const schoolTypes = [
    'elementary-schools',
    'middle-schools',
    'high-schools',
    'preschools',
    'kindergartens',
    'colleges'
  ];

  // Check if this is a school subpage that needs redirecting
  for (const schoolType of schoolTypes) {
    // Match patterns like /elementary-schools/michigan/charlevoix/school-name/stats/
    const subpagePattern = new RegExp(
      `^/${schoolType}/([^/]+)/([^/]+)/([^/]+)/(stats|reviews|map)/?$`
    );

    const match = pathname.match(subpagePattern);
    if (match) {
      const [, state, city, school, subpage] = match;
      const mainPageUrl = `/${schoolType}/${state}/${city}/${school}`;

      // 301 redirect to main page with anchor
      return context.redirect(`${mainPageUrl}#${subpage}`, 301);
    }
  }

  const response = await next();

  // Add caching headers for HTML pages (not API or assets)
  if (response.headers.get('content-type')?.includes('text/html')) {
    // Cache for 1 hour at edge, allow stale content for 1 day while revalidating
    response.headers.set('Cache-Control', 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400');
  }

  return response;
});
