# TruSchools Project Instructions

## Core Philosophy

**This site is meant to provide COMPREHENSIVE amounts of information for each school.** There are a thousand other sites that only show a few data points. TruSchools differentiates itself by providing as much data to our audience as we possibly can.

When importing data or building pages:
- Import ALL available data fields, not just a subset
- Display as much relevant information as possible on each page
- More data is better - users come here for depth, not brevity

## Data Sources

### K-12 Schools
- **NCES Public School Data** - National Center for Education Statistics
- **NCES Private School Data** - Private School Universe Survey

### Colleges & Universities
- **College Scorecard** - Has ~2,000+ data elements available. We should be importing and displaying as many as possible, including:
  - Earnings data (median earnings at 1, 2, 6, 8, 10 years after graduation)
  - Debt data (median debt, monthly payments, debt-to-earnings ratios)
  - Completion rates by demographic group
  - Program-level data (earnings/debt by specific major/CIP code)
  - Repayment rates
  - Cohort default rates
  - Detailed financial aid breakdowns
- **IPEDS** - Integrated Postsecondary Education Data System

### Vocational Schools
- Identified via IPEDS completions data using CIP codes:
  - Beauty: 12.04xx
  - Culinary: 12.05xx
  - Healthcare: 51.xxxx
  - Technology: 11.xxxx
  - Trade: 46.xxxx, 47.xxxx, 48.xxxx, 49.xxxx

### Community Data
- **US Census ACS** - American Community Survey data by ZIP code

## Technical Stack

- **Framework**: Astro 5 with SSR
- **Hosting**: Cloudflare Pages
- **Database**: Cloudflare D1 (SQLite)
- **Styling**: Tailwind CSS

## CRITICAL: Deployment

**The project and domain name is `truschools` (without an 'e').**

When deploying to Cloudflare Pages, ALWAYS use:
```
--project-name=truschools
```

The brand name is "TruSchools" and the domain is "truschools.com".

## Articles

**DO NOT CHANGE THE TITLE, TAGLINE, OR ANY CONTENT IN AN ARTICLE PROVIDED BY THE USER UNLESS SPECIFICALLY ASKED.**

When creating article pages from provided content (PDFs, documents, etc.):
- Use the exact title as given
- Use the exact subtitle/tagline as given
- Preserve all content exactly as written
- Only apply formatting (HTML structure, CSS classes) - never edit the actual text

### Creating New Article Pages from PDFs

Follow these steps when the user provides a PDF to create an article page:

#### Step 1: Create the Article Page

1. Create a new `.astro` file in `src/pages/education-articles/` with a URL-friendly slug (lowercase, hyphens)
2. Use an existing article as a template (e.g., `is-a-charter-school-right-for-your-child.astro`)
3. Key components:
   - Import `Layout` and `ArticleBreadcrumb`
   - Set `title` and `description` constants
   - Use `ArticleBreadcrumb` with `defaultParent` pointing to the primary school category page
   - Header section with title, subtitle/tagline (italic), and "By TruSchools Staff"
   - Hero image (full container width, 400-500px height)
   - Article body with `max-w-[680px]` centered content
   - Drop cap on first paragraph using `first-letter:` classes
   - Section dividers using `<p class="text-center text-2xl text-gray-400 my-10">• • •</p>`
   - Sources section at the end
   - Footer with link back to the parent school category page

#### Step 2: Select and Rename an Image

1. List unused images: `ls src/images/ | grep -v "USED-"`
2. Choose an image that best represents the article content
3. Rename with `USED-` prefix: `mv src/images/[image].jpg src/images/USED-[image].jpg`
4. Import in the article: `import heroImage from '@/images/USED-[image].jpg';`

**IMPORTANT: When changing an article's image**, you must:
1. Rename the NEW image with the `USED-` prefix
2. Rename the OLD image back to its original name (remove the `USED-` prefix) so it becomes available for use elsewhere

#### Step 3: Add Article Card to School Category Page

1. Open the relevant category index page (e.g., `src/pages/charter-schools/index.astro`)
2. Add the image import at the top with other USED- images
3. Add the article to the `featuredArticles` array:
   ```javascript
   {
     title: 'Article Title Here',
     url: '/education-articles/article-slug',
     image: importedImageName,
     description: 'Short description of the article (1-2 sentences).',
   },
   ```

#### Step 4: Handle Breadcrumbs for Multi-Page Articles

If an article is linked from multiple school category pages:

1. Ensure the category is in `ArticleBreadcrumb.astro`'s `parentMapping`:
   ```javascript
   'charter-schools': { label: 'Charter Schools', url: '/charter-schools' },
   ```
2. Add `?from=category-slug` to links from non-default parent pages:
   ```javascript
   url: '/education-articles/article-slug?from=charter-schools',
   ```
3. The article's `defaultParent` handles the primary category; `?from=` handles secondary categories

#### Step 5: Build and Deploy

```bash
npm run build && CLOUDFLARE_ACCOUNT_ID=db05e74e773d91c84692ba064111c43c npx wrangler pages deploy dist --project-name=truschools
```

### Article Page Structure Reference

```astro
---
import Layout from '@/layouts/Layout.astro';
import ArticleBreadcrumb from '@/components/ArticleBreadcrumb.astro';
import heroImage from '@/images/USED-image-name.jpg';

const title = "Article Title";
const description = "Meta description for SEO.";
---

<Layout title={title} description={description}>
  <ArticleBreadcrumb title={title} defaultParent={{ label: 'Category Name', url: '/category-slug' }} />

  <header class="max-w-[680px] mx-auto px-5 pt-4 md:pt-8">
    <h1 class="text-4xl md:text-5xl font-bold text-gray-900 leading-tight mb-5">{title}</h1>
    <p class="text-xl md:text-2xl text-gray-600 italic mb-6">Subtitle/tagline here</p>
    <p class="text-base text-gray-500 mb-10">By TruSchools Staff</p>
  </header>

  <div class="container">
    <img src={heroImage.src} alt="Descriptive alt text" class="w-full h-[400px] md:h-[500px] object-cover" />
  </div>

  <article class="max-w-[680px] mx-auto px-5 py-10 md:py-16">
    <div class="article-body text-lg leading-relaxed text-gray-800">
      <p class="first-letter:text-6xl first-letter:font-bold first-letter:float-left first-letter:mr-3 first-letter:mt-1 first-letter:text-gray-900 mb-6">
        First paragraph with drop cap...
      </p>
      <!-- More content -->

      <p class="text-center text-2xl text-gray-400 my-10">• • •</p>

      <!-- More sections -->

      <h2 class="text-2xl font-bold text-gray-900 mt-12 mb-6">Sources</h2>
      <ul class="text-sm text-gray-600 space-y-2 mb-10">
        <li>Source citation here.</li>
      </ul>
    </div>

    <footer class="mt-16 pt-8 border-t border-gray-200">
      <p class="text-sm text-gray-500 italic">
        This article is provided by TruSchools as an educational resource.
      </p>
      <div class="mt-6">
        <a href="/category-slug" class="text-brand-blue hover:underline font-medium">
          Back to Category Name &rarr;
        </a>
      </div>
    </footer>
  </article>
</Layout>
```

## Deployment

**ALWAYS deploy after making changes. NO EXCEPTIONS. Deploy immediately after ANY code change - do not wait for the user to ask.**

**CRITICAL: This is a DEVELOPMENT environment. NEVER deploy to production (truschools.com).**

After any code changes:
1. Run `npm run build`
2. Run `CLOUDFLARE_ACCOUNT_ID=db05e74e773d91c84692ba064111c43c npx wrangler pages deploy dist --project-name=truschools`

**IMPORTANT:**
- The preview URL is ALWAYS https://truschools.pages.dev - use this URL when telling the user where to view changes
- NEVER add `--branch=main` or `--branch=production` flags - this would deploy to the live site
- NEVER add any branch flags at all - just use the exact command above
- NEVER modify the deploy command in any way

This is non-negotiable. Every edit = immediate deploy to preview only.

## Formatting Standards

- All numbers should use `.toLocaleString()` for comma formatting (e.g., "156,755 students")
- All phone numbers should be formatted as (123) 456-7890
- Currency should use `$X,XXX` format

## Current Data Gap

The colleges table currently only has 82 columns. This needs to be expanded significantly to include all available College Scorecard data fields.
