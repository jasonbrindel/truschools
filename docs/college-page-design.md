# College Detail Page Design

## Core Philosophy
**Comprehensive data is the differentiator.** This page should provide more information than any competitor, organized logically for prospective students and parents.

## Database Schema (Slim Import)
The `scorecard` table contains 47 regular columns + 5 JSON fields:

**Regular Columns:** unitid, opeid, opeid6, instnm, city, stabbr, zip, accredagency, insturl, npcurl, preddeg, highdeg, control, locale, main, numbranch, curroper, hbcu, pbi, hsi, tribal, aanapii, menonly, womenonly, relaffil, distanceonly, adm_rate, sat_avg, ugds, stufacr, c150_4, c150_l4, md_earn_wne_p6, npt4_pub, npt4_priv, tuitionfee_in, tuitionfee_out, costt4_a, costt4_p, pctpell, pctfloan, avgfacsal, inexpfte, ret_ft4, ret_ftl4, grad_debt_mdn, cdr3

**JSON Fields:**
- `net_price`: NPT41-45 for PUB and PRIV (10 values)
- `test_scores`: SAT/ACT 25th/50th/75th percentiles (15 values)
- `earnings`: MD_EARN_WNE_P6-P10, PCT25/75 for P6/P10, income breakdowns (12 values)
- `demographics`: UGDS by race, UG25ABV, PPTUG_EF (11 values)
- `programs`: Top 15 PCIP fields (15 values)

---

## Page Structure (Top to Bottom)

### 1. HEADER & KEY METRICS (Above the fold)
The most decision-critical information displayed prominently.

**School Name & Basics**
- Institution name: `instnm`
- Location: `city`, `stabbr`
- Type: `control` (1=Public, 2=Private nonprofit, 3=Private for-profit)
- Degree level: `preddeg` (1=Certificate, 2=Associate, 3=Bachelor's, 4=Graduate)
- Accreditation: `accredagency`

**Hero Stats Grid** (4-6 large metrics)
| Metric | Column | Why Important |
|--------|--------|---------------|
| Graduation Rate | `c150_4` or `c150_l4` | #1 question parents ask |
| Median Earnings (6yr) | `md_earn_wne_p6` | ROI indicator |
| Net Price | `npt4_pub` or `npt4_priv` | True cost after aid |
| Acceptance Rate | `adm_rate` | Selectivity indicator |
| Total Enrollment | `ugds` | School size |
| Student-Faculty Ratio | `stufacr` | Class size proxy |

---

### 2. CONTACT & LINKS
Actionable info people need right away.

**Address**
- Location: `city`, `stabbr` `zip`

**Quick Links**
- Website: `insturl`
- Net Price Calculator: `npcurl`

---

### 3. COSTS & FINANCIAL AID
Most important for families - what will this actually cost?

**Sticker Price**
| Item | Column |
|------|--------|
| Tuition (In-State) | `tuitionfee_in` |
| Tuition (Out-of-State) | `tuitionfee_out` |
| Total Cost of Attendance | `costt4_a` (academic year) or `costt4_p` (program) |

**Net Price by Family Income** (from `net_price` JSON)
Shows what families actually pay after grants/scholarships:
| Family Income | Public | Private |
|---------------|--------|---------|
| $0-30,000 | `npt41_pub` | `npt41_priv` |
| $30,001-48,000 | `npt42_pub` | `npt42_priv` |
| $48,001-75,000 | `npt43_pub` | `npt43_priv` |
| $75,001-110,000 | `npt44_pub` | `npt44_priv` |
| $110,001+ | `npt45_pub` | `npt45_priv` |

**Financial Aid Stats**
| Metric | Column |
|--------|--------|
| % receiving Pell grants | `pctpell` |
| % receiving federal loans | `pctfloan` |
| Instructional expenditure/student | `inexpfte` |
| Average faculty salary | `avgfacsal` |

---

### 4. OUTCOMES & EARNINGS
"Is this school worth it?" - The ROI section.

**Earnings After Graduation** (from `earnings` JSON)
| Timeframe | Median Earnings | 25th %ile | 75th %ile |
|-----------|-----------------|-----------|-----------|
| 6 years | `md_earn_wne_p6` | `pct25_earn_wne_p6` | `pct75_earn_wne_p6` |
| 7 years | `md_earn_wne_p7` | - | - |
| 8 years | `md_earn_wne_p8` | - | - |
| 9 years | `md_earn_wne_p9` | - | - |
| 10 years | `md_earn_wne_p10` | `pct25_earn_wne_p10` | `pct75_earn_wne_p10` |

**Earnings by Family Income** (from `earnings` JSON)
| Income Level | 6-Year Median |
|--------------|---------------|
| Low income | `md_earn_wne_inc1_p6` |
| Middle income | `md_earn_wne_inc2_p6` |
| High income | `md_earn_wne_inc3_p6` |

**Completion Rates**
| Metric | 4-Year Schools | 2-Year Schools |
|--------|---------------|----------------|
| Graduation rate (150% time) | `c150_4` | `c150_l4` |
| Retention rate (full-time) | `ret_ft4` | `ret_ftl4` |

---

### 5. DEBT & LOAN REPAYMENT
Summary debt information.

| Metric | Column |
|--------|--------|
| Median Debt at Graduation | `grad_debt_mdn` |
| 3-Year Loan Default Rate | `cdr3` |

*Note: Detailed debt breakdowns by demographics not available in slim import.*

---

### 6. ADMISSIONS
For students wondering "Can I get in?"

**Selectivity**
- Admission rate: `adm_rate`
- Average SAT: `sat_avg`

**Test Scores** (from `test_scores` JSON)
| Test | 25th %ile | Median | 75th %ile |
|------|-----------|--------|-----------|
| SAT Reading | `satvr25` | `satvr50` | `satvr75` |
| SAT Math | `satmt25` | `satmt50` | `satmt75` |
| ACT Composite | `actcm25` | `actcm50` | `actcm75` |
| ACT English | `acten25` | `acten50` | `acten75` |
| ACT Math | `actmt25` | `actmt50` | `actmt75` |

---

### 7. STUDENT BODY
Who goes here?

**Enrollment**
- Total undergrad: `ugds`
- Part-time percentage: from `demographics` JSON (`pptug_ef`)
- Students 25+: from `demographics` JSON (`ug25abv`)
- Online only: `distanceonly`

**Demographics by Race/Ethnicity** (from `demographics` JSON)
| Group | Field |
|-------|-------|
| White | `ugds_white` |
| Black | `ugds_black` |
| Hispanic | `ugds_hisp` |
| Asian | `ugds_asian` |
| American Indian/Alaska Native | `ugds_aian` |
| Native Hawaiian/Pacific Islander | `ugds_nhpi` |
| Two or More Races | `ugds_2mor` |
| Non-Resident Alien | `ugds_nra` |
| Unknown | `ugds_unkn` |

---

### 8. ACADEMICS & PROGRAMS
What can you study here?

**Degrees Offered**
- Predominant degree: `preddeg` (1=Cert, 2=Assoc, 3=Bach, 4=Grad)
- Highest degree: `highdeg` (0=Non-degree, 1=Cert, 2=Assoc, 3=Bach, 4=Grad)

**Top Programs** (from `programs` JSON - show only non-zero values)
| Field | CIP Code | Field |
|-------|----------|-------|
| Computer Science | `pcip11` |
| Education | `pcip13` |
| Engineering | `pcip14` |
| Liberal Arts | `pcip24` |
| Biology | `pcip26` |
| Math/Stats | `pcip27` |
| Psychology | `pcip42` |
| Social Sciences | `pcip45` |
| Visual/Performing Arts | `pcip50` |
| Health Professions | `pcip51` |
| Business | `pcip52` |
| History | `pcip54` |
| Protective Services | `pcip43` |
| Communication | `pcip09` |
| English | `pcip23` |

---

### 9. INSTITUTION DETAILS
Background information.

**Classification**
- Locale: `locale` (11-13=City, 21-23=Suburb, 31-33=Town, 41-43=Rural)
- Main campus: `main` (1=Yes)
- Number of branches: `numbranch`
- Currently operating: `curroper` (1=Yes)

**Special Designations** (show as badges if value = 1)
| Designation | Column |
|-------------|--------|
| HBCU | `hbcu` |
| Predominantly Black | `pbi` |
| Hispanic-Serving | `hsi` |
| Tribal | `tribal` |
| Asian American/Pacific Islander-Serving | `aanapii` |
| Women-Only | `womenonly` |
| Men-Only | `menonly` |
| Religious Affiliation | `relaffil` (numeric code) |
| Online Only | `distanceonly` |

---

## Design Notes

### Only Show Sections With Data
Each section should check if data exists before rendering. Community colleges won't have SAT scores; vocational schools won't have graduation rates.

### JSON Field Access
```javascript
// Parse JSON fields in Astro
const testScores = school.test_scores ? JSON.parse(school.test_scores) : null;
const demographics = school.demographics ? JSON.parse(school.demographics) : null;
const earnings = school.earnings ? JSON.parse(school.earnings) : null;
const netPrice = school.net_price ? JSON.parse(school.net_price) : null;
const programs = school.programs ? JSON.parse(school.programs) : null;
```

### Data Formatting
- Currency: `$${value.toLocaleString()}`
- Percentages: `${(value * 100).toFixed(1)}%`
- Large numbers: `value.toLocaleString()`
- Ratios: `${value}:1`

### Mobile Considerations
- Tables should be horizontally scrollable on mobile
- Key metrics should stack vertically
- Collapsible sections for detailed breakdowns

### Visual Hierarchy
1. Hero stats = largest, bold
2. Section headers = brand blue
3. Table headers = brand green
4. Data values = standard text
5. Labels/explanations = gray, smaller

### Control Type Mapping
```javascript
const controlTypes = {
  1: 'Public',
  2: 'Private nonprofit',
  3: 'Private for-profit'
};
```

### Degree Level Mapping
```javascript
const degreeTypes = {
  0: 'Non-degree-granting',
  1: 'Certificate',
  2: "Associate's",
  3: "Bachelor's",
  4: 'Graduate'
};
```

### Locale Mapping
```javascript
const localeTypes = {
  11: 'Large City', 12: 'Midsize City', 13: 'Small City',
  21: 'Large Suburb', 22: 'Midsize Suburb', 23: 'Small Suburb',
  31: 'Fringe Town', 32: 'Distant Town', 33: 'Remote Town',
  41: 'Fringe Rural', 42: 'Distant Rural', 43: 'Remote Rural'
};
```
