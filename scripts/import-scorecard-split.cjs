/**
 * Import ALL College Scorecard data (3,306 columns) - Split into multiple tables
 *
 * SQLite has a 2000 column limit, so we split into:
 * - scorecard_data: First 1900 columns (core data)
 * - scorecard_data_ext: Remaining columns (extended data)
 *
 * Both tables share unitid for joining.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const CSV_FILE = path.join(__dirname, '../data/college-scorecard/MERGED2023_24_PP.csv');
const OUTPUT_DIR = path.join(__dirname, '../data/college-scorecard');

const COLUMNS_PER_TABLE = 1900; // Leave room for id, created_at, updated_at

// Read the header to get all column names
async function getColumns() {
  const fileStream = fs.createReadStream(CSV_FILE);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    rl.close();
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
  let sqlName = name.toLowerCase().replace(/[^a-z0-9_]/g, '_');
  if (/^[0-9]/.test(sqlName)) {
    sqlName = 'col_' + sqlName;
  }
  return sqlName;
}

// Determine SQL type based on column name
function getSqlType(colName) {
  const upperName = colName.toUpperCase();

  if (['INSTNM', 'CITY', 'STABBR', 'ZIP', 'INSTURL', 'NPCURL', 'ACCREDAGENCY'].includes(upperName)) {
    return 'TEXT';
  }
  if (upperName.includes('URL') || upperName.includes('NAME') || upperName === 'ALIAS') {
    return 'TEXT';
  }
  if (['UNITID', 'OPEID', 'OPEID6'].includes(upperName)) {
    return 'TEXT';
  }
  return 'REAL';
}

// Generate CREATE TABLE statement
function generateCreateTable(tableName, columns, includeUnitid = false) {
  const columnDefs = [];

  // For extended table, add unitid as first column for joining
  if (includeUnitid) {
    columnDefs.push('  unitid TEXT');
  }

  columns.forEach(col => {
    const sqlCol = toSqlColumn(col);
    const sqlType = getSqlType(col);
    columnDefs.push(`  ${sqlCol} ${sqlType}`);
  });

  columnDefs.push('  created_at TEXT DEFAULT CURRENT_TIMESTAMP');
  columnDefs.push('  updated_at TEXT DEFAULT CURRENT_TIMESTAMP');

  let sql = `-- ${tableName} table (${columns.length} columns from source)\n`;
  sql += `-- Generated: ${new Date().toISOString()}\n\n`;
  sql += `DROP TABLE IF EXISTS ${tableName};\n\n`;
  sql += `CREATE TABLE ${tableName} (\n`;
  sql += `  id INTEGER PRIMARY KEY AUTOINCREMENT,\n`;
  sql += columnDefs.join(',\n');
  sql += '\n);\n\n';

  // Add indexes
  if (tableName === 'scorecard_data') {
    sql += `CREATE INDEX idx_${tableName}_unitid ON ${tableName}(unitid);\n`;
    sql += `CREATE INDEX idx_${tableName}_opeid ON ${tableName}(opeid);\n`;
    sql += `CREATE INDEX idx_${tableName}_state ON ${tableName}(stabbr);\n`;
  } else {
    sql += `CREATE INDEX idx_${tableName}_unitid ON ${tableName}(unitid);\n`;
  }

  return sql;
}

// Process CSV and generate SQL INSERT statements
async function processCSV(allColumns) {
  const fileStream = fs.createReadStream(CSV_FILE);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  // Split columns
  const table1Columns = allColumns.slice(0, COLUMNS_PER_TABLE);
  const table2Columns = allColumns.slice(COLUMNS_PER_TABLE);

  const sqlColumns1 = table1Columns.map(c => toSqlColumn(c));
  const sqlColumns2 = ['unitid', ...table2Columns.map(c => toSqlColumn(c))];

  // Find unitid index for table2
  const unitidIndex = allColumns.findIndex(c => c.toUpperCase() === 'UNITID');

  let lineNum = 0;
  let batch1Num = 0;
  let batch2Num = 0;
  let currentBatch1 = [];
  let currentBatch2 = [];
  const BATCH_SIZE = 100;

  console.log(`Processing ${allColumns.length} columns...`);
  console.log(`Table 1 (scorecard_data): ${table1Columns.length} columns`);
  console.log(`Table 2 (scorecard_data_ext): ${table2Columns.length} columns`);

  for await (const line of rl) {
    lineNum++;

    if (lineNum === 1) continue;

    const cleanLine = line.replace(/^\uFEFF/, '');
    const values = parseCSVLine(cleanLine);

    if (values.length !== allColumns.length) {
      console.warn(`Line ${lineNum}: Expected ${allColumns.length} columns, got ${values.length}`);
      continue;
    }

    // Get unitid for table2
    const unitidValue = values[unitidIndex];

    // Build INSERT for table 1
    const values1 = values.slice(0, COLUMNS_PER_TABLE).map((val, idx) => {
      if (val === '' || val === 'NULL' || val === 'NA' || val === 'PrivacySuppressed') {
        return 'NULL';
      }
      const colName = table1Columns[idx].toUpperCase();
      const sqlType = getSqlType(colName);
      if (sqlType === 'TEXT') {
        return `'${val.replace(/'/g, "''")}'`;
      } else {
        const num = parseFloat(val);
        if (isNaN(num)) return 'NULL';
        return val;
      }
    });

    // Build INSERT for table 2 (include unitid as first column)
    const values2 = [`'${unitidValue}'`, ...values.slice(COLUMNS_PER_TABLE).map((val, idx) => {
      if (val === '' || val === 'NULL' || val === 'NA' || val === 'PrivacySuppressed') {
        return 'NULL';
      }
      const colName = table2Columns[idx].toUpperCase();
      const sqlType = getSqlType(colName);
      if (sqlType === 'TEXT') {
        return `'${val.replace(/'/g, "''")}'`;
      } else {
        const num = parseFloat(val);
        if (isNaN(num)) return 'NULL';
        return val;
      }
    })];

    currentBatch1.push(`(${values1.join(', ')})`);
    currentBatch2.push(`(${values2.join(', ')})`);

    // Write batches
    if (currentBatch1.length >= BATCH_SIZE) {
      const batchFile1 = path.join(OUTPUT_DIR, `scorecard-batch1-${String(batch1Num).padStart(4, '0')}.sql`);
      const insertSql1 = `INSERT INTO scorecard_data (${sqlColumns1.join(', ')}) VALUES\n${currentBatch1.join(',\n')};\n`;
      fs.writeFileSync(batchFile1, insertSql1);

      const batchFile2 = path.join(OUTPUT_DIR, `scorecard-batch2-${String(batch2Num).padStart(4, '0')}.sql`);
      const insertSql2 = `INSERT INTO scorecard_data_ext (${sqlColumns2.join(', ')}) VALUES\n${currentBatch2.join(',\n')};\n`;
      fs.writeFileSync(batchFile2, insertSql2);

      console.log(`Wrote batch ${batch1Num} (${currentBatch1.length} rows each table)`);

      batch1Num++;
      batch2Num++;
      currentBatch1 = [];
      currentBatch2 = [];
    }

    if (lineNum % 1000 === 0) {
      console.log(`Processed ${lineNum} rows...`);
    }
  }

  // Write final batches
  if (currentBatch1.length > 0) {
    const batchFile1 = path.join(OUTPUT_DIR, `scorecard-batch1-${String(batch1Num).padStart(4, '0')}.sql`);
    const insertSql1 = `INSERT INTO scorecard_data (${sqlColumns1.join(', ')}) VALUES\n${currentBatch1.join(',\n')};\n`;
    fs.writeFileSync(batchFile1, insertSql1);

    const batchFile2 = path.join(OUTPUT_DIR, `scorecard-batch2-${String(batch2Num).padStart(4, '0')}.sql`);
    const insertSql2 = `INSERT INTO scorecard_data_ext (${sqlColumns2.join(', ')}) VALUES\n${currentBatch2.join(',\n')};\n`;
    fs.writeFileSync(batchFile2, insertSql2);

    console.log(`Wrote final batch ${batch1Num} (${currentBatch1.length} rows each table)`);
  }

  console.log(`\nComplete! Processed ${lineNum - 1} schools into ${batch1Num + 1} batch files per table.`);
  return batch1Num + 1;
}

async function main() {
  console.log('=== Split College Scorecard Import ===\n');
  console.log('Reading columns from CSV...');

  const columns = await getColumns();
  console.log(`Found ${columns.length} columns\n`);

  // Split columns
  const table1Columns = columns.slice(0, COLUMNS_PER_TABLE);
  const table2Columns = columns.slice(COLUMNS_PER_TABLE);

  // Generate and save CREATE TABLE for table 1
  const schema1 = generateCreateTable('scorecard_data', table1Columns);
  const schemaFile1 = path.join(OUTPUT_DIR, 'scorecard-schema1.sql');
  fs.writeFileSync(schemaFile1, schema1);
  console.log(`Schema 1 written to: ${schemaFile1} (${table1Columns.length} columns)\n`);

  // Generate and save CREATE TABLE for table 2
  const schema2 = generateCreateTable('scorecard_data_ext', table2Columns, true);
  const schemaFile2 = path.join(OUTPUT_DIR, 'scorecard-schema2.sql');
  fs.writeFileSync(schemaFile2, schema2);
  console.log(`Schema 2 written to: ${schemaFile2} (${table2Columns.length} columns + unitid)\n`);

  // Save column mapping for reference
  const columnMapping = {
    table1: table1Columns.map(c => ({ original: c, sql: toSqlColumn(c), type: getSqlType(c) })),
    table2: table2Columns.map(c => ({ original: c, sql: toSqlColumn(c), type: getSqlType(c) }))
  };
  const mappingFile = path.join(OUTPUT_DIR, 'column-mapping-split.json');
  fs.writeFileSync(mappingFile, JSON.stringify(columnMapping, null, 2));
  console.log(`Column mapping written to: ${mappingFile}\n`);

  // Process CSV into SQL batches
  console.log('Processing CSV data...\n');
  const numBatches = await processCSV(columns);

  console.log(`\n=== Next Steps ===`);
  console.log(`1. Run schema1: wrangler d1 execute trueschools-db --remote --file=${schemaFile1}`);
  console.log(`2. Run schema2: wrangler d1 execute trueschools-db --remote --file=${schemaFile2}`);
  console.log(`3. Import table1 batches: for f in ${OUTPUT_DIR}/scorecard-batch1-*.sql; do wrangler d1 execute trueschools-db --remote --file="$f"; done`);
  console.log(`4. Import table2 batches: for f in ${OUTPUT_DIR}/scorecard-batch2-*.sql; do wrangler d1 execute trueschools-db --remote --file="$f"; done`);
}

main().catch(console.error);
