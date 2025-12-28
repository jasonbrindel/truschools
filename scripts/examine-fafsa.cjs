const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '../data/fafsa/2627FederalSchoolCodeListQ1.xlsx');
const workbook = XLSX.readFile(filePath);

console.log('Sheet names:', workbook.SheetNames);
console.log('\n');

// Get the first sheet
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];

// Convert to JSON
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

// Print headers (first row)
console.log('Headers (Row 1):');
console.log(data[0]);
console.log('\n');

// Print second row in case headers are on row 2
console.log('Row 2:');
console.log(data[1]);
console.log('\n');

// Print a few sample rows
console.log('Sample data rows:');
for (let i = 2; i < Math.min(7, data.length); i++) {
  console.log(`Row ${i + 1}:`, data[i]);
}

console.log('\nTotal rows:', data.length);
