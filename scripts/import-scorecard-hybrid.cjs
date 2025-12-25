/**
 * Hybrid College Scorecard Import
 *
 * Strategy: Store frequently-used columns as regular fields for fast querying,
 * and group remaining data into JSON fields by category.
 *
 * This balances:
 * - Fast queries for common fields (no JSON parsing)
 * - All data still available via JSON for comprehensive display
 * - Under D1's 100-column limit
 *
 * Table structure (~90 columns):
 * - Regular columns: ~60 most-used fields (instant queries)
 * - JSON columns: ~30 groups of related data
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const CSV_FILE = path.join(__dirname, '../data/college-scorecard/MERGED2023_24_PP.csv');
const OUTPUT_DIR = path.join(__dirname, '../data/college-scorecard/hybrid-import');

// Priority columns stored as regular fields for fast querying
const PRIORITY_COLUMNS = [
  // Identifiers
  'UNITID', 'OPEID', 'OPEID6',
  // Basic info
  'INSTNM', 'CITY', 'STABBR', 'ZIP', 'ACCREDAGENCY', 'INSTURL', 'NPCURL',
  'PREDDEG', 'HIGHDEG', 'CONTROL', 'LOCALE', 'MAIN',
  // Designations
  'HBCU', 'HSI', 'MENONLY', 'WOMENONLY', 'DISTANCEONLY',
  // Key metrics
  'ADM_RATE', 'SAT_AVG', 'UGDS', 'STUFACR',
  'TUITIONFEE_IN', 'TUITIONFEE_OUT', 'NPT4_PUB', 'NPT4_PRIV',
  'PCTPELL', 'PCTFLOAN',
  'C150_4', 'C150_L4', 'RET_FT4', 'RET_FTL4',
  'MD_EARN_WNE_P6', 'MD_EARN_WNE_P10',
  'GRAD_DEBT_MDN', 'CDR3'
];

// JSON groups for remaining data
const JSON_GROUPS = {
  costs_detail: /^(NPT4[12345]|COSTT4|TUITIONFEE|TUITFTE|INEXPFTE|AVGFACSAL)/i,
  admissions_detail: /^(SAT|ACT|ADM_RATE)/i,
  earnings_all: /EARN/i,
  debt_all: /DEBT|CDR|REPAY|BBRR/i,
  completion_all: /^(C150|C200|RET_)/i,
  demographics: /^UGDS_|^UG25|PPTUG/i,
  programs: /^PCIP/i,
  institution: /^(CCBASIC|CCUGPROF|CCSIZSET|REGION|LATITUDE|LONGITUDE|NUMBRANCH|RELAFFIL)/i
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

function getSqlType(colName) {
  const upper = colName.toUpperCase();
  if (['INSTNM', 'CITY', 'STABBR', 'ZIP', 'INSTURL', 'NPCURL', 'ACCREDAGENCY', 'UNITID', 'OPEID', 'OPEID6'].includes(upper)) return 'TEXT';
  if (upper.includes('URL') || upper.includes('NAME')) return 'TEXT';
  return 'REAL';
}

function classifyColumn(colName) {
  const upper = colName.toUpperCase();
  if (PRIORITY_COLUMNS.includes(upper)) return 'priority';
  for (const [group, pattern] of Object.entries(JSON_GROUPS)) {
    if (pattern.test(upper)) return group;
  }
  return null; // Skip unclassified columns
}

function cleanValue(val) {
  if (val === '' || val === 'NULL' || val === 'NA' || val === 'PrivacySuppressed') return null;
  const num = parseFloat(val);
  if (!isNaN(num) && isFinite(num)) return num;
  return val;
}

async function main() {
  console.log('=== Hybrid College Scorecard Import ===\n');

  const allColumns = await getColumns();
  console.log(`CSV has ${allColumns.length} columns\n`);

  // Build column map
  const colMap = {};
  const stats = { priority: 0, ...Object.fromEntries(Object.keys(JSON_GROUPS).map(k => [k, 0])), skipped: 0 };

  allColumns.forEach((col, idx) => {
    const group = classifyColumn(col);
    if (group) {
      colMap[col] = { idx, group };
      stats[group]++;
    } else {
      stats.skipped++;
    }
  });

  console.log('Column distribution:');
  Object.entries(stats).forEach(([k, v]) => console.log(`  ${k}: ${v}`));
  console.log('');

  // Generate schema
  let schema = `-- scorecard_hybrid: Key fields + JSON groups
-- Generated: ${new Date().toISOString()}

DROP TABLE IF EXISTS scorecard_hybrid;

CREATE TABLE scorecard_hybrid (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
`;

  // Add priority columns
  const priorityDefs = PRIORITY_COLUMNS.map(col => `  ${toSqlColumn(col)} ${getSqlType(col)}`);
  schema += priorityDefs.join(',\n') + ',\n';

  // Add JSON columns
  const jsonCols = Object.keys(JSON_GROUPS).map(g => `  ${g} TEXT`);
  schema += jsonCols.join(',\n') + '\n);\n\n';

  schema += `CREATE INDEX idx_scorecard_hybrid_unitid ON scorecard_hybrid(unitid);\n`;
  schema += `CREATE INDEX idx_scorecard_hybrid_state ON scorecard_hybrid(stabbr);\n`;

  fs.writeFileSync(path.join(OUTPUT_DIR, 'schema.sql'), schema);
  console.log('Schema written.\n');

  // Process CSV
  console.log('Processing CSV data...\n');
  const fileStream = fs.createReadStream(CSV_FILE);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let currentBatch = [];
  const BATCH_SIZE = 10;
  let lineNum = 0;
  let batchNum = 0;

  const columnList = [...PRIORITY_COLUMNS.map(c => toSqlColumn(c)), ...Object.keys(JSON_GROUPS)];

  for await (const line of rl) {
    lineNum++;
    if (lineNum === 1) continue;

    const values = parseCSVLine(line.replace(/^\uFEFF/, ''));

    // Build row values
    const rowValues = [];

    // Priority columns
    PRIORITY_COLUMNS.forEach(col => {
      const info = colMap[col];
      if (!info) { rowValues.push('NULL'); return; }
      const val = cleanValue(values[info.idx]);
      if (val === null) { rowValues.push('NULL'); return; }
      if (getSqlType(col) === 'TEXT') {
        rowValues.push(`'${String(val).replace(/'/g, "''")}'`);
      } else {
        rowValues.push(String(val));
      }
    });

    // JSON columns
    Object.keys(JSON_GROUPS).forEach(group => {
      const obj = {};
      allColumns.forEach((col, idx) => {
        const info = colMap[col];
        if (info && info.group === group) {
          const val = cleanValue(values[idx]);
          if (val !== null) {
            obj[toSqlColumn(col)] = val;
          }
        }
      });
      if (Object.keys(obj).length > 0) {
        const json = JSON.stringify(obj).replace(/'/g, "''");
        rowValues.push(`'${json}'`);
      } else {
        rowValues.push('NULL');
      }
    });

    currentBatch.push(`(${rowValues.join(', ')})`);

    if (currentBatch.length >= BATCH_SIZE) {
      const sql = `INSERT INTO scorecard_hybrid (${columnList.join(', ')}) VALUES\n${currentBatch.join(',\n')};\n`;
      fs.writeFileSync(path.join(OUTPUT_DIR, `batch-${String(batchNum).padStart(3, '0')}.sql`), sql);
      batchNum++;
      currentBatch = [];
      if (lineNum % 1000 === 1) console.log(`${lineNum - 1} rows, ${batchNum} batches...`);
    }
  }

  if (currentBatch.length > 0) {
    const sql = `INSERT INTO scorecard_hybrid (${columnList.join(', ')}) VALUES\n${currentBatch.join(',\n')};\n`;
    fs.writeFileSync(path.join(OUTPUT_DIR, `batch-${String(batchNum).padStart(3, '0')}.sql`), sql);
    batchNum++;
  }

  console.log(`\nDone! ${lineNum - 1} schools in ${batchNum} batches.\n`);

  // Import script
  const script = `#!/bin/bash
set -e
ACCOUNT_ID="db05e74e773d91c84692ba064111c43c"
DIR="data/college-scorecard/hybrid-import"

echo "Creating table..."
CLOUDFLARE_ACCOUNT_ID=$ACCOUNT_ID npx wrangler d1 execute trueschools-db --remote --file=$DIR/schema.sql

echo "Importing data..."
for f in $DIR/batch-*.sql; do
  echo "  $(basename $f)"
  CLOUDFLARE_ACCOUNT_ID=$ACCOUNT_ID npx wrangler d1 execute trueschools-db --remote --file="$f"
  sleep 0.5
done

echo "Done!"
`;
  fs.writeFileSync(path.join(OUTPUT_DIR, 'import.sh'), script);
  fs.chmodSync(path.join(OUTPUT_DIR, 'import.sh'), '755');

  console.log('Files in:', OUTPUT_DIR);
  console.log('Run: data/college-scorecard/hybrid-import/import.sh');
}

main().catch(console.error);
