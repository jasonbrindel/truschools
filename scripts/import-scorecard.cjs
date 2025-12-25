const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Key columns we want to extract (column name -> our DB field)
const COLUMN_MAP = {
  'OPEID': 'opeid',  // Key for matching
  'UNITID': 'unitid',
  'UGDS': 'total_enrollment',  // Undergraduate enrollment
  'TUITIONFEE_IN': 'tuition_in_state',
  'TUITIONFEE_OUT': 'tuition_out_state',
  'C150_4': 'graduation_rate',  // 4-year graduation rate
  'C150_4_POOLED': 'graduation_rate_pooled',
  'RET_FT4': 'retention_rate_ft',  // Full-time retention
  'RET_PT4': 'retention_rate_pt',  // Part-time retention
  'PCTPELL': 'pct_pell',  // % receiving Pell grants
  'PCTFLOAN': 'pct_federal_loan',  // % receiving federal loans
  'DEBT_MDN': 'median_debt',  // Median debt
  'GRAD_DEBT_MDN': 'grad_median_debt',  // Graduate median debt
  'MD_EARN_WNE_P10': 'median_earnings_10yr',  // Median earnings 10 years after
  'MD_EARN_WNE_P6': 'median_earnings_6yr',  // Median earnings 6 years after
  'AVGFACSAL': 'avg_faculty_salary',
  'ADM_RATE': 'admission_rate',
  'ADM_RATE_ALL': 'admission_rate_all',
  'SATVR25': 'sat_reading_25',
  'SATVR75': 'sat_reading_75',
  'SATMT25': 'sat_math_25',
  'SATMT75': 'sat_math_75',
  'ACTCM25': 'act_composite_25',
  'ACTCM75': 'act_composite_75',
  'UGDS_WHITE': 'pct_white',
  'UGDS_BLACK': 'pct_black',
  'UGDS_HISP': 'pct_hispanic',
  'UGDS_ASIAN': 'pct_asian',
  'UGDS_AIAN': 'pct_native_american',
  'UGDS_MEN': 'pct_male',
  'UGDS_WOMEN': 'pct_female',
  'NPT4_PUB': 'net_price_public',  // Net price for public schools
  'NPT4_PRIV': 'net_price_private',  // Net price for private schools
  'COSTT4_A': 'cost_attendance_academic',
  'COSTT4_P': 'cost_attendance_program',
};

async function parseCSV(filePath) {
  const results = [];
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let headers = null;
  let headerIndices = {};
  let lineCount = 0;

  for await (const line of rl) {
    lineCount++;

    // Parse CSV line (handle quoted fields)
    const fields = parseCSVLine(line);

    if (!headers) {
      headers = fields;
      // Find indices for columns we care about
      for (const [csvCol, dbCol] of Object.entries(COLUMN_MAP)) {
        const idx = headers.indexOf(csvCol);
        if (idx >= 0) {
          headerIndices[csvCol] = idx;
        }
      }
      console.log(`Found ${Object.keys(headerIndices).length} matching columns`);
      continue;
    }

    // Extract only the fields we need
    const record = {};
    for (const [csvCol, dbCol] of Object.entries(COLUMN_MAP)) {
      const idx = headerIndices[csvCol];
      if (idx !== undefined) {
        let value = fields[idx];
        // Clean up values
        if (value === 'NULL' || value === 'PrivacySuppressed' || value === '') {
          value = null;
        } else if (!isNaN(value) && value !== null) {
          value = parseFloat(value);
        }
        record[dbCol] = value;
      }
    }

    // Only include records with an OPEID (needed for matching)
    if (record.opeid) {
      results.push(record);
    }

    if (lineCount % 1000 === 0) {
      console.log(`Processed ${lineCount} lines...`);
    }
  }

  console.log(`Total records with OPEID: ${results.length}`);
  return results;
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

function isValidNumber(val) {
  return val !== null && !isNaN(val) && isFinite(val);
}

function generateSQL(records) {
  const updates = [];

  for (const record of records) {
    // Format OPEID to match our database (pad to 8 chars with leading zeros)
    let opeid = record.opeid;
    if (opeid) {
      opeid = opeid.toString().padStart(8, '0');
    }

    const setClauses = [];

    // Map scorecard fields to our DB fields
    if (isValidNumber(record.total_enrollment)) setClauses.push(`total_enrollment = ${Math.round(record.total_enrollment)}`);
    if (isValidNumber(record.tuition_in_state)) setClauses.push(`tuition_in_state = ${Math.round(record.tuition_in_state)}`);
    if (isValidNumber(record.tuition_out_state)) setClauses.push(`tuition_out_state = ${Math.round(record.tuition_out_state)}`);

    // Graduation rate (convert from decimal to percentage)
    if (isValidNumber(record.graduation_rate)) {
      setClauses.push(`graduation_rate = ${Math.round(record.graduation_rate * 100)}`);
    } else if (isValidNumber(record.graduation_rate_pooled)) {
      setClauses.push(`graduation_rate = ${Math.round(record.graduation_rate_pooled * 100)}`);
    }

    // Retention rates (convert from decimal to percentage)
    if (isValidNumber(record.retention_rate_ft)) setClauses.push(`retention_rate_ft = ${Math.round(record.retention_rate_ft * 100)}`);
    if (isValidNumber(record.retention_rate_pt)) setClauses.push(`retention_rate_pt = ${Math.round(record.retention_rate_pt * 100)}`);

    // Financial aid percentages (convert from decimal to percentage)
    if (isValidNumber(record.pct_pell)) setClauses.push(`pct_receiving_aid = ${Math.round(record.pct_pell * 100)}`);

    // Debt and earnings
    if (isValidNumber(record.median_debt)) setClauses.push(`avg_loan_amount = ${Math.round(record.median_debt)}`);

    // Demographics (convert from decimal to percentage)
    if (isValidNumber(record.pct_female)) setClauses.push(`pct_female = ${Math.round(record.pct_female * 100)}`);
    if (isValidNumber(record.pct_white)) setClauses.push(`pct_white = ${Math.round(record.pct_white * 100)}`);
    if (isValidNumber(record.pct_black)) setClauses.push(`pct_black = ${Math.round(record.pct_black * 100)}`);
    if (isValidNumber(record.pct_hispanic)) setClauses.push(`pct_hispanic = ${Math.round(record.pct_hispanic * 100)}`);
    if (isValidNumber(record.pct_asian)) setClauses.push(`pct_asian = ${Math.round(record.pct_asian * 100)}`);
    if (isValidNumber(record.pct_native_american)) setClauses.push(`pct_native_american = ${Math.round(record.pct_native_american * 100)}`);

    if (setClauses.length > 0) {
      updates.push(`UPDATE colleges SET ${setClauses.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE opeid = '${opeid}';`);
    }
  }

  return updates.join('\n');
}

async function main() {
  const csvPath = path.join(__dirname, '../data/college-scorecard/MERGED2023_24_PP.csv');

  console.log('Parsing College Scorecard data...');
  const records = await parseCSV(csvPath);

  console.log('Generating SQL updates...');
  const sql = generateSQL(records);

  const outputPath = path.join(__dirname, '../data/college-scorecard/scorecard-update.sql');
  fs.writeFileSync(outputPath, sql);

  console.log(`SQL file written to: ${outputPath}`);
  console.log(`Total UPDATE statements: ${sql.split('\n').filter(l => l.trim()).length}`);
}

main().catch(console.error);
