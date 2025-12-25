/**
 * Import ALL College Scorecard data using JSON fields
 *
 * This stores all 3,306 columns in a single table with structured JSON fields.
 * Benefits:
 * - Bypasses D1's 100-column limit
 * - All data accessible from one query
 * - Faster import (one table, fewer columns)
 * - Flexible - add new fields without schema changes
 *
 * Table structure:
 * - unitid: Primary key for joins
 * - basics: Name, city, state, type, accreditation
 * - costs: Tuition, net prices by income
 * - admissions: Acceptance rate, test scores
 * - outcomes: Earnings by year
 * - debt: Median debt, repayment
 * - completion: Graduation, retention rates
 * - programs: PCIP percentages
 * - demographics: Enrollment, race/ethnicity
 * - institution: Carnegie class, designations
 * - all_data: Everything else (comprehensive backup)
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const CSV_FILE = path.join(__dirname, '../data/college-scorecard/MERGED2023_24_PP.csv');
const OUTPUT_DIR = path.join(__dirname, '../data/college-scorecard/json-import');

// Column groupings for JSON fields
const COLUMN_GROUPS = {
  // Core identifiers (stored as regular columns)
  identifiers: ['UNITID', 'OPEID', 'OPEID6'],

  // Basic info
  basics: [
    'INSTNM', 'CITY', 'STABBR', 'ZIP', 'ACCREDAGENCY', 'INSTURL', 'NPCURL',
    'SCH_DEG', 'MAIN', 'NUMBRANCH', 'PREDDEG', 'HIGHDEG', 'CONTROL', 'REGION',
    'LOCALE', 'LATITUDE', 'LONGITUDE', 'CCBASIC', 'CCUGPROF', 'CCSIZSET', 'CURROPER'
  ],

  // Special designations
  designations: [
    'HBCU', 'PBI', 'ANNHI', 'TRIBAL', 'AANAPII', 'HSI', 'NANTI',
    'MENONLY', 'WOMENONLY', 'RELAFFIL', 'DISTANCEONLY', 'HCM2'
  ],

  // Costs and financial aid
  costs: [
    'TUITIONFEE_IN', 'TUITIONFEE_OUT', 'TUITIONFEE_PROG', 'TUITFTE', 'INEXPFTE',
    'COSTT4_A', 'COSTT4_P', 'AVGFACSAL',
    'NPT4_PUB', 'NPT41_PUB', 'NPT42_PUB', 'NPT43_PUB', 'NPT44_PUB', 'NPT45_PUB',
    'NPT4_PRIV', 'NPT41_PRIV', 'NPT42_PRIV', 'NPT43_PRIV', 'NPT44_PRIV', 'NPT45_PRIV',
    'PCTPELL', 'PCTFLOAN'
  ],

  // Admissions
  admissions: [
    'ADM_RATE', 'ADM_RATE_ALL',
    'SATVR25', 'SATVR50', 'SATVR75', 'SATMT25', 'SATMT50', 'SATMT75', 'SAT_AVG',
    'ACTCM25', 'ACTCM50', 'ACTCM75', 'ACTEN25', 'ACTEN50', 'ACTEN75',
    'ACTMT25', 'ACTMT50', 'ACTMT75'
  ],

  // Enrollment and demographics
  demographics: [
    'UGDS', 'UG', 'PPTUG_EF', 'UG25ABV', 'STUFACR',
    'UGDS_WHITE', 'UGDS_BLACK', 'UGDS_HISP', 'UGDS_ASIAN', 'UGDS_AIAN',
    'UGDS_NHPI', 'UGDS_2MOR', 'UGDS_NRA', 'UGDS_UNKN'
  ],

  // Completion rates
  completion: [
    'C150_4', 'C150_L4', 'C200_4', 'C200_L4',
    'RET_FT4', 'RET_FTL4', 'RET_PT4', 'RET_PTL4',
    'C150_4_WHITE', 'C150_4_BLACK', 'C150_4_HISP', 'C150_4_ASIAN',
    'C150_4_AIAN', 'C150_4_NHPI', 'C150_4_2MOR'
  ],

  // Programs (PCIP fields)
  programs: [
    'PCIP01', 'PCIP03', 'PCIP04', 'PCIP05', 'PCIP09', 'PCIP10', 'PCIP11', 'PCIP12',
    'PCIP13', 'PCIP14', 'PCIP15', 'PCIP16', 'PCIP19', 'PCIP22', 'PCIP23', 'PCIP24',
    'PCIP25', 'PCIP26', 'PCIP27', 'PCIP29', 'PCIP30', 'PCIP31', 'PCIP38', 'PCIP39',
    'PCIP40', 'PCIP41', 'PCIP42', 'PCIP43', 'PCIP44', 'PCIP45', 'PCIP46', 'PCIP47',
    'PCIP48', 'PCIP49', 'PCIP50', 'PCIP51', 'PCIP52', 'PCIP54'
  ]
};

// Patterns for dynamic grouping of remaining columns
const PATTERN_GROUPS = {
  earnings: /^(MN|MD|PCT\d+)_EARN/i,
  debt: /DEBT|CDR|REPAY|BBRR/i,
  cohort: /^(OMAW|OMENR|OMACHT)/i
};

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function getColumns() {
  const fileStream = fs.createReadStream(CSV_FILE);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });
  for await (const line of rl) {
    rl.close();
    return parseCSVLine(line.replace(/^\uFEFF/, ''));
  }
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

function toSqlColumn(name) {
  let sqlName = name.toLowerCase().replace(/[^a-z0-9_]/g, '_');
  if (/^[0-9]/.test(sqlName)) sqlName = 'col_' + sqlName;
  return sqlName;
}

// Classify column into a group
function classifyColumn(colName) {
  const upper = colName.toUpperCase();

  // Check explicit groups first
  for (const [group, cols] of Object.entries(COLUMN_GROUPS)) {
    if (cols.includes(upper)) return group;
  }

  // Check patterns
  for (const [group, pattern] of Object.entries(PATTERN_GROUPS)) {
    if (pattern.test(upper)) return group;
  }

  // Everything else goes to "other"
  return 'other';
}

function cleanValue(val) {
  if (val === '' || val === 'NULL' || val === 'NA' || val === 'PrivacySuppressed') {
    return null;
  }
  // Try to parse as number
  const num = parseFloat(val);
  if (!isNaN(num) && isFinite(num)) {
    return num;
  }
  return val;
}

async function main() {
  console.log('=== JSON-Based College Scorecard Import ===\n');

  const allColumns = await getColumns();
  console.log(`CSV has ${allColumns.length} columns\n`);

  // Build column classification
  const columnClassification = {};
  const groupCounts = {};

  allColumns.forEach((col, idx) => {
    const group = classifyColumn(col);
    columnClassification[col] = { index: idx, group };
    groupCounts[group] = (groupCounts[group] || 0) + 1;
  });

  console.log('Column groupings:');
  Object.entries(groupCounts).sort((a, b) => b[1] - a[1]).forEach(([group, count]) => {
    console.log(`  ${group}: ${count} columns`);
  });
  console.log('');

  // Generate schema
  const schema = `-- scorecard_json: All College Scorecard data with JSON fields
-- Generated: ${new Date().toISOString()}
-- Total source columns: ${allColumns.length}

DROP TABLE IF EXISTS scorecard_json;

CREATE TABLE scorecard_json (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  unitid TEXT NOT NULL UNIQUE,
  opeid TEXT,
  opeid6 TEXT,
  basics TEXT,        -- JSON: name, location, type, accreditation
  designations TEXT,  -- JSON: HBCU, HSI, etc.
  costs TEXT,         -- JSON: tuition, net prices, aid
  admissions TEXT,    -- JSON: acceptance rate, test scores
  demographics TEXT,  -- JSON: enrollment, race/ethnicity
  completion TEXT,    -- JSON: graduation rates, retention
  programs TEXT,      -- JSON: PCIP percentages by field
  earnings TEXT,      -- JSON: median earnings by year
  debt TEXT,          -- JSON: debt levels, repayment
  cohort TEXT,        -- JSON: detailed cohort tracking
  other TEXT          -- JSON: all remaining columns
);

CREATE INDEX idx_scorecard_json_unitid ON scorecard_json(unitid);
CREATE INDEX idx_scorecard_json_opeid ON scorecard_json(opeid);
`;

  fs.writeFileSync(path.join(OUTPUT_DIR, 'scorecard-json-schema.sql'), schema);
  console.log('Schema written.\n');

  // Process CSV
  console.log('Processing CSV data...\n');

  const fileStream = fs.createReadStream(CSV_FILE);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  const batches = [];
  let currentBatch = [];
  const BATCH_SIZE = 1; // Single row inserts due to massive JSON data per row
  let lineNum = 0;
  let batchNum = 0;

  const unitidIdx = allColumns.findIndex(c => c.toUpperCase() === 'UNITID');
  const opeidIdx = allColumns.findIndex(c => c.toUpperCase() === 'OPEID');
  const opeid6Idx = allColumns.findIndex(c => c.toUpperCase() === 'OPEID6');

  for await (const line of rl) {
    lineNum++;
    if (lineNum === 1) continue;

    const values = parseCSVLine(line.replace(/^\uFEFF/, ''));

    // Build JSON objects for each group
    const groups = {
      basics: {}, designations: {}, costs: {}, admissions: {},
      demographics: {}, completion: {}, programs: {},
      earnings: {}, debt: {}, cohort: {}, other: {}
    };

    allColumns.forEach((col, idx) => {
      if (['UNITID', 'OPEID', 'OPEID6'].includes(col.toUpperCase())) return;

      const val = cleanValue(values[idx]);
      if (val === null) return; // Skip null/empty values to save space

      const group = columnClassification[col].group;
      if (group === 'identifiers') return;

      const key = toSqlColumn(col);
      groups[group][key] = val;
    });

    // Build SQL values
    const unitid = values[unitidIdx] || '';
    const opeid = values[opeidIdx] || '';
    const opeid6 = values[opeid6Idx] || '';

    const sqlValues = [
      `'${unitid}'`,
      opeid ? `'${opeid}'` : 'NULL',
      opeid6 ? `'${opeid6}'` : 'NULL'
    ];

    // Add JSON fields (only if they have data)
    ['basics', 'designations', 'costs', 'admissions', 'demographics',
     'completion', 'programs', 'earnings', 'debt', 'cohort', 'other'].forEach(group => {
      const obj = groups[group];
      if (Object.keys(obj).length > 0) {
        const json = JSON.stringify(obj).replace(/'/g, "''");
        sqlValues.push(`'${json}'`);
      } else {
        sqlValues.push('NULL');
      }
    });

    currentBatch.push(`(${sqlValues.join(', ')})`);

    if (currentBatch.length >= BATCH_SIZE) {
      const cols = 'unitid, opeid, opeid6, basics, designations, costs, admissions, demographics, completion, programs, earnings, debt, cohort, other';
      const sql = `INSERT INTO scorecard_json (${cols}) VALUES\n${currentBatch.join(',\n')};\n`;
      fs.writeFileSync(path.join(OUTPUT_DIR, `scorecard-json-batch-${String(batchNum).padStart(3, '0')}.sql`), sql);
      batchNum++;
      currentBatch = [];

      if (lineNum % 1000 === 1) {
        console.log(`Processed ${lineNum - 1} rows, ${batchNum} batches...`);
      }
    }
  }

  // Final batch
  if (currentBatch.length > 0) {
    const cols = 'unitid, opeid, opeid6, basics, designations, costs, admissions, demographics, completion, programs, earnings, debt, cohort, other';
    const sql = `INSERT INTO scorecard_json (${cols}) VALUES\n${currentBatch.join(',\n')};\n`;
    fs.writeFileSync(path.join(OUTPUT_DIR, `scorecard-json-batch-${String(batchNum).padStart(3, '0')}.sql`), sql);
    batchNum++;
  }

  console.log(`\nDone! ${lineNum - 1} schools in ${batchNum} batches.\n`);

  // Generate import script
  let script = `#!/bin/bash
set -e
ACCOUNT_ID="db05e74e773d91c84692ba064111c43c"
DIR="data/college-scorecard/json-import"

echo "Creating scorecard_json table..."
CLOUDFLARE_ACCOUNT_ID=$ACCOUNT_ID npx wrangler d1 execute trueschools-db --remote --file=$DIR/scorecard-json-schema.sql

echo ""
echo "Importing data..."
for f in $DIR/scorecard-json-batch-*.sql; do
  echo "  $(basename $f)"
  CLOUDFLARE_ACCOUNT_ID=$ACCOUNT_ID npx wrangler d1 execute trueschools-db --remote --file="$f"
  sleep 1
done

echo ""
echo "Done!"
`;
  fs.writeFileSync(path.join(OUTPUT_DIR, 'import.sh'), script);
  fs.chmodSync(path.join(OUTPUT_DIR, 'import.sh'), '755');

  console.log('Files generated in:', OUTPUT_DIR);
  console.log('Run: data/college-scorecard/json-import/import.sh');
}

main().catch(console.error);
