/**
 * Import ALL College Scorecard data (3,306 columns) - Split into multiple tables
 *
 * Cloudflare D1 has stricter column limits. We'll split into 4 tables of ~850 columns each.
 * - scorecard_core: Basic info, costs, admissions (cols 0-825)
 * - scorecard_outcomes: Earnings, completion rates (cols 826-1650)
 * - scorecard_debt: Debt and repayment data (cols 1651-2475)
 * - scorecard_cohort: Detailed cohort tracking (cols 2476-3305)
 *
 * All tables share unitid for joining.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const CSV_FILE = path.join(__dirname, '../data/college-scorecard/MERGED2023_24_PP.csv');
const OUTPUT_DIR = path.join(__dirname, '../data/college-scorecard');

const COLUMNS_PER_TABLE = 825;

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
function generateCreateTable(tableName, columns, isFirstTable = false) {
  const columnDefs = [];

  // All tables have unitid for joining
  if (!isFirstTable) {
    columnDefs.push('  unitid TEXT NOT NULL');
  }

  columns.forEach(col => {
    const sqlCol = toSqlColumn(col);
    const sqlType = getSqlType(col);
    columnDefs.push(`  ${sqlCol} ${sqlType}`);
  });

  let sql = `-- ${tableName} table (${columns.length} columns from source)\n`;
  sql += `-- Generated: ${new Date().toISOString()}\n\n`;
  sql += `DROP TABLE IF EXISTS ${tableName};\n\n`;
  sql += `CREATE TABLE ${tableName} (\n`;
  sql += `  id INTEGER PRIMARY KEY AUTOINCREMENT,\n`;
  sql += columnDefs.join(',\n');
  sql += '\n);\n\n';

  // Add indexes
  sql += `CREATE INDEX idx_${tableName}_unitid ON ${tableName}(unitid);\n`;
  if (isFirstTable) {
    sql += `CREATE INDEX idx_${tableName}_opeid ON ${tableName}(opeid);\n`;
    sql += `CREATE INDEX idx_${tableName}_state ON ${tableName}(stabbr);\n`;
  }

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
  const BATCH_SIZE = 100;

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
      const tableValues = [];

      // Add unitid for non-first tables
      if (tableIdx > 0) {
        tableValues.push(`'${unitidValue}'`);
      }

      const slicedValues = values.slice(config.startCol, config.endCol);
      slicedValues.forEach((val, idx) => {
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
        const batchFile = path.join(OUTPUT_DIR, `sc${tableIdx + 1}-batch-${String(batchNums[tableIdx]).padStart(4, '0')}.sql`);
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
      const batchFile = path.join(OUTPUT_DIR, `sc${tableIdx + 1}-batch-${String(batchNums[tableIdx]).padStart(4, '0')}.sql`);
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
  console.log('=== Multi-Table College Scorecard Import ===\n');
  console.log('Reading columns from CSV...');

  const columns = await getColumns();
  console.log(`Found ${columns.length} columns\n`);

  // Define table configurations
  const tableConfigs = [];
  const tableNames = ['scorecard_core', 'scorecard_outcomes', 'scorecard_debt', 'scorecard_cohort'];

  for (let i = 0; i < 4; i++) {
    const startCol = i * COLUMNS_PER_TABLE;
    const endCol = Math.min((i + 1) * COLUMNS_PER_TABLE, columns.length);
    const tableCols = columns.slice(startCol, endCol);

    const sqlCols = tableCols.map(c => toSqlColumn(c));
    if (i > 0) {
      sqlCols.unshift('unitid'); // Add unitid for non-first tables
    }

    tableConfigs.push({
      tableName: tableNames[i],
      columns: tableCols,
      sqlColumns: sqlCols,
      startCol,
      endCol
    });

    // Generate schema
    const schema = generateCreateTable(tableNames[i], tableCols, i === 0);
    const schemaFile = path.join(OUTPUT_DIR, `sc${i + 1}-schema.sql`);
    fs.writeFileSync(schemaFile, schema);
    console.log(`Schema ${i + 1} (${tableNames[i]}): ${tableCols.length} columns -> ${schemaFile}`);
  }

  console.log('');

  // Save column mapping
  const columnMapping = {};
  tableConfigs.forEach((config, idx) => {
    columnMapping[config.tableName] = config.columns.map(c => ({
      original: c,
      sql: toSqlColumn(c),
      type: getSqlType(c)
    }));
  });
  const mappingFile = path.join(OUTPUT_DIR, 'column-mapping-multi.json');
  fs.writeFileSync(mappingFile, JSON.stringify(columnMapping, null, 2));
  console.log(`Column mapping written to: ${mappingFile}\n`);

  // Process CSV
  console.log('Processing CSV data...\n');
  await processCSV(columns, tableConfigs);

  console.log(`\n=== Import Commands ===`);
  for (let i = 1; i <= 4; i++) {
    console.log(`\n# Table ${i}: ${tableNames[i - 1]}`);
    console.log(`CLOUDFLARE_ACCOUNT_ID=db05e74e773d91c84692ba064111c43c npx wrangler d1 execute trueschools-db --remote --file=data/college-scorecard/sc${i}-schema.sql`);
    console.log(`for f in data/college-scorecard/sc${i}-batch-*.sql; do CLOUDFLARE_ACCOUNT_ID=db05e74e773d91c84692ba064111c43c npx wrangler d1 execute trueschools-db --remote --file="$f"; done`);
  }
}

main().catch(console.error);
