/**
 * Import NCES School Data from Urban Institute Education Data Portal API
 *
 * This script fetches all public school directory data from the Urban Institute's
 * Education Data Portal API and generates SQL INSERT statements for D1.
 *
 * API Documentation: https://educationdata.urban.org/documentation/
 */

import { writeFileSync, appendFileSync, existsSync, unlinkSync } from 'fs';

const API_BASE = 'https://educationdata.urban.org/api/v1/schools/ccd/directory';
const YEAR = 2022; // Most recent complete year available
const OUTPUT_FILE = './data/schools-import.sql';

// FIPS codes for all states + DC + PR
const STATE_FIPS = [
  1, 2, 4, 5, 6, 8, 9, 10, 11, 12, 13, 15, 16, 17, 18, 19, 20, 21, 22, 23,
  24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41,
  42, 44, 45, 46, 47, 48, 49, 50, 51, 53, 54, 55, 56, 72
];

// Map school_level codes to our schema
const SCHOOL_LEVEL_MAP = {
  1: 'Elementary',
  2: 'Middle',
  3: 'High',
  4: 'Other',
  0: 'Not Applicable',
  '-1': 'Not Reported',
  '-2': 'Not Applicable'
};

function escapeSQL(str) {
  if (str === null || str === undefined) return 'NULL';
  return `'${String(str).replace(/'/g, "''")}'`;
}

function toInt(val) {
  if (val === null || val === undefined) return 'NULL';
  const n = parseInt(val);
  return isNaN(n) ? 'NULL' : n;
}

function toFloat(val) {
  if (val === null || val === undefined) return 'NULL';
  const n = parseFloat(val);
  return isNaN(n) ? 'NULL' : n;
}

function generatePageName(schoolName, city, stateAbbr) {
  const slug = `${schoolName}-${city}-${stateAbbr}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return slug;
}

function schoolToSQL(school) {
  const isElementary = school.school_level === 1 || school.elem_cedp === 1 ? 1 : 0;
  const isMiddle = school.school_level === 2 || school.middle_cedp === 1 ? 1 : 0;
  const isHigh = school.school_level === 3 || school.high_cedp === 1 ? 1 : 0;
  const isPreschool = school.lowest_grade_offered === -1 ? 1 : 0;
  const isKindergarten = school.lowest_grade_offered === 0 ? 1 : 0;

  const pageName = generatePageName(school.school_name, school.city_location, school.state_location);

  return `INSERT INTO schools (
    school_name, page_name, nces_id,
    is_public, is_charter, is_magnet, is_high_school, is_middle_school, is_elementary, is_kindergarten, is_preschool,
    address, city, state, state_abbr, zip, county, lat, lng, locale,
    phone, website,
    district_name, district_nces_id,
    total_students, pk_students, k_students,
    free_lunch_students, reduced_lunch_students,
    pupil_teacher_ratio, fte_teachers,
    low_grade, high_grade, school_level,
    operational_status, active
  ) VALUES (
    ${escapeSQL(school.school_name)}, ${escapeSQL(pageName)}, ${escapeSQL(school.ncessch)},
    ${school.school_type === 1 ? 1 : 0}, ${school.charter === 1 ? 1 : 0}, ${school.magnet === 1 ? 1 : 0}, ${isHigh}, ${isMiddle}, ${isElementary}, ${isKindergarten}, ${isPreschool},
    ${escapeSQL(school.street_location)}, ${escapeSQL(school.city_location)}, ${escapeSQL(school.state_location)}, ${escapeSQL(school.state_location)}, ${escapeSQL(school.zip_location)}, ${escapeSQL(school.county_code)}, ${toFloat(school.latitude)}, ${toFloat(school.longitude)}, ${toInt(school.urban_centric_locale)},
    ${escapeSQL(school.phone)}, NULL,
    ${escapeSQL(school.lea_name)}, ${escapeSQL(school.leaid)},
    ${toInt(school.enrollment)}, NULL, NULL,
    ${toInt(school.free_lunch)}, ${toInt(school.reduced_price_lunch)},
    ${school.enrollment && school.teachers_fte ? toFloat(school.enrollment / school.teachers_fte) : 'NULL'}, ${toFloat(school.teachers_fte)},
    ${escapeSQL(school.lowest_grade_offered?.toString())}, ${escapeSQL(school.highest_grade_offered?.toString())}, ${escapeSQL(SCHOOL_LEVEL_MAP[school.school_level] || 'Unknown')},
    ${escapeSQL(school.school_status === 1 ? 'Open' : 'Closed')}, ${school.school_status === 1 ? 1 : 0}
  );`;
}

async function fetchStateSchools(fips) {
  const url = `${API_BASE}/${YEAR}/?fips=${fips}`;
  console.log(`Fetching state FIPS ${fips}...`);

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error(`Error fetching FIPS ${fips}:`, error.message);
    return [];
  }
}

async function main() {
  console.log('NCES School Data Import Script');
  console.log('==============================');
  console.log(`Fetching ${YEAR} school directory data from Urban Institute API\n`);

  // Remove old file if exists
  if (existsSync(OUTPUT_FILE)) {
    unlinkSync(OUTPUT_FILE);
  }

  // Write header
  writeFileSync(OUTPUT_FILE, `-- NCES School Directory Data Import\n-- Source: Urban Institute Education Data Portal\n-- Year: ${YEAR}\n-- Generated: ${new Date().toISOString()}\n\n`);

  let totalSchools = 0;

  for (const fips of STATE_FIPS) {
    const schools = await fetchStateSchools(fips);
    console.log(`  Found ${schools.length} schools`);

    if (schools.length > 0) {
      const sqlStatements = schools.map(schoolToSQL).join('\n');
      appendFileSync(OUTPUT_FILE, `\n-- State FIPS: ${fips}\n${sqlStatements}\n`);
      totalSchools += schools.length;
    }

    // Small delay to be nice to the API
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  console.log('\n==============================');
  console.log(`Total schools: ${totalSchools}`);
  console.log(`Output file: ${OUTPUT_FILE}`);
  console.log('\nTo import into D1:');
  console.log('  wrangler d1 execute trueschools-db --remote --file=./data/schools-import.sql');
}

main().catch(console.error);
