/**
 * Update Magnet School Flags from 2019 NCES Data
 *
 * The 2022 NCES data doesn't include magnet school status (NCES moved it to CRDC).
 * This script fetches 2019 data which has magnet info and generates UPDATE statements
 * to flag magnet schools in our database by matching NCES IDs.
 */

import { writeFileSync, appendFileSync, existsSync, unlinkSync } from 'fs';

const API_BASE = 'https://educationdata.urban.org/api/v1/schools/ccd/directory';
const YEAR = 2019; // Last year with magnet data in CCD
const OUTPUT_FILE = './data/update-magnet-schools.sql';

// FIPS codes for all states + DC + PR
const STATE_FIPS = [
  1, 2, 4, 5, 6, 8, 9, 10, 11, 12, 13, 15, 16, 17, 18, 19, 20, 21, 22, 23,
  24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41,
  42, 44, 45, 46, 47, 48, 49, 50, 51, 53, 54, 55, 56, 72
];

async function fetchMagnetSchools(fips) {
  const url = `${API_BASE}/${YEAR}/?fips=${fips}&magnet=1`;
  console.log(`Fetching magnet schools for state FIPS ${fips}...`);

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
  console.log('Magnet School Flag Update Script');
  console.log('=================================');
  console.log(`Fetching ${YEAR} magnet school data from Urban Institute API\n`);

  // Remove old file if exists
  if (existsSync(OUTPUT_FILE)) {
    unlinkSync(OUTPUT_FILE);
  }

  // Write header
  writeFileSync(OUTPUT_FILE, `-- Magnet School Flag Updates
-- Source: Urban Institute Education Data Portal (${YEAR} CCD data)
-- Generated: ${new Date().toISOString()}
-- This updates is_magnet flag for schools matching NCES IDs from 2019 data

`);

  let totalMagnetSchools = 0;
  const allNcesIds = [];

  for (const fips of STATE_FIPS) {
    const schools = await fetchMagnetSchools(fips);

    if (schools.length > 0) {
      console.log(`  Found ${schools.length} magnet schools`);

      for (const school of schools) {
        if (school.ncessch) {
          allNcesIds.push(school.ncessch);
        }
      }

      totalMagnetSchools += schools.length;
    } else {
      console.log(`  No magnet schools found`);
    }

    // Small delay to be nice to the API
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  // Generate UPDATE statements in batches of 100 IDs
  const batchSize = 100;
  for (let i = 0; i < allNcesIds.length; i += batchSize) {
    const batch = allNcesIds.slice(i, i + batchSize);
    const idList = batch.map(id => `'${id}'`).join(', ');
    appendFileSync(OUTPUT_FILE, `UPDATE schools SET is_magnet = 1 WHERE nces_id IN (${idList});\n`);
  }

  console.log('\n=================================');
  console.log(`Total magnet schools found: ${totalMagnetSchools}`);
  console.log(`Output file: ${OUTPUT_FILE}`);
  console.log('\nTo apply updates to D1:');
  console.log('  npx wrangler d1 execute trueschools-db --remote --file=./data/update-magnet-schools.sql');
}

main().catch(console.error);
