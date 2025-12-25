/**
 * Import ALL College Scorecard data (3,306 columns) for Cloudflare D1
 *
 * D1 has a strict 100 column limit per table. With 3,306 columns, we need:
 * - 34 tables (33 with 99 columns each + 1 with 33 columns)
 * - Each table includes unitid for joining
 *
 * Tables: scorecard_01 through scorecard_34
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const CSV_FILE = path.join(__dirname, '../data/college-scorecard/MERGED2023_24_PP.csv');
const OUTPUT_DIR = path.join(__dirname, '../data/college-scorecard/d1-import');

// D1 limit is 100 columns, minus 1 for id, minus 1 for unitid = 98 data columns per table
const DATA_COLS_PER_TABLE = 98;

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

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
function generateCreateTable(tableName, columns, tableNum) {
  const columnDefs = ['  unitid TEXT NOT NULL'];

  columns.forEach(col => {
    // Skip unitid since we already add it as join column
    if (col.toUpperCase() === 'UNITID') return;
    const sqlCol = toSqlColumn(col);
    const sqlType = getSqlType(col);
    columnDefs.push(`  ${sqlCol} ${sqlType}`);
  });

  let sql = `-- ${tableName} (${columns.length} data columns + unitid)\n`;
  sql += `-- Generated: ${new Date().toISOString()}\n\n`;
  sql += `DROP TABLE IF EXISTS ${tableName};\n\n`;
  sql += `CREATE TABLE ${tableName} (\n`;
  sql += `  id INTEGER PRIMARY KEY AUTOINCREMENT,\n`;
  sql += columnDefs.join(',\n');
  sql += '\n);\n\n';
  sql += `CREATE INDEX idx_${tableName}_unitid ON ${tableName}(unitid);\n`;

  return sql;
}

// Process CSV and generate SQL INSERT statements
async function processCSV(allColumns, tableConfigs) {
  const fileStream = fs.createReadStream(CSV_FILE);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  // Find unitid index
  const unitidIndex = allColumns.findIndex(c => c.toUpperCase() === 'UNITID');

  // Prepare batches for each table
  const batches = tableConfigs.map(() => []);
  const batchNums = tableConfigs.map(() => 0);
  const BATCH_SIZE = 25; // D1 has SQL statement length limits

  let lineNum = 0;

  console.log(`Processing ${allColumns.length} columns across ${tableConfigs.length} tables...`);

  for await (const line of rl) {
    lineNum++;
    if (lineNum === 1) continue;

    const cleanLine = line.replace(/^\uFEFF/, '');
    const values = parseCSVLine(cleanLine);

    if (values.length !== allColumns.length) {
      console.warn(`Line ${lineNum}: Expected ${allColumns.length} columns, got ${values.length}`);
      continue;
    }

    const unitidValue = values[unitidIndex];

    // Build INSERT for each table
    tableConfigs.forEach((config, tableIdx) => {
      const tableValues = [`'${unitidValue}'`];

      const slicedValues = values.slice(config.startCol, config.endCol);
      slicedValues.forEach((val, idx) => {
        // Skip unitid since we already add it as first column
        if (config.columns[idx].toUpperCase() === 'UNITID') return;

        if (val === '' || val === 'NULL' || val === 'NA' || val === 'PrivacySuppressed') {
          tableValues.push('NULL');
          return;
        }
        const colName = config.columns[idx].toUpperCase();
        const sqlType = getSqlType(colName);
        if (sqlType === 'TEXT') {
          tableValues.push(`'${val.replace(/'/g, "''")}'`);
        } else {
          const num = parseFloat(val);
          if (isNaN(num)) {
            tableValues.push('NULL');
          } else {
            tableValues.push(val);
          }
        }
      });

      batches[tableIdx].push(`(${tableValues.join(', ')})`);
    });

    // Write batches when full
    if (batches[0].length >= BATCH_SIZE) {
      tableConfigs.forEach((config, tableIdx) => {
        const batchFile = path.join(OUTPUT_DIR, `${config.tableName}-batch-${String(batchNums[tableIdx]).padStart(3, '0')}.sql`);
        const insertSql = `INSERT INTO ${config.tableName} (${config.sqlColumns.join(', ')}) VALUES\n${batches[tableIdx].join(',\n')};\n`;
        fs.writeFileSync(batchFile, insertSql);
        batchNums[tableIdx]++;
        batches[tableIdx] = [];
      });
      console.log(`Wrote batch ${batchNums[0] - 1} (${BATCH_SIZE} rows per table)`);
    }

    if (lineNum % 1000 === 0) {
      console.log(`Processed ${lineNum} rows...`);
    }
  }

  // Write final batches
  if (batches[0].length > 0) {
    tableConfigs.forEach((config, tableIdx) => {
      const batchFile = path.join(OUTPUT_DIR, `${config.tableName}-batch-${String(batchNums[tableIdx]).padStart(3, '0')}.sql`);
      const insertSql = `INSERT INTO ${config.tableName} (${config.sqlColumns.join(', ')}) VALUES\n${batches[tableIdx].join(',\n')};\n`;
      fs.writeFileSync(batchFile, insertSql);
      batchNums[tableIdx]++;
    });
    console.log(`Wrote final batch (${batches[0].length} rows per table)`);
  }

  console.log(`\nComplete! Processed ${lineNum - 1} schools into ${batchNums[0]} batch files per table.`);
  return batchNums[0];
}

async function main() {
  console.log('=== D1-Compatible College Scorecard Import ===\n');
  console.log('D1 has a 100 column limit per table.');
  console.log('Reading columns from CSV...');

  const columns = await getColumns();
  console.log(`Found ${columns.length} columns\n`);

  // Calculate number of tables needed
  const numTables = Math.ceil(columns.length / DATA_COLS_PER_TABLE);
  console.log(`Will create ${numTables} tables with ${DATA_COLS_PER_TABLE} data columns each (+ unitid + id)\n`);

  // Build table configurations
  const tableConfigs = [];

  for (let i = 0; i < numTables; i++) {
    const startCol = i * DATA_COLS_PER_TABLE;
    const endCol = Math.min((i + 1) * DATA_COLS_PER_TABLE, columns.length);
    const tableCols = columns.slice(startCol, endCol);
    const tableName = `scorecard_${String(i + 1).padStart(2, '0')}`;

    // Filter out UNITID since we add it explicitly
    const sqlCols = ['unitid', ...tableCols.filter(c => c.toUpperCase() !== 'UNITID').map(c => toSqlColumn(c))];

    tableConfigs.push({
      tableName,
      columns: tableCols,
      sqlColumns: sqlCols,
      startCol,
      endCol
    });

    // Generate schema
    const schema = generateCreateTable(tableName, tableCols, i);
    const schemaFile = path.join(OUTPUT_DIR, `${tableName}-schema.sql`);
    fs.writeFileSync(schemaFile, schema);
  }

  console.log('Generated schema files:');
  tableConfigs.forEach(c => {
    console.log(`  ${c.tableName}: ${c.columns.length} data columns (cols ${c.startCol}-${c.endCol - 1})`);
  });
  console.log('');

  // Save column mapping
  const columnMapping = {};
  tableConfigs.forEach(config => {
    columnMapping[config.tableName] = {
      range: `${config.startCol}-${config.endCol - 1}`,
      columns: config.columns.map(c => ({
        original: c,
        sql: toSqlColumn(c),
        type: getSqlType(c)
      }))
    };
  });
  const mappingFile = path.join(OUTPUT_DIR, 'column-mapping.json');
  fs.writeFileSync(mappingFile, JSON.stringify(columnMapping, null, 2));
  console.log(`Column mapping written to: ${mappingFile}\n`);

  // Process CSV
  console.log('Processing CSV data...\n');
  await processCSV(columns, tableConfigs);

  // Generate import script
  let importScript = '#!/bin/bash\n\n';
  importScript += '# Import all scorecard tables to D1\n';
  importScript += 'set -e\n\n';
  importScript += 'ACCOUNT_ID="db05e74e773d91c84692ba064111c43c"\n\n';

  tableConfigs.forEach(config => {
    importScript += `echo "Creating ${config.tableName}..."\n`;
    importScript += `CLOUDFLARE_ACCOUNT_ID=$ACCOUNT_ID npx wrangler d1 execute trueschools-db --remote --file=data/college-scorecard/d1-import/${config.tableName}-schema.sql\n\n`;
  });

  importScript += 'echo "\\nImporting data..."\n\n';

  tableConfigs.forEach(config => {
    importScript += `echo "Importing ${config.tableName} data..."\n`;
    importScript += `for f in data/college-scorecard/d1-import/${config.tableName}-batch-*.sql; do\n`;
    importScript += `  CLOUDFLARE_ACCOUNT_ID=$ACCOUNT_ID npx wrangler d1 execute trueschools-db --remote --file="$f"\n`;
    importScript += `done\n\n`;
  });

  importScript += 'echo "Done!"\n';

  const importScriptFile = path.join(OUTPUT_DIR, 'import-all.sh');
  fs.writeFileSync(importScriptFile, importScript);
  fs.chmodSync(importScriptFile, '755');

  console.log(`\n=== Generated Files ===`);
  console.log(`Schema files: ${numTables} files (scorecard_01-schema.sql through scorecard_${String(numTables).padStart(2, '0')}-schema.sql)`);
  console.log(`Batch files: ${numTables * 13} files (13 batches per table)`);
  console.log(`Import script: ${importScriptFile}`);
  console.log(`\nRun: ${importScriptFile}`);
}

main().catch(console.error);
