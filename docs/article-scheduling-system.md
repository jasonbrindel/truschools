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

### Component 4: Category Page Integration

Update category pages to use the registry instead of hardcoded arrays:

**Example:** `src/pages/charter-schools/index.astro`

```astro
---
import { getPublishedArticlesByCategory } from '@/utils/article-utils';

// Get published articles for this category
const featuredArticles = getPublishedArticlesByCategory('charter-schools');
---
```

This replaces the current hardcoded `featuredArticles` array.

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

### Phase 2: Update Category Pages

4. [ ] Update each category index page to use `getPublishedArticlesByCategory()`
5. [ ] Update ArticleBreadcrumb component if needed
6. [ ] Handle image imports dynamically (may need adjustments)

### Phase 3: Add 404 Protection

7. [ ] Add middleware or per-page checks to return 404 for unpublished articles
8. [ ] Test that future-dated articles return 404

### Phase 4: Sitemap Integration

9. [ ] Create `sitemap-articles.xml.ts`
10. [ ] Update `sitemap.xml` index to include articles sitemap
11. [ ] Remove articles from `sitemap-main.xml.ts` (they'll be in dedicated sitemap)
12. [ ] Set appropriate cache headers (6 hours recommended)

### Phase 5: Testing & Refinement

13. [ ] Test with a mix of past and future dates
14. [ ] Verify sitemap only shows published articles
15. [ ] Verify category pages only show published articles
16. [ ] Verify direct URLs to future articles return 404

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
