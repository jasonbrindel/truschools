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

  return next();
});
