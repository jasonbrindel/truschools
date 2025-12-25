const fs = require('fs');
const path = require('path');
const readline = require('readline');

async function analyzeCSV(filePath) {
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let headers = null;
  let headerIndices = {};
  let counts = { level1: 0, level2: 0, level3: 0, other: 0 };
  let samples = { level3: [] };

  for await (const line of rl) {
    const fields = parseCSVLine(line);

    if (!headers) {
      headers = fields;
      headerIndices.ICLEVEL = headers.indexOf('ICLEVEL');
      headerIndices.INSTNM = headers.indexOf('INSTNM');
      headerIndices.CITY = headers.indexOf('CITY');
      headerIndices.STABBR = headers.indexOf('STABBR');
      headerIndices.OPEID = headers.indexOf('OPEID');
      console.log('ICLEVEL column index:', headerIndices.ICLEVEL);
      continue;
    }

    const level = fields[headerIndices.ICLEVEL];
    const name = fields[headerIndices.INSTNM];
    const city = fields[headerIndices.CITY];
    const state = fields[headerIndices.STABBR];

    if (level === '1') counts.level1++;
    else if (level === '2') counts.level2++;
    else if (level === '3') {
      counts.level3++;
      if (samples.level3.length < 20) {
        samples.level3.push(`${name} - ${city}, ${state}`);
      }
    }
    else counts.other++;
  }

  console.log('\n=== College Scorecard Institution Counts ===');
  console.log(`4-year institutions (ICLEVEL=1): ${counts.level1}`);
  console.log(`2-year institutions (ICLEVEL=2): ${counts.level2}`);
  console.log(`Less-than-2-year (ICLEVEL=3): ${counts.level3}`);
  console.log(`Other/Unknown: ${counts.other}`);
  console.log(`TOTAL: ${counts.level1 + counts.level2 + counts.level3 + counts.other}`);

  console.log('\n=== Sample Less-than-2-year Institutions ===');
  samples.level3.forEach(s => console.log(`  - ${s}`));
}

function parseCSVLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  fields.push(current.trim());
  return fields;
}

const csvPath = path.join(__dirname, '../data/college-scorecard/MERGED2023_24_PP.csv');
analyzeCSV(csvPath).catch(console.error);
