const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, '../data/college-scorecard/vocational-import.sql');
const outputDir = path.join(__dirname, '../data/college-scorecard');

const sql = fs.readFileSync(inputFile, 'utf8');
const statements = sql.split(';\n').filter(s => s.trim());

console.log(`Total statements: ${statements.length}`);

const batchSize = 50;
let batchNum = 0;

for (let i = 0; i < statements.length; i += batchSize) {
  const batch = statements.slice(i, i + batchSize);
  const batchSql = batch.map(s => s.trim() + ';').join('\n');
  const fileName = `vocational-batch-${String(batchNum).padStart(3, '0')}.sql`;
  fs.writeFileSync(path.join(outputDir, fileName), batchSql);
  batchNum++;
}

console.log(`Created ${batchNum} batch files`);
