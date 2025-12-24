/**
 * Import NCES Private School Data from PSS (Private School Universe Survey)
 *
 * This script reads the PSS CSV file and generates SQL INSERT statements for D1.
 * Data source: https://nces.ed.gov/surveys/pss/pssdata.asp
 */

import { readFileSync, writeFileSync, appendFileSync, existsSync, unlinkSync } from 'fs';
import { createReadStream } from 'fs';
import { createInterface } from 'readline';

const INPUT_FILE = './data/pss2122_pu.csv';
const OUTPUT_FILE = './data/private-schools-import.sql';

// Religion codes mapping
const RELIGION_MAP = {
  1: 'Roman Catholic',
  2: 'African Methodist Episcopal',
  3: 'Amish',
  4: 'Assembly of God',
  5: 'Baptist',
  6: 'Brethren',
  7: 'Calvinist',
  8: 'Christian (no specific denomination)',
  9: 'Church of Christ',
  10: 'Church of God',
  11: 'Church of God in Christ',
  12: 'Church of the Nazarene',
  13: 'Disciples of Christ',
  14: 'Episcopal',
  15: 'Friends',
  16: 'Greek Orthodox',
  17: 'Islamic',
  18: 'Jewish',
  19: 'Latter Day Saints',
  20: 'Lutheran Church - Loss, Synod',
  21: 'Lutheran Church - ELCA',
  22: 'Lutheran Church - Wisconsin Synod',
  23: 'Lutheran Church - Other',
  24: 'Mennonite',
  25: 'Methodist',
  26: 'Pentecostal',
  27: 'Presbyterian',
  28: 'Seventh-Day Adventist',
  29: 'Other',
  0: 'Non-sectarian'
};

// School level mapping
const LEVEL_MAP = {
  1: 'Elementary',
  2: 'Secondary',
  3: 'Combined'
};

// Orientation mapping
const ORIENT_MAP = {
  1: 'Regular',
  2: 'Montessori',
  3: 'Special program emphasis',
  4: 'Special education',
  5: 'Career/technical/vocational',
  6: 'Alternative',
  7: 'Early childhood'
};

function escapeSQL(str) {
  if (str === null || str === undefined || str === '') return 'NULL';
  return `'${String(str).replace(/'/g, "''")}'`;
}

function toInt(val) {
  if (val === null || val === undefined || val === '') return 'NULL';
  const n = parseInt(val);
  return isNaN(n) ? 'NULL' : n;
}

function toFloat(val) {
  if (val === null || val === undefined || val === '') return 'NULL';
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

function gradeCodeToString(code) {
  const gradeMap = {
    '-1': 'PK',
    '0': 'K',
    '1': '1', '2': '2', '3': '3', '4': '4', '5': '5', '6': '6',
    '7': '7', '8': '8', '9': '9', '10': '10', '11': '11', '12': '12',
    '13': 'UG' // Ungraded
  };
  return gradeMap[code] || code;
}

function determineSchoolLevel(level, lowGrade, highGrade) {
  // level: 1=Elementary, 2=Secondary, 3=Combined
  const low = parseInt(lowGrade);
  const high = parseInt(highGrade);

  // Use grades to determine level more accurately
  if (!isNaN(low) && !isNaN(high)) {
    if (high <= 5 && high >= -1) return 'Elementary';
    if (low >= 6 && low <= 8 && high <= 8) return 'Middle';
    if (low >= 9 || high >= 9) return 'High';
    if (low <= 5 && high >= 9) return 'Combined';
  }

  return LEVEL_MAP[level] || 'Unknown';
}

async function main() {
  console.log('NCES Private School Data Import Script');
  console.log('======================================');
  console.log(`Reading from: ${INPUT_FILE}`);
  console.log(`Output to: ${OUTPUT_FILE}\n`);

  // Remove old file if exists
  if (existsSync(OUTPUT_FILE)) {
    unlinkSync(OUTPUT_FILE);
  }

  // Write header
  writeFileSync(OUTPUT_FILE, `-- NCES Private School Directory Data Import
-- Source: Private School Universe Survey (PSS) 2021-22
-- Generated: ${new Date().toISOString()}

`);

  const fileStream = createReadStream(INPUT_FILE);
  const rl = createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let headers = [];
  let lineNum = 0;
  let totalSchools = 0;
  let batch = [];
  const BATCH_SIZE = 100;

  for await (const line of rl) {
    lineNum++;

    if (lineNum === 1) {
      // Parse headers
      headers = line.split(',');
      continue;
    }

    // Parse CSV line (handle quoted fields)
    const values = [];
    let inQuotes = false;
    let currentValue = '';

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(currentValue);
        currentValue = '';
      } else {
        currentValue += char;
      }
    }
    values.push(currentValue);

    // Create object from headers and values
    const school = {};
    headers.forEach((header, i) => {
      school[header] = values[i] || null;
    });

    // Skip if no school name
    if (!school.PINST) continue;

    const pageName = generatePageName(school.PINST, school.PCITY, school.PSTABB);
    const level = determineSchoolLevel(school.LEVEL, school.LOGR2022, school.HIGR2022);

    const isElementary = level === 'Elementary' || (parseInt(school.LOGR2022) <= 5 && parseInt(school.HIGR2022) <= 5) ? 1 : 0;
    const isMiddle = level === 'Middle' || (parseInt(school.LOGR2022) >= 6 && parseInt(school.HIGR2022) <= 8) ? 1 : 0;
    const isHigh = level === 'High' || parseInt(school.HIGR2022) >= 9 ? 1 : 0;
    const isPreschool = parseInt(school.LOGR2022) === -1 ? 1 : 0;
    const isKindergarten = parseInt(school.LOGR2022) === 0 ? 1 : 0;

    const sql = `INSERT INTO schools (
    school_name, page_name, nces_id,
    is_public, is_charter, is_magnet, is_high_school, is_middle_school, is_elementary, is_kindergarten, is_preschool,
    address, city, state, state_abbr, zip, county, lat, lng, locale,
    phone, website,
    district_name, district_nces_id,
    total_students, pk_students, k_students,
    free_lunch_students, reduced_lunch_students,
    pupil_teacher_ratio, fte_teachers,
    low_grade, high_grade, school_level,
    operational_status, active,
    religious_affiliation, school_orientation
  ) VALUES (
    ${escapeSQL(school.PINST)}, ${escapeSQL(pageName)}, ${escapeSQL(school.PPIN)},
    0, 0, 0, ${isHigh}, ${isMiddle}, ${isElementary}, ${isKindergarten}, ${isPreschool},
    ${escapeSQL(school.PADDRS)}, ${escapeSQL(school.PCITY)}, ${escapeSQL(school.PSTABB)}, ${escapeSQL(school.PSTABB)}, ${escapeSQL(school.PZIP)}, NULL, ${toFloat(school.LATITUDE22)}, ${toFloat(school.LONGITUDE22)}, ${toInt(school.ULOCALE22)},
    ${escapeSQL(school.PPHONE)}, NULL,
    NULL, NULL,
    ${toInt(school.NUMSTUDS)}, NULL, NULL,
    NULL, NULL,
    ${school.NUMSTUDS && school.NUMTEACH ? toFloat(parseFloat(school.NUMSTUDS) / parseFloat(school.NUMTEACH)) : 'NULL'}, ${toFloat(school.NUMTEACH)},
    ${escapeSQL(gradeCodeToString(school.LOGR2022))}, ${escapeSQL(gradeCodeToString(school.HIGR2022))}, ${escapeSQL(level)},
    'Open', 1,
    ${escapeSQL(RELIGION_MAP[school.RELIG] || null)}, ${escapeSQL(ORIENT_MAP[school.ORIENT] || null)}
  );`;

    batch.push(sql);
    totalSchools++;

    if (batch.length >= BATCH_SIZE) {
      appendFileSync(OUTPUT_FILE, batch.join('\n') + '\n');
      batch = [];

      if (totalSchools % 1000 === 0) {
        console.log(`  Processed ${totalSchools} schools...`);
      }
    }
  }

  // Write remaining batch
  if (batch.length > 0) {
    appendFileSync(OUTPUT_FILE, batch.join('\n') + '\n');
  }

  console.log('\n======================================');
  console.log(`Total private schools: ${totalSchools}`);
  console.log(`Output file: ${OUTPUT_FILE}`);
  console.log('\nTo import into D1:');
  console.log('  wrangler d1 execute trueschools-db --remote --file=./data/private-schools-import.sql');
}

main().catch(console.error);
