const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../data/fafsa/2627FederalSchoolCodeListQ1.xlsx');
const outputPath = path.join(__dirname, '../data/fafsa/fafsa_school_codes.sql');

const workbook = XLSX.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

// Skip header row
const rows = data.slice(1);

console.log(`Processing ${rows.length} school records...`);

// Escape single quotes for SQL
function escapeSQL(val) {
  if (val === null || val === undefined || val === 'N/A' || val === '') {
    return 'NULL';
  }
  return `'${String(val).replace(/'/g, "''")}'`;
}

// Build SQL statements
let sql = `-- FAFSA School Codes Import
-- Generated from 2026-27 Federal School Code List (November 2025)
-- Source: https://fsapartners.ed.gov

-- Clear existing data
DELETE FROM fafsa_school_codes;

`;

// Process in batches for better performance
const BATCH_SIZE = 100;
let currentBatch = [];
let batchCount = 0;

rows.forEach((row, index) => {
  if (!row[0]) return; // Skip empty rows

  const schoolCode = escapeSQL(row[0]);
  const schoolName = escapeSQL(row[1]);
  const address = escapeSQL(row[2]);
  const city = escapeSQL(row[3]);
  const stateCode = escapeSQL(row[4]);
  const zipCode = escapeSQL(row[5]);
  const province = escapeSQL(row[6]);
  const country = escapeSQL(row[7]);
  const postalCode = escapeSQL(row[8]);

  currentBatch.push(`(${schoolCode}, ${schoolName}, ${address}, ${city}, ${stateCode}, ${zipCode}, ${province}, ${country}, ${postalCode})`);

  if (currentBatch.length >= BATCH_SIZE || index === rows.length - 1) {
    if (currentBatch.length > 0) {
      sql += `INSERT INTO fafsa_school_codes (school_code, school_name, address, city, state_code, zip_code, province, country, postal_code) VALUES\n`;
      sql += currentBatch.join(',\n') + ';\n\n';
      batchCount++;
      currentBatch = [];
    }
  }
});

console.log(`Generated ${batchCount} batch insert statements`);
console.log(`Writing to ${outputPath}...`);

fs.writeFileSync(outputPath, sql);

console.log('Done! SQL file generated.');
console.log(`\nTo import to D1, run:`);
console.log(`CLOUDFLARE_ACCOUNT_ID=db05e74e773d91c84692ba064111c43c npx wrangler d1 execute truschools-db --remote --file=migrations/0008_fafsa_school_codes.sql`);
console.log(`CLOUDFLARE_ACCOUNT_ID=db05e74e773d91c84692ba064111c43c npx wrangler d1 execute truschools-db --remote --file=data/fafsa/fafsa_school_codes.sql`);
