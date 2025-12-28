/**
 * Reclassify vocational schools based on IPEDS CIP completion data
 *
 * CIP Code Categories:
 * - Beauty: 12.04xx (Cosmetology and Related Personal Grooming Services)
 * - Culinary: 12.05xx (Culinary Arts and Related Services)
 * - Healthcare: 51.xxxx (Health Professions and Related Programs)
 * - Technology: 11.xxxx (Computer and Information Sciences)
 * - Trade: 46.xxxx (Construction Trades)
 *          47.xxxx (Mechanic and Repair Technologies)
 *          48.xxxx (Precision Production)
 *          49.xxxx (Transportation and Materials Moving)
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// CIP code patterns for each vocational type
const CIP_PATTERNS = {
  beauty: /^12\.04/,
  culinary: /^12\.05/,
  healthcare: /^51\./,
  technology: /^11\./,
  trade: /^4[6789]\./,
};

async function loadCompletionsData(filePath) {
  console.log('Loading IPEDS completions data...');

  const schoolCips = new Map(); // unitid -> { cip: count }

  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let headers = null;
  let unitidIdx, cipIdx, totalIdx;
  let lineCount = 0;

  for await (const line of rl) {
    lineCount++;

    // Parse CSV line
    const fields = parseCSVLine(line);

    if (!headers) {
      headers = fields;
      unitidIdx = headers.indexOf('UNITID');
      cipIdx = headers.indexOf('CIPCODE');
      totalIdx = headers.indexOf('CTOTALT');
      console.log(`Found columns: UNITID=${unitidIdx}, CIPCODE=${cipIdx}, CTOTALT=${totalIdx}`);
      continue;
    }

    const unitid = fields[unitidIdx];
    const cip = fields[cipIdx]?.replace(/"/g, '');
    const total = parseInt(fields[totalIdx]) || 0;

    if (!unitid || !cip || total === 0) continue;

    // Check if this CIP matches any vocational category
    let category = null;
    for (const [cat, pattern] of Object.entries(CIP_PATTERNS)) {
      if (pattern.test(cip)) {
        category = cat;
        break;
      }
    }

    if (category) {
      if (!schoolCips.has(unitid)) {
        schoolCips.set(unitid, { beauty: 0, culinary: 0, healthcare: 0, technology: 0, trade: 0 });
      }
      schoolCips.get(unitid)[category] += total;
    }

    if (lineCount % 100000 === 0) {
      console.log(`Processed ${lineCount} lines...`);
    }
  }

  console.log(`\nLoaded completions for ${schoolCips.size} schools with vocational programs`);
  return schoolCips;
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

function determineVocationalType(counts) {
  // Priority order - specialized vocational schools first, then general
  // Beauty, culinary, and trade schools tend to be more specialized
  // Healthcare and technology are often offered at community colleges alongside other programs

  // Check for specialized vocational schools with meaningful completions
  // These thresholds are low because specialized schools may have small cohorts
  if (counts.beauty >= 5) return 'beauty';
  if (counts.culinary >= 3) return 'culinary';
  if (counts.trade >= 5) return 'trade';
  if (counts.technology >= 5) return 'technology';

  // For healthcare, require more completions since it's commonly offered everywhere
  if (counts.healthcare >= 10) return 'healthcare';

  // Fallback: use highest count
  let maxCategory = null;
  let maxCount = 0;

  for (const [category, count] of Object.entries(counts)) {
    if (count > maxCount) {
      maxCount = count;
      maxCategory = category;
    }
  }

  return maxCategory;
}

async function main() {
  const completionsPath = path.join(__dirname, '../data/C2023_a.csv');

  // Load completions data
  const schoolCips = await loadCompletionsData(completionsPath);

  // Generate SQL updates
  console.log('\nGenerating SQL update statements...');

  const updates = [];
  const stats = { beauty: 0, culinary: 0, healthcare: 0, technology: 0, trade: 0 };

  for (const [unitid, counts] of schoolCips) {
    const vocType = determineVocationalType(counts);
    if (vocType) {
      stats[vocType]++;
      updates.push(`UPDATE colleges SET vocational_type = '${vocType}' WHERE ipeds_id = '${unitid}';`);
    }
  }

  console.log('\nSchools by vocational type (based on CIP completions):');
  for (const [cat, count] of Object.entries(stats).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${cat}: ${count}`);
  }
  console.log(`  Total: ${updates.length}`);

  // Write SQL file
  const outputPath = path.join(__dirname, '../data/reclassify-vocational.sql');
  fs.writeFileSync(outputPath, updates.join('\n'));
  console.log(`\nSQL file written to: ${outputPath}`);

  // Also create a summary of changes
  console.log('\n=== Summary ===');
  console.log(`Total schools to update: ${updates.length}`);
}

main().catch(console.error);
