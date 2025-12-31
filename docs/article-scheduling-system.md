# Article Scheduling System - Implementation Plan

**Status:** Planning (not yet implemented)
**Created:** December 2024
**Prerequisite:** Finalize article structure, metadata, and styling first

## Overview

A system to schedule articles for future publication, allowing batch creation of content that auto-publishes on specified dates. This creates consistent site activity and fresh content signals for SEO.

## Goals

1. Write many articles in advance (e.g., 100 articles)
2. Schedule them to publish 1-2 per day automatically
3. Unpublished articles are hidden from:
   - Category page listings
   - XML sitemaps
   - Direct URL access (returns 404)
4. No manual intervention needed - articles auto-publish at midnight on their date

---

## Architecture

### Component 1: Article Registry

A central TypeScript file containing metadata for all articles:

**File:** `src/data/article-registry.ts`

```typescript
export interface ArticleEntry {
  slug: string;              // URL slug (matches filename without .astro)
  title: string;             // Article title
  description: string;       // Short description for cards/SEO
  publishDate: string;       // ISO date: '2025-02-15'
  category: string;          // Primary category slug: 'charter-schools'
  secondaryCategories?: string[]; // Additional categories
  image: string;             // Image filename (without USED- prefix)
  author?: string;           // Default: 'TruSchools Staff'
}

export const articles: ArticleEntry[] = [
  {
    slug: 'is-a-charter-school-right-for-your-child',
    title: 'Is a Charter School Right for Your Child?',
    description: 'A comprehensive guide to help parents determine if charter schools align with their child\'s educational needs.',
    publishDate: '2024-12-01',  // Already published
    category: 'charter-schools',
    image: 'classroom-students-learning.jpg',
  },
  {
    slug: 'benefits-of-trade-schools',
    title: 'The Benefits of Trade Schools in 2025',
    description: 'Why vocational education is becoming an increasingly smart choice.',
    publishDate: '2025-02-15',  // Scheduled for future
    category: 'vocational-schools',
    image: 'trade-school-workshop.jpg',
  },
  // ... more articles
];
```

### Component 2: Publish Date Filter Utility

**File:** `src/utils/article-utils.ts`

```typescript
import { articles, type ArticleEntry } from '@/data/article-registry';

/**
 * Check if an article is published (publishDate <= today)
 */
export function isPublished(article: ArticleEntry): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const publishDate = new Date(article.publishDate);
  return publishDate <= today;
}

/**
 * Get all published articles
 */
export function getPublishedArticles(): ArticleEntry[] {
  return articles.filter(isPublished);
}

/**
 * Get published articles for a specific category
 */
export function getPublishedArticlesByCategory(category: string): ArticleEntry[] {
  return articles.filter(a =>
    isPublished(a) &&
    (a.category === category || a.secondaryCategories?.includes(category))
  );
}

/**
 * Check if a specific article slug is published
 */
export function isArticlePublished(slug: string): boolean {
  const article = articles.find(a => a.slug === slug);
  return article ? isPublished(article) : false;
}

/**
 * Get article by slug (returns null if not found or not published)
 */
export function getArticle(slug: string): ArticleEntry | null {
  const article = articles.find(a => a.slug === slug);
  if (!article || !isPublished(article)) return null;
  return article;
}
```

### Component 3: Article Page 404 Handling

Each article page checks if it should be visible:

**In each article .astro file (or via middleware):**

```astro
---
import { isArticlePublished } from '@/utils/article-utils';

const slug = 'article-slug-here';

// Return 404 if not yet published
if (!isArticlePublished(slug)) {
  return Astro.redirect('/404', 404);
}
// ... rest of article
---
```

**Alternative: Middleware approach** (cleaner, single location):

**File:** `src/middleware.ts`

```typescript
import { isArticlePublished } from '@/utils/article-utils';

export function onRequest({ request, redirect }, next) {
  const url = new URL(request.url);

  // Check if this is an article URL
  if (url.pathname.startsWith('/education-articles/')) {
    const slug = url.pathname.replace('/education-articles/', '').replace('/', '');

    if (slug && !isArticlePublished(slug)) {
      return new Response(null, { status: 404 });
    }
  }

  return next();
}
```

### Component 4: Article Card Display on Category Pages

Article cards need to be displayed on **19 pages** across the site. These pages currently use hardcoded `featuredArticles` arrays with manual image imports.

#### Pages That Display Article Cards

**Currently displaying articles (13 pages):**

| Page | File | Category Slug |
|------|------|---------------|
| Homepage | `src/pages/index.astro` | `homepage` |
| Education Articles | `src/pages/education-articles/index.astro` | (all - uses glob) |
| Schools | `src/pages/schools/index.astro` | `schools` |
| Preschools | `src/pages/preschools/index.astro` | `preschools` |
| Kindergartens | `src/pages/kindergartens/index.astro` | `kindergartens` |
| Elementary Schools | `src/pages/elementary-schools/index.astro` | `elementary-schools` |
| Middle Schools | `src/pages/middle-schools/index.astro` | `middle-schools` |
| High Schools | `src/pages/high-schools/index.astro` | `high-schools` |
| Charter Schools | `src/pages/charter-schools/index.astro` | `charter-schools` |
| Magnet Schools | `src/pages/magnet-schools/index.astro` | `magnet-schools` |
| Private Schools | `src/pages/private-schools/index.astro` | `private-schools` |
| Financial Aid | `src/pages/financial-aid/index.astro` | `financial-aid` |
| 404 Page | `src/pages/404.astro` | (fallback articles) |

**Will display articles (6 vocational pages):**

| Page | File | Category Slug |
|------|------|---------------|
| Vocational Schools | `src/pages/vocational-schools/index.astro` | `vocational-schools` |
| Beauty Schools | `src/pages/beauty-schools/index.astro` | `beauty-schools` |
| Culinary Schools | `src/pages/culinary-schools/index.astro` | `culinary-schools` |
| Healthcare Schools | `src/pages/healthcare-schools/index.astro` | `healthcare-schools` |
| Technology Schools | `src/pages/technology-schools/index.astro` | `technology-schools` |
| Trade Schools | `src/pages/trade-schools/index.astro` | `trade-schools` |

#### Current Implementation (Hardcoded)

Each category page currently has:
1. Manual image imports at the top of the file
2. A hardcoded `featuredArticles` array
3. Inline card rendering in the template

```astro
---
// Current approach - lots of manual imports
import charterImage from '@/images/USED-charter-school-classroom.jpg';
import lotteryImage from '@/images/USED-students-waiting-classroom.jpg';
// ... 20+ more imports

const featuredArticles = [
  {
    title: 'Is a Charter School Right for Your Child?',
    url: '/education-articles/is-a-charter-school-right-for-your-child',
    image: charterImage,
    description: 'A comprehensive guide...',
  },
  // ... more articles
];
---
```

#### New Implementation (Registry-Based)

Replace hardcoded arrays with registry lookups and dynamic image loading:

```astro
---
import { getPublishedArticlesByCategory, getArticleImage } from '@/utils/article-utils';

// Get published articles for this category
const featuredArticles = await getPublishedArticlesByCategory('charter-schools');
---
```

#### Dynamic Image Loading

Since images need to be loaded dynamically from the registry, add an image loader utility:

**Add to `src/utils/article-utils.ts`:**

```typescript
// Pre-load all article images at build time
const allImages = import.meta.glob<{ default: ImageMetadata }>(
  '/src/images/USED-*.jpg',
  { eager: true }
);

/**
 * Get the image for an article from its filename
 */
export function getArticleImage(imageFilename: string): ImageMetadata | null {
  const imagePath = `/src/images/USED-${imageFilename}`;
  return allImages[imagePath]?.default || null;
}

/**
 * Get published articles with resolved images for a category
 */
export function getPublishedArticlesWithImages(category: string): Array<ArticleEntry & { resolvedImage: ImageMetadata | null }> {
  return getPublishedArticlesByCategory(category).map(article => ({
    ...article,
    resolvedImage: getArticleImage(article.image),
  }));
}
```

#### Article Card Component (Optional)

For consistency across all 19 pages, consider creating a shared component:

**File:** `src/components/ArticleCard.astro`

```astro
---
interface Props {
  title: string;
  url: string;
  image: ImageMetadata | null;
  description: string;
  fromCategory?: string; // For breadcrumb ?from= parameter
}

const { title, url, image, description, fromCategory } = Astro.props;
const href = fromCategory ? `${url}?from=${fromCategory}` : url;
---

<article class="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow group">
  <a href={href} class="block">
    <div class="aspect-[16/9] overflow-hidden bg-gray-100">
      {image ? (
        <img
          src={image.src}
          alt={title}
          class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
      ) : (
        <div class="w-full h-full flex items-center justify-center bg-gray-200">
          <span class="text-gray-400 text-sm">No image</span>
        </div>
      )}
    </div>
    <div class="p-4">
      <h3 class="text-lg font-bold text-gray-900 mb-2 leading-tight group-hover:text-brand-blue transition-colors">
        {title}
      </h3>
      <p class="text-sm text-gray-600">{description}</p>
    </div>
  </a>
</article>
```

**Usage in category pages:**

```astro
---
import ArticleCard from '@/components/ArticleCard.astro';
import { getPublishedArticlesWithImages } from '@/utils/article-utils';

const articles = getPublishedArticlesWithImages('charter-schools');
---

<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {articles.map(article => (
    <ArticleCard
      title={article.title}
      url={`/education-articles/${article.slug}`}
      image={article.resolvedImage}
      description={article.description}
      fromCategory="charter-schools"
    />
  ))}
</div>
```

#### Special Cases

**`/education-articles` index page:**
- Already uses `import.meta.glob` to dynamically load articles
- Parses metadata from file content using regex
- Should be updated to use the registry instead for consistency
- Has filtering by tag and sorting - these features should be preserved

**Homepage (`/`):**
- May want curated "featured" articles rather than all articles for a category
- Consider adding a `featured: true` flag to ArticleEntry
- Or maintain a separate `homepageArticles` array in the registry

**404 page:**
- Shows a few helpful articles as suggestions
- Could use `getPublishedArticles().slice(0, 3)` or a curated list

#### Breadcrumb `?from=` Parameter

When an article appears on multiple category pages, use the `?from=` parameter so breadcrumbs show the correct parent:

```typescript
// In registry - article belongs to multiple categories
{
  slug: 'is-preschool-worth-it',
  category: 'preschools',  // Primary category
  secondaryCategories: ['schools', 'kindergartens'],  // Also shown on these pages
}
```

```astro
<!-- On /schools page, link with ?from=schools -->
<ArticleCard
  url={`/education-articles/${article.slug}`}
  fromCategory="schools"
/>

<!-- On /preschools page (primary), no ?from= needed -->
<ArticleCard
  url={`/education-articles/${article.slug}`}
/>
```

### Component 5: Articles Sitemap

**File:** `src/pages/sitemap-articles.xml.ts`

```typescript
import type { APIRoute } from 'astro';
import { getPublishedArticles } from '@/utils/article-utils';

export const GET: APIRoute = async () => {
  const articles = getPublishedArticles();

  const urls = articles.map(article => `
    <url>
      <loc>https://trueschools.com/education-articles/${article.slug}</loc>
      <lastmod>${article.publishDate}</lastmod>
      <changefreq>monthly</changefreq>
      <priority>0.6</priority>
    </url>
  `).join('');

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

  return new Response(sitemap, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=21600', // 6 hour cache (shorter than other sitemaps)
    },
  });
};
```

**Update `sitemap.xml` index to include the new sitemap.**

---

## Implementation Steps

### Phase 1: Create the Registry System

1. [ ] Create `src/data/article-registry.ts` with ArticleEntry interface
2. [ ] Migrate existing articles into the registry with their metadata
3. [ ] Create `src/utils/article-utils.ts` with filter functions
4. [ ] Add dynamic image loading with `import.meta.glob`

### Phase 2: Create Article Card Component

5. [ ] Create `src/components/ArticleCard.astro` component
6. [ ] Test component with existing article data

### Phase 3: Update Category Pages (19 total)

Update each page to use registry + ArticleCard component:

**K-12 School Pages (9 pages):**
7. [ ] `/schools/index.astro`
8. [ ] `/preschools/index.astro`
9. [ ] `/kindergartens/index.astro`
10. [ ] `/elementary-schools/index.astro`
11. [ ] `/middle-schools/index.astro`
12. [ ] `/high-schools/index.astro`
13. [ ] `/charter-schools/index.astro`
14. [ ] `/magnet-schools/index.astro`
15. [ ] `/private-schools/index.astro`

**Vocational Pages (6 pages):**
16. [ ] `/vocational-schools/index.astro`
17. [ ] `/beauty-schools/index.astro`
18. [ ] `/culinary-schools/index.astro`
19. [ ] `/healthcare-schools/index.astro`
20. [ ] `/technology-schools/index.astro`
21. [ ] `/trade-schools/index.astro`

**Other Pages (4 pages):**
22. [ ] `/financial-aid/index.astro`
23. [ ] `/index.astro` (homepage - may need special handling)
24. [ ] `/404.astro`
25. [ ] `/education-articles/index.astro` (replace glob-based system)

### Phase 4: Add 404 Protection

26. [ ] Add middleware to return 404 for unpublished articles
27. [ ] Test that future-dated articles return 404

### Phase 5: Sitemap Integration

28. [ ] Create `sitemap-articles.xml.ts`
29. [ ] Update `sitemap.xml` index to include articles sitemap
30. [ ] Remove articles from `sitemap-main.xml.ts` (they'll be in dedicated sitemap)
31. [ ] Set appropriate cache headers (6 hours recommended)

### Phase 6: Testing & Refinement

32. [ ] Test with a mix of past and future dates
33. [ ] Verify sitemap only shows published articles
34. [ ] Verify category pages only show published articles
35. [ ] Verify direct URLs to future articles return 404
36. [ ] Test all 19 category pages display correct articles

---

## Image Handling Consideration

Currently, images are imported statically in each article:
```astro
import heroImage from '@/images/USED-image-name.jpg';
```

For the registry system, we have two options:

### Option A: Keep Static Imports (Simpler)
- Each article page still imports its own image
- Registry just stores the image filename for reference
- Category pages would need dynamic image loading

### Option B: Dynamic Image Loading
- Store image paths in registry
- Use Astro's `getImage()` or dynamic imports
- More complex but more flexible

**Recommendation:** Start with Option A, migrate to B if needed.

---

## Scheduling Workflow

Once implemented, scheduling articles is simple:

1. **Write the article** - Create the .astro file as usual
2. **Add to registry** - Add entry with future `publishDate`
3. **Deploy** - Article exists but is hidden until publish date
4. **Auto-publish** - On the publish date, article automatically appears

### Bulk Scheduling Example

To schedule 30 articles over a month:

```typescript
// Helper to generate dates
const startDate = new Date('2025-02-01');
const articlesToSchedule = [
  'article-1-slug',
  'article-2-slug',
  // ... etc
];

articlesToSchedule.forEach((slug, index) => {
  const publishDate = new Date(startDate);
  publishDate.setDate(startDate.getDate() + Math.floor(index / 2)); // 2 per day
  console.log(`${slug}: ${publishDate.toISOString().split('T')[0]}`);
});
```

---

## Future Enhancements (Optional)

- **Admin dashboard** - UI to view/edit scheduled articles
- **Email notifications** - Alert when articles publish
- **Social media integration** - Auto-post when articles publish
- **Analytics tracking** - Track which scheduled articles perform best
- **Draft status** - Add 'draft' status for work-in-progress articles

---

## Dependencies

This plan assumes:
- Article structure is finalized
- Article metadata fields are determined
- Category pages are stable
- No major changes to article URLs or organization

**Wait until these are settled before implementing.**
