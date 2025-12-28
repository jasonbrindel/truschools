/**
 * Import State Scholarship Programs from NASSGAP Survey Data
 *
 * Data source: https://www.nassgapsurvey.com/
 * - Lottery-funded programs (2003-2024)
 */

const fs = require('fs');
const path = require('path');

// Check for xlsx library
let XLSX;
try {
  XLSX = require('xlsx');
} catch (e) {
  console.log('Installing xlsx package...');
  require('child_process').execSync('npm install xlsx', { stdio: 'inherit' });
  XLSX = require('xlsx');
}

const LOTTERY_FILE = path.join(__dirname, '../data/state-grants/lottery_funded_programs_2003-2024.xlsx');
const OUTPUT_PATH = path.join(__dirname, '../data/state-grants/state_scholarships_import.sql');

function escapeSQL(str) {
  if (!str) return '';
  return String(str).replace(/'/g, "''").trim();
}

function normalizeState(state) {
  // Map various state representations to standard names
  const stateMap = {
    'SC CHE': 'South Carolina',
    'SC TGC': 'South Carolina',
    'Massachusettes': 'Massachusetts',
    'South Dakota ': 'South Dakota',
  };
  return stateMap[state] || state;
}

async function main() {
  console.log('Reading lottery-funded programs Excel file...');

  const workbook = XLSX.readFile(LOTTERY_FILE);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  // Convert to JSON
  const data = XLSX.utils.sheet_to_json(worksheet);

  console.log(`Found ${data.length} program records`);

  // Generate SQL
  let sql = `-- State Scholarship Programs Import
-- Generated: ${new Date().toISOString()}
-- Source: NASSGAP Annual Survey - Lottery Funded Programs

`;

  let insertCount = 0;

  for (const row of data) {
    const year = parseInt(row['Year']) || 0;
    const state = normalizeState(row['State'] || '');
    const programName = escapeSQL(row['Program Name'] || '');
    const expenditures = parseInt(row['Expenditures']) || 0;
    const recipients = parseInt(row['Recipients']) || 0;
    const lotteryFunding = parseInt(row['Lottery Funding']) || 0;

    if (year && state && programName) {
      sql += `INSERT OR REPLACE INTO state_scholarships (year, state, program_name, expenditures, recipients, lottery_funding)
VALUES (${year}, '${escapeSQL(state)}', '${programName}', ${expenditures}, ${recipients}, ${lotteryFunding});
`;
      insertCount++;
    }
  }

  // Write SQL file
  fs.writeFileSync(OUTPUT_PATH, sql);
  console.log(`Generated SQL file: ${OUTPUT_PATH}`);
  console.log(`Total records: ${insertCount}`);

  // Get unique programs for summary
  const uniquePrograms = new Set(data.map(r => `${r['State']}: ${r['Program Name']}`));
  const uniqueStates = new Set(data.map(r => normalizeState(r['State'])));

  console.log(`\nSummary:`);
  console.log(`  States: ${uniqueStates.size}`);
  console.log(`  Unique programs: ${uniquePrograms.size}`);
  console.log(`  Years: 2003-2024`);

  // List major programs
  console.log(`\nMajor Programs:`);
  const programCounts = {};
  data.forEach(r => {
    const prog = r['Program Name'];
    programCounts[prog] = (programCounts[prog] || 0) + 1;
  });

  Object.entries(programCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .forEach(([prog, count]) => {
      console.log(`  ${prog}: ${count} years`);
    });
}

main().catch(console.error);
