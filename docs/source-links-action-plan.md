# Action Plan: Add Source Links to TruSchools Education Articles

## Overview

This plan adds clickable hyperlinks to the Sources sections of all TruSchools education articles. Currently, sources are plain text citations. Adding links improves credibility, user experience, and aligns with the site's philosophy of providing comprehensive information.

## Priority Tiers

### Tier 1: Government & Official Sources (Highest Priority)
These are stable, free, and carry the most SEO/credibility weight.
- **nces.ed.gov** - National Center for Education Statistics
- **ed.gov** - U.S. Department of Education
- **bls.gov** - Bureau of Labor Statistics
- **census.gov** - U.S. Census Bureau
- **studentaid.gov** - Federal Student Aid
- **State education department sites** (.gov domains)

### Tier 2: Academic & Research Institutions
Stable and authoritative, usually free access.
- **University research centers** (Stanford CREDO, Harvard, etc.)
- **Research organizations** (Brookings Institution, RAND, etc.)
- **Professional associations** (NAEYC, AAP, etc.)

### Tier 3: Industry Reports & Surveys
Often free but may move or be updated.
- **EdChoice**, **Education Commission of the States**
- **McKinsey**, **Deloitte** reports
- **Survey results** (Resume Builder, Gallup, etc.)

### Tier 4: News & Media (Lowest Priority)
Most prone to link rot and paywalls.
- **News articles** (NPR, CBS, WSJ, CNBC, etc.)
- **Consider using archive.org links** for these

---

## Implementation Steps

### Step 1: Audit Existing Articles
1. List all articles in `src/pages/education-articles/`
2. For each article, extract all source citations into a spreadsheet with columns:
   - Article slug
   - Source organization/author
   - Source title
   - Year
   - Priority tier (1-4)
   - URL (to be filled in)
   - Notes (paywall, archived, etc.)

### Step 2: Find URLs (By Priority Tier)
Work through the spreadsheet tier by tier:

**For Tier 1 (Government):**
- Search the official .gov site directly
- These URLs are usually straightforward to find
- Example: `nces.ed.gov` → search for report title

**For Tier 2 (Academic):**
- Search the institution's website
- Check Google Scholar for papers
- Look for PDF downloads or landing pages

**For Tier 3 (Industry):**
- Search the organization's website
- Check if report is still available
- Note if registration is required

**For Tier 4 (News):**
- Search for the article title + publication
- If paywalled or removed, check archive.org/web
- Use archived version URL if original is inaccessible

### Step 3: Update Article HTML
For each article, update the Sources section from:

```html
<ul class="text-sm text-gray-600 space-y-2 mb-10">
  <li>National Center for Education Statistics. <em>"Digest of Education Statistics."</em> 2023.</li>
</ul>
```

To:

```html
<ul class="text-sm text-gray-600 space-y-2 mb-10">
  <li><a href="https://nces.ed.gov/programs/digest/" class="text-brand-blue hover:underline" target="_blank" rel="noopener">National Center for Education Statistics</a>. <em>"Digest of Education Statistics."</em> 2023.</li>
</ul>
```

**Link formatting rules:**
- Add `class="text-brand-blue hover:underline"` for consistent styling
- Add `target="_blank" rel="noopener"` to open in new tab
- Link the organization name OR the title, not both
- For paywalled sources, add `(subscription required)` after the link

### Step 4: Handle Special Cases

**Paywalled content:**
```html
<li><a href="https://wsj.com/article/..." class="text-brand-blue hover:underline" target="_blank" rel="noopener">Wall Street Journal</a>. <em>"Article Title"</em> (subscription required). 2024.</li>
```

**Archived content:**
```html
<li><a href="https://web.archive.org/web/20240101/https://example.com/article" class="text-brand-blue hover:underline" target="_blank" rel="noopener">Publication Name</a>. <em>"Article Title"</em> (archived). 2023.</li>
```

**Source no longer available:**
- Keep as plain text (no link)
- Add note: `(source no longer available online)`

---

## Article List (58 articles total)

Articles to update in `src/pages/education-articles/`:

### Charter Schools (8 articles)
1. `is-a-charter-school-right-for-your-child.astro`
2. `charter-schools-what-parents-need-to-know.astro`
3. `how-to-apply-to-charter-schools.astro`
4. `charter-school-lottery-explained.astro`
5. `charter-lottery-what-to-do-next.astro`
6. `charter-school-warning-signs.astro`
7. `charter-schools-and-special-education.astro`
8. `what-to-ask-on-a-charter-school-tour.astro`

### Magnet Schools (7 articles)
9. `understanding-magnet-schools.astro`
10. `magnet-schools-guide.astro`
11. `how-magnet-school-lotteries-work.astro`
12. `magnet-school-admissions-guide.astro`
13. `magnet-school-requirements-explained.astro`
14. `magnet-school-transportation.astro`
15. `magnet-vs-charter-vs-neighborhood-school.astro`

### Preschool (7 articles)
16. `choosing-a-preschool.astro`
17. `how-to-choose-a-preschool.astro`
18. `is-preschool-worth-it.astro`
19. `montessori-vs-traditional-preschool.astro`
20. `what-actually-matters-in-preschool.astro`
21. `what-does-a-good-preschool-look-like.astro`
22. `when-your-preschooler-needs-more-help.astro`

### Kindergarten (7 articles)
23. `how-to-choose-the-right-kindergarten.astro`
24. `is-my-child-ready-for-kindergarten.astro`
25. `kindergarten-age-cutoff-dates-by-state.astro`
26. `kindergarten-separation-anxiety.astro`
27. `should-you-delay-kindergarten.astro`
28. `what-kindergarten-really-requires.astro`
29. `california-universal-transitional-kindergarten.astro`

### Elementary & Middle School (5 articles)
30. `how-to-choose-the-right-elementary-school.astro`
31. `middle-school-transition-guide.astro`
32. `cyberbullying-middle-school-guide.astro`
33. `signs-your-child-is-being-bullied.astro`
34. `when-worry-becomes-something-more.astro`

### High School (5 articles)
35. `high-school-graduation-requirements-by-state.astro`
36. `ap-classes-explained.astro`
37. `weighted-vs-unweighted-gpa.astro`
38. `what-is-a-stem-school.astro`
39. `ieps-vs-504-plans.astro`

### College Prep & Applications (5 articles)
40. `college-application-timeline.astro`
41. `common-app-essay-guide.astro`
42. `choosing-a-college-major.astro`
43. `fafsa-2026-2027-parents-guide.astro`
44. `public-vs-private-school.astro`

### Graduate & Professional School (3 articles)
45. `how-to-pay-for-graduate-school.astro`
46. `law-school-lsat-vs-gre.astro`
47. `medical-school-mcat-gpa-requirements.astro`

### Financial Aid & Scholarships (5 articles)
48. `architecture-of-college-funding-grants.astro`
49. `scholarships-running-on-software.astro`
50. `student-loan-infrastructure-guide.astro`
51. `the-numbers-behind-the-promise.astro`
52. `the-price-of-admission.astro`

### Vocational & Trade Schools (2 articles)
53. `the-comeback-of-vocational-schools.astro`
54. `the-diploma-and-the-torque-wrench.astro`

### General Education (4 articles)
55. `how-to-find-the-right-school.astro`
56. `the-rise-of-school-choice.astro`
57. `the-stillness-epidemic.astro`
58. `what-to-teach-when-ai-does-the-work.astro`

---

## Quality Checklist

Before marking an article complete:
- [ ] All Tier 1 sources have working links
- [ ] All Tier 2 sources have working links (or noted as unavailable)
- [ ] Tier 3-4 sources have links where possible
- [ ] Paywalled sources are marked
- [ ] All links open in new tab (`target="_blank"`)
- [ ] All links have `rel="noopener"` for security
- [ ] All links use `text-brand-blue hover:underline` styling
- [ ] Tested each link to confirm it works

---

## Ongoing Maintenance

After initial implementation:
1. **New articles**: Always add source links when writing
2. **Quarterly audit**: Check for broken links using a link checker tool
3. **When links break**: Try to find new URL, or use archive.org, or mark as unavailable

---

## Notes for Implementation

- Work on one article at a time to avoid merge conflicts
- Deploy to preview after each article to verify links render correctly
- Keep the spreadsheet updated as a reference for future link audits
- Government sources should take priority as they provide the most credibility benefit
