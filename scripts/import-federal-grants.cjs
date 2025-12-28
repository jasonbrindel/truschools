/**
 * Import Federal Education Grants from SAM.gov Assistance Listings
 *
 * Data source: https://sam.gov/data-services/Assistance%20Listings
 * CSV URL: https://s3.amazonaws.com/falextracts/Assistance%20Listings/datagov/AssistanceListings_DataGov_PUBLIC_CURRENT.csv
 *
 * Includes financial data:
 * - Obligations (122): Total spending by fiscal year
 * - Range and Average of Financial Assistance (123): Award amounts
 * - Program Accomplishments (130): Number of recipients by year
 */

const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

const CSV_PATH = path.join(__dirname, '../data/federal-grants/AssistanceListings_DataGov_PUBLIC_CURRENT.csv');
const OUTPUT_PATH = path.join(__dirname, '../data/federal-grants/education_grants_import.sql');

// Key student financial aid programs (CFDA numbers)
const STUDENT_AID_PROGRAMS = [
  '84.007',  // FSEOG
  '84.033',  // Federal Work-Study
  '84.063',  // Pell Grant
  '84.268',  // Direct Student Loans
  '84.379',  // TEACH Grant
  '84.408',  // Iraq/Afghanistan Service Grant
];

// TRIO and student support programs
const STUDENT_SUPPORT_PROGRAMS = [
  '84.042',  // TRIO Student Support Services
  '84.044',  // TRIO Talent Search
  '84.047',  // TRIO Upward Bound
  '84.066',  // TRIO Educational Opportunity Centers
  '84.217',  // TRIO McNair Post-Baccalaureate Achievement
  '84.334',  // GEAR UP
  '84.335',  // Child Care Access Means Parents in School
];

// Higher education programs
const HIGHER_ED_KEYWORDS = [
  'postsecondary', 'higher education', 'college', 'university', 'undergraduate',
  'graduate', 'doctoral', 'fellowship', 'scholarship'
];

// K-12 education keywords
const K12_KEYWORDS = [
  'elementary', 'secondary', 'k-12', 'high school', 'middle school',
  'title i', 'esea', 'essa'
];

// Career and technical education
const CTE_KEYWORDS = [
  'career', 'technical', 'vocational', 'perkins', 'workforce'
];

// Special education keywords
const SPED_KEYWORDS = [
  'special education', 'idea', 'disability', 'disabilities', 'disabled'
];

function escapeSQL(str) {
  if (!str) return '';
  return str.replace(/'/g, "''").replace(/\r?\n/g, ' ').trim();
}

function categorizeProgram(row) {
  const num = row['Program Number'] || '';
  const title = (row['Program Title'] || '').toLowerCase();
  const objectives = (row['Objectives (050)'] || '').toLowerCase();
  const combined = title + ' ' + objectives;

  return {
    is_student_aid: STUDENT_AID_PROGRAMS.includes(num) ? 1 : 0,
    is_higher_ed: (
      STUDENT_AID_PROGRAMS.includes(num) ||
      STUDENT_SUPPORT_PROGRAMS.includes(num) ||
      HIGHER_ED_KEYWORDS.some(kw => combined.includes(kw))
    ) ? 1 : 0,
    is_k12: K12_KEYWORDS.some(kw => combined.includes(kw)) ? 1 : 0,
    is_career_tech: CTE_KEYWORDS.some(kw => combined.includes(kw)) ? 1 : 0,
    is_special_ed: SPED_KEYWORDS.some(kw => combined.includes(kw)) ? 1 : 0,
  };
}

async function main() {
  console.log('Reading CSV file...');
  const csvContent = fs.readFileSync(CSV_PATH, 'utf-8');

  console.log('Parsing CSV...');
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  });

  // Filter for Department of Education programs (84.xxx)
  const edPrograms = records.filter(row => {
    const num = row['Program Number'] || '';
    return num.startsWith('84.');
  });

  console.log(`Found ${edPrograms.length} Department of Education programs`);

  // Generate SQL
  let sql = `-- Federal Education Grants Import
-- Generated: ${new Date().toISOString()}
-- Source: SAM.gov Assistance Listings (CFDA)

`;

  for (const row of edPrograms) {
    const categories = categorizeProgram(row);
    const num = row['Program Number'] || '';
    const title = escapeSQL(row['Program Title'] || '');
    const popularName = escapeSQL(row['Popular Name (020)'] || '');
    const agency = escapeSQL(row['Federal Agency (030)'] || '');
    const objectives = escapeSQL((row['Objectives (050)'] || '').substring(0, 2000));
    const assistanceType = escapeSQL(row['Types of Assistance (060)'] || '');
    const eligibility = escapeSQL((row['Beneficiary Eligibility (082)'] || '').substring(0, 1000));
    const website = escapeSQL(row['Website Address (153)'] || '');
    const deadlines = escapeSQL(row['Deadlines (094)'] || '');

    // Financial data
    const obligations = escapeSQL((row['Obligations (122)'] || '').substring(0, 2000));
    const awardRange = escapeSQL((row['Range and Average of Financial Assistance (123)'] || '').substring(0, 1000));
    const accomplishments = escapeSQL((row['Program Accomplishments (130)'] || '').substring(0, 2000));

    sql += `INSERT OR REPLACE INTO federal_grants (cfda_number, title, popular_name, agency, objectives, assistance_type, beneficiary_eligibility, website, deadlines, is_student_aid, is_higher_ed, is_k12, is_career_tech, is_special_ed, obligations, award_range, accomplishments)
VALUES ('${num}', '${title}', '${popularName}', '${agency}', '${objectives}', '${assistanceType}', '${eligibility}', '${website}', '${deadlines}', ${categories.is_student_aid}, ${categories.is_higher_ed}, ${categories.is_k12}, ${categories.is_career_tech}, ${categories.is_special_ed}, '${obligations}', '${awardRange}', '${accomplishments}');

`;
  }

  // Write SQL file
  fs.writeFileSync(OUTPUT_PATH, sql);
  console.log(`Generated SQL file: ${OUTPUT_PATH}`);

  // Summary
  const studentAidCount = edPrograms.filter(r => STUDENT_AID_PROGRAMS.includes(r['Program Number'])).length;
  const higherEdCount = edPrograms.filter(r => {
    const cats = categorizeProgram(r);
    return cats.is_higher_ed === 1;
  }).length;

  console.log(`\nSummary:`);
  console.log(`  Total programs: ${edPrograms.length}`);
  console.log(`  Direct student aid: ${studentAidCount}`);
  console.log(`  Higher education related: ${higherEdCount}`);
}

main().catch(console.error);
