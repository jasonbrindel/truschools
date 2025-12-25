/**
 * Import PRIORITY College Scorecard columns for page display
 *
 * This imports the columns needed for the comprehensive college detail page
 * as defined in docs/college-page-design.md
 *
 * We'll create 3 tables (under D1's 100-column limit):
 * - scorecard_main: Core info, costs, admissions (~95 columns)
 * - scorecard_outcomes: Earnings, completion, debt (~95 columns)
 * - scorecard_programs: Programs, demographics, institution details (~95 columns)
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const CSV_FILE = path.join(__dirname, '../data/college-scorecard/MERGED2023_24_PP.csv');
const OUTPUT_DIR = path.join(__dirname, '../data/college-scorecard/priority-import');

// Priority columns organized by table
const PRIORITY_COLUMNS = {
  scorecard_main: [
    // Identifiers
    'UNITID', 'OPEID', 'OPEID6', 'INSTNM', 'CITY', 'STABBR', 'ZIP',
    // Basic info
    'ACCREDAGENCY', 'INSTURL', 'NPCURL', 'SCH_DEG', 'HCM2', 'MAIN', 'NUMBRANCH',
    'PREDDEG', 'HIGHDEG', 'CONTROL', 'REGION', 'LOCALE', 'CCBASIC', 'CCUGPROF', 'CCSIZSET',
    // Special designations
    'HBCU', 'PBI', 'ANNHI', 'TRIBAL', 'AANAPII', 'HSI', 'NANTI', 'MENONLY', 'WOMENONLY', 'RELAFFIL',
    'DISTANCEONLY', 'CURROPER',
    // Costs - sticker price
    'TUITIONFEE_IN', 'TUITIONFEE_OUT', 'TUITIONFEE_PROG', 'TUITFTE', 'INEXPFTE',
    'COSTT4_A', 'COSTT4_P',
    // Net price - public
    'NPT4_PUB', 'NPT41_PUB', 'NPT42_PUB', 'NPT43_PUB', 'NPT44_PUB', 'NPT45_PUB',
    // Net price - private
    'NPT4_PRIV', 'NPT41_PRIV', 'NPT42_PRIV', 'NPT43_PRIV', 'NPT44_PRIV', 'NPT45_PRIV',
    // Financial aid
    'PCTPELL', 'PCTFLOAN', 'AVGFACSAL',
    // Admissions
    'ADM_RATE', 'ADM_RATE_ALL',
    'SATVR25', 'SATVR50', 'SATVR75', 'SATMT25', 'SATMT50', 'SATMT75', 'SAT_AVG',
    'ACTCM25', 'ACTCM50', 'ACTCM75', 'ACTEN25', 'ACTEN50', 'ACTEN75', 'ACTMT25', 'ACTMT50', 'ACTMT75',
    // Enrollment
    'UGDS', 'UG', 'PPTUG_EF', 'UG25ABV',
    // Student-faculty ratio
    'STUFACR',
    // Completion rates
    'C150_4', 'C150_L4', 'C200_4', 'C200_L4',
    // Retention
    'RET_FT4', 'RET_FTL4', 'RET_PT4', 'RET_PTL4'
  ],

  scorecard_outcomes: [
    'UNITID',
    // Earnings by year
    'MN_EARN_WNE_P6', 'MD_EARN_WNE_P6', 'PCT10_EARN_WNE_P6', 'PCT25_EARN_WNE_P6', 'PCT75_EARN_WNE_P6', 'PCT90_EARN_WNE_P6',
    'MN_EARN_WNE_P7', 'MD_EARN_WNE_P7', 'PCT10_EARN_WNE_P7', 'PCT25_EARN_WNE_P7', 'PCT75_EARN_WNE_P7', 'PCT90_EARN_WNE_P7',
    'MN_EARN_WNE_P8', 'MD_EARN_WNE_P8', 'PCT10_EARN_WNE_P8', 'PCT25_EARN_WNE_P8', 'PCT75_EARN_WNE_P8', 'PCT90_EARN_WNE_P8',
    'MN_EARN_WNE_P9', 'MD_EARN_WNE_P9', 'PCT10_EARN_WNE_P9', 'PCT25_EARN_WNE_P9', 'PCT75_EARN_WNE_P9', 'PCT90_EARN_WNE_P9',
    'MN_EARN_WNE_P10', 'MD_EARN_WNE_P10', 'PCT10_EARN_WNE_P10', 'PCT25_EARN_WNE_P10', 'PCT75_EARN_WNE_P10', 'PCT90_EARN_WNE_P10',
    'MN_EARN_WNE_P11', 'MD_EARN_WNE_P11', 'PCT10_EARN_WNE_P11', 'PCT25_EARN_WNE_P11', 'PCT75_EARN_WNE_P11', 'PCT90_EARN_WNE_P11',
    // Debt
    'GRAD_DEBT_MDN', 'WDRAW_DEBT_MDN', 'LO_INC_DEBT_MDN', 'MD_INC_DEBT_MDN', 'HI_INC_DEBT_MDN',
    'DEP_DEBT_MDN', 'IND_DEBT_MDN', 'PELL_DEBT_MDN', 'NOPELL_DEBT_MDN',
    'FEMALE_DEBT_MDN', 'MALE_DEBT_MDN', 'FIRSTGEN_DEBT_MDN',
    'CUML_DEBT_P10', 'CUML_DEBT_P25', 'CUML_DEBT_P75', 'CUML_DEBT_P90',
    'GRAD_DEBT_MDN10YR', 'REPAY_DT_MDN',
    // Default rates
    'CDR2', 'CDR3',
    // Completion by race
    'C150_4_WHITE', 'C150_4_BLACK', 'C150_4_HISP', 'C150_4_ASIAN', 'C150_4_AIAN', 'C150_4_NHPI', 'C150_4_2MOR',
    // Earnings by demographics
    'MD_EARN_WNE_INC1_P6', 'MD_EARN_WNE_INC2_P6', 'MD_EARN_WNE_INC3_P6',
    'MD_EARN_WNE_MALE0_P6', 'MD_EARN_WNE_MALE1_P6',
    'MD_EARN_WNE_INDEP0_P6', 'MD_EARN_WNE_INDEP1_P6'
  ],

  scorecard_programs: [
    'UNITID',
    // Demographics
    'UGDS_WHITE', 'UGDS_BLACK', 'UGDS_HISP', 'UGDS_ASIAN', 'UGDS_AIAN', 'UGDS_NHPI', 'UGDS_2MOR', 'UGDS_NRA', 'UGDS_UNKN',
    // Programs (PCIP = percentage in each field)
    'PCIP01', 'PCIP03', 'PCIP04', 'PCIP05', 'PCIP09', 'PCIP10', 'PCIP11', 'PCIP12', 'PCIP13', 'PCIP14', 'PCIP15', 'PCIP16',
    'PCIP19', 'PCIP22', 'PCIP23', 'PCIP24', 'PCIP25', 'PCIP26', 'PCIP27', 'PCIP29', 'PCIP30', 'PCIP31',
    'PCIP38', 'PCIP39', 'PCIP40', 'PCIP41', 'PCIP42', 'PCIP43', 'PCIP44', 'PCIP45', 'PCIP46', 'PCIP47', 'PCIP48', 'PCIP49',
    'PCIP50', 'PCIP51', 'PCIP52', 'PCIP54'
  ]
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
  if (upper.includes('URL') || upper.includes('NAME') || upper === 'ALIAS') return 'TEXT';
  return 'REAL';
}

function generateCreateTable(tableName, columns) {
  const defs = columns.map(c => `  ${toSqlColumn(c)} ${getSqlType(c)}`);
  let sql = `-- ${tableName} (${columns.length} columns)\nDROP TABLE IF EXISTS ${tableName};\n\n`;
  sql += `CREATE TABLE ${tableName} (\n  id INTEGER PRIMARY KEY AUTOINCREMENT,\n${defs.join(',\n')}\n);\n\n`;
  sql += `CREATE INDEX idx_${tableName}_unitid ON ${tableName}(unitid);\n`;
  return sql;
}

async function main() {
  console.log('=== Priority College Scorecard Import ===\n');

  const allColumns = await getColumns();
  console.log(`CSV has ${allColumns.length} columns\n`);

  // Build column index map
  const colIndex = {};
  allColumns.forEach((col, idx) => { colIndex[col.toUpperCase()] = idx; });

  // Validate and report missing columns
  const tables = Object.keys(PRIORITY_COLUMNS);
  const tableConfigs = [];

  for (const tableName of tables) {
    const requestedCols = PRIORITY_COLUMNS[tableName];
    const foundCols = [];
    const missingCols = [];

    requestedCols.forEach(col => {
      if (colIndex[col.toUpperCase()] !== undefined) {
        foundCols.push(col);
      } else {
        missingCols.push(col);
      }
    });

    console.log(`${tableName}: ${foundCols.length} columns found, ${missingCols.length} missing`);
    if (missingCols.length > 0) {
      console.log(`  Missing: ${missingCols.slice(0, 5).join(', ')}${missingCols.length > 5 ? '...' : ''}`);
    }

    // Generate schema
    const schema = generateCreateTable(tableName, foundCols);
    fs.writeFileSync(path.join(OUTPUT_DIR, `${tableName}-schema.sql`), schema);

    tableConfigs.push({
      tableName,
      columns: foundCols,
      indices: foundCols.map(c => colIndex[c.toUpperCase()])
    });
  }

  console.log('\nProcessing CSV data...\n');

  // Process CSV
  const fileStream = fs.createReadStream(CSV_FILE);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  const batches = tableConfigs.map(() => []);
  const batchNums = tableConfigs.map(() => 0);
  const BATCH_SIZE = 50;
  let lineNum = 0;

  for await (const line of rl) {
    lineNum++;
    if (lineNum === 1) continue;

    const values = parseCSVLine(line.replace(/^\uFEFF/, ''));

    tableConfigs.forEach((config, tIdx) => {
      const rowValues = config.indices.map((colIdx, i) => {
        const val = values[colIdx];
        if (val === '' || val === 'NULL' || val === 'NA' || val === 'PrivacySuppressed') return 'NULL';
        const sqlType = getSqlType(config.columns[i]);
        if (sqlType === 'TEXT') return `'${val.replace(/'/g, "''")}'`;
        const num = parseFloat(val);
        return isNaN(num) ? 'NULL' : val;
      });
      batches[tIdx].push(`(${rowValues.join(', ')})`);
    });

    if (batches[0].length >= BATCH_SIZE) {
      tableConfigs.forEach((config, tIdx) => {
        const sqlCols = config.columns.map(c => toSqlColumn(c)).join(', ');
        const sql = `INSERT INTO ${config.tableName} (${sqlCols}) VALUES\n${batches[tIdx].join(',\n')};\n`;
        fs.writeFileSync(path.join(OUTPUT_DIR, `${config.tableName}-batch-${String(batchNums[tIdx]).padStart(3, '0')}.sql`), sql);
        batchNums[tIdx]++;
        batches[tIdx] = [];
      });
      if (lineNum % 1000 === 1) console.log(`Processed ${lineNum - 1} rows...`);
    }
  }

  // Final batches
  if (batches[0].length > 0) {
    tableConfigs.forEach((config, tIdx) => {
      const sqlCols = config.columns.map(c => toSqlColumn(c)).join(', ');
      const sql = `INSERT INTO ${config.tableName} (${sqlCols}) VALUES\n${batches[tIdx].join(',\n')};\n`;
      fs.writeFileSync(path.join(OUTPUT_DIR, `${config.tableName}-batch-${String(batchNums[tIdx]).padStart(3, '0')}.sql`), sql);
      batchNums[tIdx]++;
    });
  }

  console.log(`\nDone! ${lineNum - 1} schools, ${batchNums[0]} batches per table.\n`);

  // Generate import script
  let script = '#!/bin/bash\nset -e\nACCOUNT_ID="db05e74e773d91c84692ba064111c43c"\n\n';
  tableConfigs.forEach(c => {
    script += `echo "Creating ${c.tableName}..."\n`;
    script += `CLOUDFLARE_ACCOUNT_ID=$ACCOUNT_ID npx wrangler d1 execute trueschools-db --remote --file=data/college-scorecard/priority-import/${c.tableName}-schema.sql\n\n`;
  });
  tableConfigs.forEach(c => {
    script += `echo "Importing ${c.tableName} data..."\n`;
    script += `for f in data/college-scorecard/priority-import/${c.tableName}-batch-*.sql; do\n`;
    script += `  echo "  $f"\n`;
    script += `  CLOUDFLARE_ACCOUNT_ID=$ACCOUNT_ID npx wrangler d1 execute trueschools-db --remote --file="$f"\n`;
    script += `done\n\n`;
  });
  script += 'echo "Done!"\n';
  fs.writeFileSync(path.join(OUTPUT_DIR, 'import.sh'), script);
  fs.chmodSync(path.join(OUTPUT_DIR, 'import.sh'), '755');

  console.log('Files generated in:', OUTPUT_DIR);
  console.log('Run: data/college-scorecard/priority-import/import.sh');
}

main().catch(console.error);
