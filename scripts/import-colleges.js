/**
 * Import IPEDS College/University Data from Urban Institute Education Data Portal API
 *
 * This script fetches all postsecondary institution directory data from the Urban Institute's
 * Education Data Portal API and generates SQL INSERT statements for D1.
 *
 * API Documentation: https://educationdata.urban.org/documentation/
 */

import { writeFileSync, appendFileSync, existsSync, unlinkSync } from 'fs';

const API_BASE = 'https://educationdata.urban.org/api/v1/college-university/ipeds/directory';
const YEAR = 2022; // Most recent complete year available
const OUTPUT_FILE = './data/colleges-import.sql';

// FIPS codes for all states + DC + PR
const STATE_FIPS = [
  1, 2, 4, 5, 6, 8, 9, 10, 11, 12, 13, 15, 16, 17, 18, 19, 20, 21, 22, 23,
  24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41,
  42, 44, 45, 46, 47, 48, 49, 50, 51, 53, 54, 55, 56, 72
];

// Institution control mapping
const CONTROL_MAP = {
  1: 'Public',
  2: 'Private nonprofit',
  3: 'Private for-profit'
};

// Sector mapping
const SECTOR_MAP = {
  0: 'Administrative Unit',
  1: 'Public, 4-year or above',
  2: 'Private nonprofit, 4-year or above',
  3: 'Private for-profit, 4-year or above',
  4: 'Public, 2-year',
  5: 'Private nonprofit, 2-year',
  6: 'Private for-profit, 2-year',
  7: 'Public, less-than 2-year',
  8: 'Private nonprofit, less-than 2-year',
  9: 'Private for-profit, less-than 2-year',
  99: 'Sector unknown (not active)'
};

// Carnegie classification mapping (basic 2021)
const CARNEGIE_MAP = {
  1: 'Associate Colleges: High Transfer-High Traditional',
  2: 'Associate Colleges: High Transfer-Mixed Traditional/Nontraditional',
  3: 'Associate Colleges: High Transfer-High Nontraditional',
  4: 'Associate Colleges: Mixed Transfer/Career & Technical-High Traditional',
  5: 'Associate Colleges: Mixed Transfer/Career & Technical-Mixed Traditional/Nontraditional',
  6: 'Associate Colleges: Mixed Transfer/Career & Technical-High Nontraditional',
  7: 'Associate Colleges: High Career & Technical-High Traditional',
  8: 'Associate Colleges: High Career & Technical-Mixed Traditional/Nontraditional',
  9: 'Associate Colleges: High Career & Technical-High Nontraditional',
  10: 'Special Focus Two-Year: Health Professions',
  11: 'Special Focus Two-Year: Technical Professions',
  12: 'Special Focus Two-Year: Arts & Design',
  13: 'Special Focus Two-Year: Other Fields',
  14: 'Baccalaureate/Associate Colleges: Associate Dominant',
  15: 'Doctoral Universities: Very High Research Activity',
  16: 'Doctoral Universities: High Research Activity',
  17: 'Doctoral/Professional Universities',
  18: 'Masters Colleges & Universities: Larger Programs',
  19: 'Masters Colleges & Universities: Medium Programs',
  20: 'Masters Colleges & Universities: Small Programs',
  21: 'Baccalaureate Colleges: Arts & Sciences Focus',
  22: 'Baccalaureate Colleges: Diverse Fields',
  23: 'Baccalaureate/Associate Colleges: Mixed Baccalaureate/Associate',
  24: 'Special Focus Four-Year: Faith-Related Institutions',
  25: 'Special Focus Four-Year: Medical Schools & Centers',
  26: 'Special Focus Four-Year: Other Health Professions Schools',
  27: 'Special Focus Four-Year: Engineering Schools',
  28: 'Special Focus Four-Year: Other Technology-Related Schools',
  29: 'Special Focus Four-Year: Business & Management Schools',
  30: 'Special Focus Four-Year: Arts, Music & Design Schools',
  31: 'Special Focus Four-Year: Law Schools',
  32: 'Special Focus Four-Year: Other Special Focus Institutions',
  33: 'Tribal Colleges'
};

// Institution size mapping
const SIZE_MAP = {
  1: 'Under 1,000',
  2: '1,000 - 4,999',
  3: '5,000 - 9,999',
  4: '10,000 - 19,999',
  5: '20,000 and above',
  '-1': 'Not reported',
  '-2': 'Not applicable'
};

function escapeSQL(str) {
  if (str === null || str === undefined || str === '-2' || str === ' ') return 'NULL';
  return `'${String(str).replace(/'/g, "''")}'`;
}

function toInt(val) {
  if (val === null || val === undefined || val === '-2' || val === -2) return 'NULL';
  const n = parseInt(val);
  return isNaN(n) ? 'NULL' : n;
}

function toFloat(val) {
  if (val === null || val === undefined || val === '-2' || val === -2) return 'NULL';
  const n = parseFloat(val);
  return isNaN(n) ? 'NULL' : n;
}

function generatePageName(instName, city, stateAbbr) {
  const slug = `${instName}-${city}-${stateAbbr}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return slug;
}

function cleanUrl(url) {
  if (!url || url === '-2' || url === ' ' || url === '') return null;
  // Add https:// if no protocol
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return 'https://' + url;
  }
  return url;
}

function collegeToSQL(college) {
  const pageName = generatePageName(college.inst_name, college.city, college.state_abbr);
  const isActive = college.currently_active_ipeds === 1 ? 1 : 0;
  const website = cleanUrl(college.url_school);
  const isFourYear = [1, 2, 3].includes(college.sector) ? 1 : 0;
  const isTwoYear = [4, 5, 6].includes(college.sector) ? 1 : 0;

  return `INSERT INTO colleges (
    institution_name, page_name, ipeds_id, opeid,
    address, city, state, state_abbr, zip, county,
    lat, lng, locale,
    phone, website, website_admissions, website_financial_aid, website_net_price,
    institution_control, sector, carnegie_classification, institution_size,
    is_four_year, is_two_year, is_graduate,
    offers_undergrad, offers_graduate, is_degree_granting,
    hbcu, is_tribal, is_land_grant, is_title_iv,
    chief_admin_name, chief_admin_title,
    institution_system,
    operational_status, active
  ) VALUES (
    ${escapeSQL(college.inst_name)}, ${escapeSQL(pageName)}, ${escapeSQL(college.unitid?.toString())}, ${escapeSQL(college.opeid)},
    ${escapeSQL(college.address)}, ${escapeSQL(college.city)}, ${escapeSQL(college.state_abbr)}, ${escapeSQL(college.state_abbr)}, ${escapeSQL(college.zip)}, ${escapeSQL(college.county_name)},
    ${toFloat(college.latitude)}, ${toFloat(college.longitude)}, ${toInt(college.urban_centric_locale)},
    ${escapeSQL(college.phone_number)}, ${escapeSQL(website)}, ${escapeSQL(cleanUrl(college.url_application))}, ${escapeSQL(cleanUrl(college.url_fin_aid))}, ${escapeSQL(cleanUrl(college.url_netprice))},
    ${escapeSQL(CONTROL_MAP[college.inst_control] || null)}, ${escapeSQL(SECTOR_MAP[college.sector] || null)}, ${escapeSQL(CARNEGIE_MAP[college.cc_basic_2021] || null)}, ${escapeSQL(SIZE_MAP[college.inst_size] || null)},
    ${isFourYear}, ${isTwoYear}, ${college.offering_grad === 1 ? 1 : 0},
    ${college.offering_undergrad === 1 ? 1 : 0}, ${college.offering_grad === 1 ? 1 : 0}, ${college.degree_granting === 1 ? 1 : 0},
    ${college.hbcu === 1 ? 1 : 0}, ${college.tribal_college === 1 ? 1 : 0}, ${college.land_grant === 1 ? 1 : 0}, ${college.title_iv_indicator === 1 ? 1 : 0},
    ${escapeSQL(college.chief_admin_name)}, ${escapeSQL(college.chief_admin_title)},
    ${escapeSQL(college.inst_system_name !== '-2' ? college.inst_system_name : null)},
    ${escapeSQL(isActive ? 'Open' : 'Closed')}, ${isActive}
  );`;
}

async function fetchStateColleges(fips) {
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
  console.log('IPEDS College/University Data Import Script');
  console.log('============================================');
  console.log(`Fetching ${YEAR} institution directory data from Urban Institute API\n`);

  // Remove old file if exists
  if (existsSync(OUTPUT_FILE)) {
    unlinkSync(OUTPUT_FILE);
  }

  // Write header
  writeFileSync(OUTPUT_FILE, `-- IPEDS College/University Directory Data Import
-- Source: Urban Institute Education Data Portal
-- Year: ${YEAR}
-- Generated: ${new Date().toISOString()}

`);

  let totalColleges = 0;

  for (const fips of STATE_FIPS) {
    const colleges = await fetchStateColleges(fips);
    console.log(`  Found ${colleges.length} institutions`);

    if (colleges.length > 0) {
      // Filter to only active institutions
      const activeColleges = colleges.filter(c => c.currently_active_ipeds === 1);
      const sqlStatements = activeColleges.map(collegeToSQL).join('\n');
      appendFileSync(OUTPUT_FILE, `\n-- State FIPS: ${fips}\n${sqlStatements}\n`);
      totalColleges += activeColleges.length;
    }

    // Small delay to be nice to the API
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  console.log('\n============================================');
  console.log(`Total colleges/universities: ${totalColleges}`);
  console.log(`Output file: ${OUTPUT_FILE}`);
  console.log('\nTo import into D1:');
  console.log('  wrangler d1 execute trueschools-db --remote --file=./data/colleges-import.sql');
}

main().catch(console.error);
