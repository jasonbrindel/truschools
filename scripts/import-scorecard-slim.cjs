/**
 * Slim College Scorecard Import
 *
 * Imports only the columns needed for the page design document.
 * Uses small JSON groups for related data that needs to stay together.
 *
 * ~46 regular columns + 5 small JSON fields = ~51 columns total
 * Covers all sections in docs/college-page-design.md
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const CSV_FILE = path.join(__dirname, '../data/college-scorecard/College_Scorecard_Raw_Data_05192025/Most-Recent-Cohorts-Institution.csv');
const OUTPUT_DIR = path.join(__dirname, '../data/college-scorecard/slim-import');

// Regular columns for instant queries
const REGULAR_COLUMNS = [
  // Identifiers
  'UNITID', 'OPEID', 'OPEID6', 'INSTNM', 'CITY', 'STABBR', 'ZIP',
  // Basic info
  'ACCREDAGENCY', 'INSTURL', 'NPCURL', 'PREDDEG', 'HIGHDEG', 'CONTROL',
  'LOCALE', 'MAIN', 'NUMBRANCH', 'CURROPER',
  // Designations
  'HBCU', 'PBI', 'HSI', 'TRIBAL', 'AANAPII', 'MENONLY', 'WOMENONLY', 'RELAFFIL', 'DISTANCEONLY',
  // Key metrics (hero stats)
  'ADM_RATE', 'SAT_AVG', 'UGDS', 'STUFACR', 'C150_4', 'C150_L4',
  'MD_EARN_WNE_P6', 'NPT4_PUB', 'NPT4_PRIV',
  // Costs
  'TUITIONFEE_IN', 'TUITIONFEE_OUT', 'COSTT4_A', 'COSTT4_P',
  // Aid
  'PCTPELL', 'PCTFLOAN', 'AVGFACSAL', 'INEXPFTE',
  // Completion
  'RET_FT4', 'RET_FTL4',
  // Debt summary
  'GRAD_DEBT_MDN', 'CDR3',
  // Additional debt/loan info
  'DEBT_MDN', 'CUML_DEBT_P90', 'RPY_3YR_RT',
  // Additional earnings
  'MD_EARN_WNE_P10', 'MN_EARN_WNE_P6', 'COUNT_WNE_P6'
];

// Small JSON groups (keeping related data together, limited size)
const JSON_GROUPS = {
  // Net price by income (~10 values)
  net_price: ['NPT41_PUB', 'NPT42_PUB', 'NPT43_PUB', 'NPT44_PUB', 'NPT45_PUB',
              'NPT41_PRIV', 'NPT42_PRIV', 'NPT43_PRIV', 'NPT44_PRIV', 'NPT45_PRIV'],
  // Test scores (~18 values)
  test_scores: ['SATVR25', 'SATVR50', 'SATVR75', 'SATMT25', 'SATMT50', 'SATMT75',
                'ACTCM25', 'ACTCM50', 'ACTCM75', 'ACTEN25', 'ACTEN50', 'ACTEN75',
                'ACTMT25', 'ACTMT50', 'ACTMT75'],
  // Earnings progression (~20 values)
  earnings: ['MD_EARN_WNE_P6', 'MD_EARN_WNE_P7', 'MD_EARN_WNE_P8', 'MD_EARN_WNE_P9', 'MD_EARN_WNE_P10',
             'PCT25_EARN_WNE_P6', 'PCT75_EARN_WNE_P6', 'PCT25_EARN_WNE_P10', 'PCT75_EARN_WNE_P10',
             'MD_EARN_WNE_INC1_P6', 'MD_EARN_WNE_INC2_P6', 'MD_EARN_WNE_INC3_P6'],
  // Demographics (~12 values)
  demographics: ['UGDS_WHITE', 'UGDS_BLACK', 'UGDS_HISP', 'UGDS_ASIAN', 'UGDS_AIAN',
                 'UGDS_NHPI', 'UGDS_2MOR', 'UGDS_NRA', 'UGDS_UNKN', 'UG25ABV', 'PPTUG_EF'],
  // Programs - top fields only (~20 values)
  programs: ['PCIP11', 'PCIP13', 'PCIP14', 'PCIP24', 'PCIP26', 'PCIP27', 'PCIP42', 'PCIP45',
             'PCIP50', 'PCIP51', 'PCIP52', 'PCIP54', 'PCIP43', 'PCIP09', 'PCIP23']
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

function cleanValue(val) {
  if (val === '' || val === 'NULL' || val === 'NA' || val === 'PrivacySuppressed' || val === 'PS') return null;
  const num = parseFloat(val);
  if (!isNaN(num) && isFinite(num)) return num;
  return val;
}

async function main() {
  console.log('=== Slim College Scorecard Import ===\n');

  const allColumns = await getColumns();
  console.log(`CSV has ${allColumns.length} columns\n`);

  // Build column index
  const colIndex = {};
  allColumns.forEach((col, idx) => { colIndex[col.toUpperCase()] = idx; });

  // Check which columns exist
  const foundRegular = REGULAR_COLUMNS.filter(c => colIndex[c.toUpperCase()] !== undefined);
  const missingRegular = REGULAR_COLUMNS.filter(c => colIndex[c.toUpperCase()] === undefined);
  console.log(`Regular columns: ${foundRegular.length} found, ${missingRegular.length} missing`);
  if (missingRegular.length > 0) console.log(`  Missing: ${missingRegular.join(', ')}`);

  // Generate schema
  let schema = `-- scorecard: Slim import with key fields + small JSON groups
-- Generated: ${new Date().toISOString()}
-- Regular columns: ${foundRegular.length}
-- JSON groups: ${Object.keys(JSON_GROUPS).length}

DROP TABLE IF EXISTS scorecard;

CREATE TABLE scorecard (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
`;

  const colDefs = foundRegular.map(c => `  ${toSqlColumn(c)} ${getSqlType(c)}`);
  const jsonDefs = Object.keys(JSON_GROUPS).map(g => `  ${g} TEXT`);
  schema += [...colDefs, ...jsonDefs].join(',\n') + '\n);\n\n';
  schema += `CREATE INDEX idx_scorecard_unitid ON scorecard(unitid);\n`;
  schema += `CREATE INDEX idx_scorecard_opeid ON scorecard(opeid);\n`;
  schema += `CREATE INDEX idx_scorecard_state ON scorecard(stabbr);\n`;

  fs.writeFileSync(path.join(OUTPUT_DIR, 'schema.sql'), schema);
  console.log('\nSchema written.\n');

  // Process CSV
  console.log('Processing CSV data...\n');
  const fileStream = fs.createReadStream(CSV_FILE);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let currentBatch = [];
  const BATCH_SIZE = 25;
  let lineNum = 0;
  let batchNum = 0;

  const columnList = [...foundRegular.map(c => toSqlColumn(c)), ...Object.keys(JSON_GROUPS)];

  for await (const line of rl) {
    lineNum++;
    if (lineNum === 1) continue;

    const values = parseCSVLine(line.replace(/^\uFEFF/, ''));
    const rowValues = [];

    // Regular columns
    foundRegular.forEach(col => {
      const idx = colIndex[col.toUpperCase()];
      const val = cleanValue(values[idx]);
      if (val === null) { rowValues.push('NULL'); return; }
      if (getSqlType(col) === 'TEXT') {
        rowValues.push(`'${String(val).replace(/'/g, "''")}'`);
      } else {
        rowValues.push(String(val));
      }
    });

    // JSON groups
    Object.entries(JSON_GROUPS).forEach(([group, cols]) => {
      const obj = {};
      cols.forEach(col => {
        const idx = colIndex[col.toUpperCase()];
        if (idx !== undefined) {
          const val = cleanValue(values[idx]);
          if (val !== null) obj[toSqlColumn(col)] = val;
        }
      });
      if (Object.keys(obj).length > 0) {
        rowValues.push(`'${JSON.stringify(obj).replace(/'/g, "''")}'`);
      } else {
        rowValues.push('NULL');
      }
    });

    currentBatch.push(`(${rowValues.join(', ')})`);

    if (currentBatch.length >= BATCH_SIZE) {
      const sql = `INSERT INTO scorecard (${columnList.join(', ')}) VALUES\n${currentBatch.join(',\n')};\n`;
      fs.writeFileSync(path.join(OUTPUT_DIR, `batch-${String(batchNum).padStart(3, '0')}.sql`), sql);
      batchNum++;
      currentBatch = [];
      if (lineNum % 2000 === 1) console.log(`${lineNum - 1} rows, ${batchNum} batches...`);
    }
  }

  if (currentBatch.length > 0) {
    const sql = `INSERT INTO scorecard (${columnList.join(', ')}) VALUES\n${currentBatch.join(',\n')};\n`;
    fs.writeFileSync(path.join(OUTPUT_DIR, `batch-${String(batchNum).padStart(3, '0')}.sql`), sql);
    batchNum++;
  }

  console.log(`\nDone! ${lineNum - 1} schools in ${batchNum} batches.\n`);

  // Import script
  const script = `#!/bin/bash
set -e
ACCOUNT_ID="db05e74e773d91c84692ba064111c43c"
DIR="data/college-scorecard/slim-import"

echo "Creating scorecard table..."
CLOUDFLARE_ACCOUNT_ID=$ACCOUNT_ID npx wrangler d1 execute trueschools-db --remote --file=$DIR/schema.sql

echo ""
echo "Importing data..."
for f in $DIR/batch-*.sql; do
  echo "  $(basename $f)"
  CLOUDFLARE_ACCOUNT_ID=$ACCOUNT_ID npx wrangler d1 execute trueschools-db --remote --file="$f"
done

echo ""
echo "Verifying..."
CLOUDFLARE_ACCOUNT_ID=$ACCOUNT_ID npx wrangler d1 execute trueschools-db --remote --command="SELECT COUNT(*) as total FROM scorecard"

echo "Done!"
`;
  fs.writeFileSync(path.join(OUTPUT_DIR, 'import.sh'), script);
  fs.chmodSync(path.join(OUTPUT_DIR, 'import.sh'), '755');

  console.log('Files in:', OUTPUT_DIR);
  console.log('Run: data/college-scorecard/slim-import/import.sh');
}

main().catch(console.error);
