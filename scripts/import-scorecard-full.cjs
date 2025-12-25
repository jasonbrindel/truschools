/**
 * Import ALL College Scorecard data (3,306 columns)
 *
 * This script imports the complete College Scorecard dataset into the database.
 * Per project requirements: "comprehensive data is the differentiator"
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const CSV_FILE = path.join(__dirname, '../data/college-scorecard/MERGED2023_24_PP.csv');
const OUTPUT_DIR = path.join(__dirname, '../data/college-scorecard');

// Read the header to get all column names
async function getColumns() {
  const fileStream = fs.createReadStream(CSV_FILE);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    rl.close();
    // Remove BOM if present
    const cleanLine = line.replace(/^\uFEFF/, '');
    return parseCSVLine(cleanLine);
  }
}

// Parse a CSV line handling quoted fields
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
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

// Convert scorecard column name to SQL-safe column name
function toSqlColumn(name) {
  // Remove any non-alphanumeric characters except underscore
  let sqlName = name.toLowerCase().replace(/[^a-z0-9_]/g, '_');

  // Ensure it doesn't start with a number
  if (/^[0-9]/.test(sqlName)) {
    sqlName = 'col_' + sqlName;
  }

  return sqlName;
}

// Determine SQL type based on column name and sample values
function getSqlType(colName) {
  const upperName = colName.toUpperCase();

  // Text fields
  if (['INSTNM', 'CITY', 'STABBR', 'ZIP', 'INSTURL', 'NPCURL', 'ACCREDAGENCY'].includes(upperName)) {
    return 'TEXT';
  }
  if (upperName.includes('URL') || upperName.includes('NAME') || upperName === 'ALIAS') {
    return 'TEXT';
  }

  // ID fields - keep as TEXT to preserve leading zeros
  if (['UNITID', 'OPEID', 'OPEID6'].includes(upperName)) {
    return 'TEXT';
  }

  // Everything else is numeric (REAL to handle both integers and decimals)
  return 'REAL';
}

// Generate CREATE TABLE statement for scorecard_data table
function generateCreateTable(columns) {
  const columnDefs = columns.map(col => {
    const sqlCol = toSqlColumn(col);
    const sqlType = getSqlType(col);
    return `  ${sqlCol} ${sqlType}`;
  });

  // Add our custom columns
  columnDefs.push('  created_at TEXT DEFAULT CURRENT_TIMESTAMP');
  columnDefs.push('  updated_at TEXT DEFAULT CURRENT_TIMESTAMP');

  return `-- Full College Scorecard data table (${columns.length} columns from source)
-- Generated: ${new Date().toISOString()}

DROP TABLE IF EXISTS scorecard_data;

CREATE TABLE scorecard_data (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
${columnDefs.join(',\n')}
);

-- Index on UNITID for joins
CREATE INDEX idx_scorecard_unitid ON scorecard_data(unitid);
CREATE INDEX idx_scorecard_opeid ON scorecard_data(opeid);
CREATE INDEX idx_scorecard_state ON scorecard_data(stabbr);
`;
}

// Process CSV and generate SQL INSERT statements
async function processCSV(columns) {
  const fileStream = fs.createReadStream(CSV_FILE);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  const sqlColumns = columns.map(c => toSqlColumn(c));
  let lineNum = 0;
  let batchNum = 0;
  let currentBatch = [];
  const BATCH_SIZE = 100;

  console.log(`Processing ${columns.length} columns...`);

  for await (const line of rl) {
    lineNum++;

    // Skip header
    if (lineNum === 1) continue;

    const cleanLine = line.replace(/^\uFEFF/, '');
    const values = parseCSVLine(cleanLine);

    if (values.length !== columns.length) {
      console.warn(`Line ${lineNum}: Expected ${columns.length} columns, got ${values.length}`);
      continue;
    }

    // Build INSERT statement
    const sqlValues = values.map((val, idx) => {
      if (val === '' || val === 'NULL' || val === 'NA' || val === 'PrivacySuppressed') {
        return 'NULL';
      }

      const colName = columns[idx].toUpperCase();
      const sqlType = getSqlType(colName);

      if (sqlType === 'TEXT') {
        // Escape single quotes
        return `'${val.replace(/'/g, "''")}'`;
      } else {
        // Numeric - validate
        const num = parseFloat(val);
        if (isNaN(num)) {
          return 'NULL';
        }
        return val;
      }
    });

    currentBatch.push(`(${sqlValues.join(', ')})`);

    // Write batch
    if (currentBatch.length >= BATCH_SIZE) {
      const batchFile = path.join(OUTPUT_DIR, `scorecard-full-batch-${String(batchNum).padStart(4, '0')}.sql`);
      const insertSql = `INSERT INTO scorecard_data (${sqlColumns.join(', ')}) VALUES\n${currentBatch.join(',\n')};\n`;
      fs.writeFileSync(batchFile, insertSql);
      console.log(`Wrote batch ${batchNum} (${currentBatch.length} rows)`);

      batchNum++;
      currentBatch = [];
    }

    if (lineNum % 1000 === 0) {
      console.log(`Processed ${lineNum} rows...`);
    }
  }

  // Write final batch
  if (currentBatch.length > 0) {
    const batchFile = path.join(OUTPUT_DIR, `scorecard-full-batch-${String(batchNum).padStart(4, '0')}.sql`);
    const insertSql = `INSERT INTO scorecard_data (${sqlColumns.join(', ')}) VALUES\n${currentBatch.join(',\n')};\n`;
    fs.writeFileSync(batchFile, insertSql);
    console.log(`Wrote final batch ${batchNum} (${currentBatch.length} rows)`);
  }

  console.log(`\nComplete! Processed ${lineNum - 1} schools into ${batchNum + 1} batch files.`);
  return batchNum + 1;
}

async function main() {
  console.log('=== Full College Scorecard Import ===\n');
  console.log('Reading columns from CSV...');

  const columns = await getColumns();
  console.log(`Found ${columns.length} columns\n`);

  // Generate and save CREATE TABLE
  const createTableSql = generateCreateTable(columns);
  const schemaFile = path.join(OUTPUT_DIR, 'scorecard-full-schema.sql');
  fs.writeFileSync(schemaFile, createTableSql);
  console.log(`Schema written to: ${schemaFile}\n`);

  // Save column mapping for reference
  const columnMapping = columns.map(c => ({
    original: c,
    sql: toSqlColumn(c),
    type: getSqlType(c)
  }));
  const mappingFile = path.join(OUTPUT_DIR, 'column-mapping.json');
  fs.writeFileSync(mappingFile, JSON.stringify(columnMapping, null, 2));
  console.log(`Column mapping written to: ${mappingFile}\n`);

  // Process CSV into SQL batches
  console.log('Processing CSV data...\n');
  const numBatches = await processCSV(columns);

  console.log(`\n=== Next Steps ===`);
  console.log(`1. Run schema: wrangler d1 execute trueschools-db --remote --file=${schemaFile}`);
  console.log(`2. Import batches: for i in ${OUTPUT_DIR}/scorecard-full-batch-*.sql; do wrangler d1 execute trueschools-db --remote --file="$i"; done`);
}

main().catch(console.error);
