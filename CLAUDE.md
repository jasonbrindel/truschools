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

**The project name is `truschools` - NOT `trueschools` (no 'e').**

When deploying to Cloudflare Pages, ALWAYS use:
```
--project-name=truschools
```

NEVER use `trueschools`, `trueschools-preview`, or any variation with an 'e'. The correct spelling is `tru` not `true`.

## Formatting Standards

- All numbers should use `.toLocaleString()` for comma formatting (e.g., "156,755 students")
- All phone numbers should be formatted as (123) 456-7890
- Currency should use `$X,XXX` format

## Current Data Gap

The colleges table currently only has 82 columns. This needs to be expanded significantly to include all available College Scorecard data fields.
