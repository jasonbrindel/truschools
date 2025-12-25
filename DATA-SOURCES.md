# TruSchools Data Sources

This document tracks all data sources used for the TruSchools website. Use this reference when updating data in the future.

**Last Updated:** December 2024

---

## K-12 Schools

### Public Schools
- **Source:** Urban Institute Education Data Portal (NCES Common Core of Data)
- **API:** `https://educationdata.urban.org/api/v1/schools/ccd/directory`
- **Documentation:** https://educationdata.urban.org/documentation/
- **Data Year:** 2022
- **Record Count:** ~98,000 schools
- **Import Script:** `scripts/import-nces-schools.js`
- **Output File:** `data/schools-import.sql`
- **Fields Used:** School name, address, city, state, zip, phone, grades offered, school level, enrollment, student-teacher ratio, Title I status, magnet status, charter status, latitude/longitude

### Private Schools
- **Source:** NCES Private School Universe Survey (PSS)
- **Download:** https://nces.ed.gov/surveys/pss/pssdata.asp
- **Data Year:** 2021-2022
- **Record Count:** ~30,000 schools
- **Import Script:** `scripts/import-private-schools.js`
- **Input File:** `data/pss2122_pu.csv`
- **Output File:** `data/private-schools-import.sql`
- **Fields Used:** School name, address, city, state, zip, phone, grades offered, school level, enrollment, student-teacher ratio, religious affiliation, coed status

---

## Colleges & Universities

### Institution Directory
- **Source:** Urban Institute Education Data Portal (IPEDS)
- **API:** `https://educationdata.urban.org/api/v1/college-university/ipeds/directory`
- **Documentation:** https://educationdata.urban.org/documentation/
- **Data Year:** 2022
- **Record Count:** ~6,174 institutions (4-year and 2-year)
- **Import Script:** `scripts/import-colleges.js`
- **Output File:** `data/colleges-import.sql`
- **Fields Used:** Institution name, address, city, state, zip, phone, website, institution type, sector, Carnegie classification, HBCU status, land grant status, latitude/longitude

### College Statistics (Enrollment, Tuition, Demographics)
- **Source:** U.S. Department of Education College Scorecard
- **Download:** https://collegescorecard.ed.gov/data/
- **File Used:** `Most-Recent-Cohorts-Institution.csv`
- **Data Year:** 2023 (most recent cohort data)
- **Import Script:** `scripts/import-scorecard.cjs`
- **Output File:** `data/college-scorecard/scorecard-updates.sql`
- **Fields Updated:** Total enrollment, undergraduate enrollment, tuition (in-state/out-of-state), admission rate, SAT/ACT scores, graduation rate, retention rate, student demographics (gender, race/ethnicity), financial aid percentage, median earnings, federal loan rate

### College Scorecard Field Mapping
| Scorecard Field | Database Field |
|-----------------|----------------|
| UGDS | total_enrollment |
| TUITIONFEE_IN | tuition_in_state |
| TUITIONFEE_OUT | tuition_out_of_state |
| ADM_RATE | admission_rate |
| SAT_AVG | sat_average |
| ACTCMMID | act_median |
| C150_4 | graduation_rate |
| RET_FT4 | retention_rate |
| UGDS_WHITE | pct_white |
| UGDS_BLACK | pct_black |
| UGDS_HISP | pct_hispanic |
| UGDS_ASIAN | pct_asian |
| PCTPELL | pct_receiving_aid |
| MD_EARN_WNE_P10 | median_earnings |
| PCTFLOAN | federal_loan_rate |

---

## Vocational Schools

### Less-than-2-year Institutions
- **Source:** U.S. Department of Education College Scorecard
- **Download:** https://collegescorecard.ed.gov/data/
- **File Used:** `Most-Recent-Cohorts-Institution.csv`
- **Filter:** `ICLEVEL = 3` (less-than-2-year institutions)
- **Data Year:** 2023
- **Record Count:** ~1,800 schools
- **Import Script:** `scripts/import-vocational.cjs`
- **Output Files:** `data/college-scorecard/vocational-batch-*.sql`

### Vocational Type Categorization
Schools are categorized by keyword matching on institution name:

| Category | Keywords |
|----------|----------|
| Beauty | beauty, cosmetology, esthetics, nail, barber, hair, salon, spa, makeup, paul mitchell, aveda, empire beauty |
| Trade | hvac, welding, electrical, plumbing, automotive, mechanic, diesel, construction, lincoln tech, uti |
| Healthcare | nursing, medical, dental, health, phlebotomy, pharmacy tech, cna, lpn |
| Technology | computer, it, technology, coding, cyber, network, software, data |
| Culinary | culinary, cooking, chef, pastry, baking, food service, hospitality, restaurant |
| Other | (all unmatched) |

### Current Vocational School Counts (December 2024)
- Culinary: 637 (updated from IPEDS completions by CIP code 12.05xx)
- Beauty: 949
- Other: 604
- Healthcare: 125
- Technology: 74
- Trade: 40

### Culinary Schools Data
- **Source:** IPEDS Completions Data (CIP code 12.05xx)
- **Download:** https://nces.ed.gov/ipeds/datacenter/DataFiles.aspx
- **File Used:** `C2023_A.csv` (Completions by CIP code)
- **Filter:** CIP codes starting with "12.05" (Cooking and Culinary Arts)
- **Record Count:** 632 unique institutions
- **Note:** Schools are flagged with `vocational_type = 'culinary'` across all institution categories (colleges, community colleges, vocational). This allows community colleges and universities with culinary programs to appear in culinary school listings.

---

## Free Classes / Videos

### Source
- **Provider:** YouTube (various educational channels)
- **Import Script:** `scripts/import-class-videos.cjs`
- **Data Location:** `data/videos/`
- **Note:** Video metadata manually curated

---

## Geographic Data

### ZIP Code Data
- **Source:** TeraCodes (internal)
- **Files:**
  - `data/teracodes-zipcodes.sql`
  - `data/teracodes-census-*.sql`
- **Data:** ZIP code boundaries, census demographics, economic data

---

## Potential Additional Data Sources

### Culinary Schools (TO DO)
Current culinary school data is limited (only 8 schools categorized). Consider these sources for expansion:

1. **American Culinary Federation (ACF)**
   - Accredited programs list: https://www.acfchefs.org/ACFSource/Education/QualityPrograms.aspx
   - Contact for data: helpdesk@acfchefs.org
   - Note: Data loads dynamically, may need to scrape or request bulk data

2. **IPEDS by CIP Code**
   - Use CIP codes 12.05xx for culinary arts programs
   - CIP 12.0500 - Cooking and Related Culinary Arts, General
   - CIP 12.0501 - Baking and Pastry Arts
   - CIP 12.0503 - Culinary Arts/Chef Training
   - CIP 12.0504 - Restaurant, Culinary, and Catering Management
   - Download from: https://nces.ed.gov/ipeds/

3. **ACCSC (Accrediting Commission of Career Schools and Colleges)**
   - https://www.accsc.org/
   - Accredits many vocational programs including culinary

---

## Data Update Schedule

| Data Type | Update Frequency | Next Update |
|-----------|------------------|-------------|
| Public Schools (CCD) | Annual (fall release) | Fall 2025 |
| Private Schools (PSS) | Biennial | 2025 |
| Colleges (IPEDS) | Annual | Fall 2025 |
| College Scorecard | Annual | Late 2025 |
| Vocational Schools | Annual | Late 2025 |

---

## Database Schema Notes

### Schools Table
- Contains both public and private K-12 schools
- `school_type` field: 'public' or 'private'
- `nces_id` is unique identifier from NCES

### Colleges Table
- Contains 4-year, 2-year, and vocational institutions
- `institution_category`: 'college', 'community_college', 'vocational'
- `vocational_type`: 'beauty', 'trade', 'healthcare', 'technology', 'culinary', 'other'
- `unitid` is unique IPEDS identifier
- `iclevel`: 1 = 4-year, 2 = 2-year, 3 = less-than-2-year

---

## Import Process

1. Download latest data files from sources above
2. Run appropriate import script to generate SQL
3. Split large SQL files if needed: `node scripts/split-sql.cjs`
4. Import to D1: `npx wrangler d1 execute trueschools-db --remote --file=<file.sql>`
5. Verify record counts in database
6. Deploy updated site: `npm run build && npx wrangler pages deploy dist`

---

## Contact / Support

- **NCES Data:** https://nces.ed.gov/help/
- **College Scorecard:** https://collegescorecard.ed.gov/data/documentation/
- **Urban Institute API:** https://educationdata.urban.org/
