const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Columns to extract from College Scorecard
const COLUMN_MAP = {
  'UNITID': 'unitid',
  'OPEID': 'opeid',
  'INSTNM': 'institution_name',
  'CITY': 'city',
  'STABBR': 'state_abbr',
  'ZIP': 'zip',
  'ADDR': 'address',
  'LATITUDE': 'lat',
  'LONGITUDE': 'lng',
  'INSTURL': 'website',
  'ICLEVEL': 'iclevel',
  'CONTROL': 'control',  // 1=Public, 2=Private nonprofit, 3=Private for-profit
  'LOCALE': 'locale',
  'UGDS': 'total_enrollment',
  'TUITIONFEE_IN': 'tuition_in_state',
  'TUITIONFEE_OUT': 'tuition_out_state',
  'PCTPELL': 'pct_pell',
  'PCTFLOAN': 'pct_federal_loan',
  'UGDS_WHITE': 'pct_white',
  'UGDS_BLACK': 'pct_black',
  'UGDS_HISP': 'pct_hispanic',
  'UGDS_ASIAN': 'pct_asian',
  'UGDS_WOMEN': 'pct_female',
  'ACCREDAGENCY': 'accreditation',
};

// Keywords to categorize vocational schools
const BEAUTY_KEYWORDS = [
  'beauty', 'cosmetology', 'esthetics', 'aesthetics', 'nail', 'barber',
  'hair', 'salon', 'spa', 'makeup', 'skincare', 'massage therapy',
  'paul mitchell', 'aveda', 'empire beauty', 'tricoci', 'regency beauty'
];

const HEALTHCARE_KEYWORDS = [
  'nursing', 'medical', 'dental', 'health', 'phlebotomy', 'pharmacy tech',
  'radiologic', 'respiratory', 'surgical tech', 'emt', 'paramedic',
  'healthcare', 'clinical', 'patient care', 'cna', 'lpn', 'lvn'
];

const TRADE_KEYWORDS = [
  'hvac', 'welding', 'electrical', 'plumbing', 'automotive', 'mechanic',
  'diesel', 'construction', 'carpentry', 'machining', 'manufacturing',
  'uti', 'lincoln tech', 'universal technical', 'wyotech', 'pennco tech',
  'tulsa welding', 'motorcycle mechanics', 'marine mechanics'
];

const TECHNOLOGY_KEYWORDS = [
  'computer', 'technology', 'it ', ' it', 'programming', 'software',
  'cyber', 'network', 'data', 'coding', 'web development'
];

const CULINARY_KEYWORDS = [
  'culinary', 'cooking', 'chef', 'pastry', 'baking', 'hospitality',
  'le cordon bleu', 'culinary institute'
];

function categorizeSchool(name) {
  const lowerName = name.toLowerCase();

  if (BEAUTY_KEYWORDS.some(k => lowerName.includes(k))) return 'beauty';
  if (HEALTHCARE_KEYWORDS.some(k => lowerName.includes(k))) return 'healthcare';
  if (TRADE_KEYWORDS.some(k => lowerName.includes(k))) return 'trade';
  if (TECHNOLOGY_KEYWORDS.some(k => lowerName.includes(k))) return 'technology';
  if (CULINARY_KEYWORDS.some(k => lowerName.includes(k))) return 'culinary';

  return 'other';
}

function createPageName(name, city, state) {
  const slug = name
    .toLowerCase()
    .replace(/[&]/g, 'and')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  const citySlug = city
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-');

  return `${slug}-${citySlug}-${state.toLowerCase()}`;
}

function getControlType(control) {
  switch (control) {
    case '1': return 'Public';
    case '2': return 'Private nonprofit';
    case '3': return 'Private for-profit';
    default: return null;
  }
}

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

    const fields = parseCSVLine(line);

    if (!headers) {
      headers = fields;
      for (const [csvCol, dbCol] of Object.entries(COLUMN_MAP)) {
        const idx = headers.indexOf(csvCol);
        if (idx >= 0) {
          headerIndices[csvCol] = idx;
        }
      }
      console.log(`Found ${Object.keys(headerIndices).length} matching columns`);
      continue;
    }

    // Extract record
    const record = {};
    for (const [csvCol, dbCol] of Object.entries(COLUMN_MAP)) {
      const idx = headerIndices[csvCol];
      if (idx !== undefined) {
        let value = fields[idx];
        if (value === 'NULL' || value === 'PrivacySuppressed' || value === '') {
          value = null;
        }
        record[dbCol] = value;
      }
    }

    // Only include ICLEVEL=3 (less-than-2-year) institutions with OPEID
    if (record.iclevel === '3' && record.opeid) {
      // Categorize the school
      record.vocational_type = categorizeSchool(record.institution_name);
      record.page_name = createPageName(record.institution_name, record.city || '', record.state_abbr || '');
      record.institution_control = getControlType(record.control);
      results.push(record);
    }

    if (lineCount % 1000 === 0) {
      console.log(`Processed ${lineCount} lines...`);
    }
  }

  console.log(`\nTotal vocational schools found: ${results.length}`);

  // Count by category
  const categoryCounts = {};
  results.forEach(r => {
    categoryCounts[r.vocational_type] = (categoryCounts[r.vocational_type] || 0) + 1;
  });
  console.log('\nBy category:');
  Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]).forEach(([cat, count]) => {
    console.log(`  ${cat}: ${count}`);
  });

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

function escapeSQL(str) {
  if (str === null || str === undefined) return 'NULL';
  return `'${str.toString().replace(/'/g, "''")}'`;
}

function isValidNumber(val) {
  return val !== null && !isNaN(parseFloat(val)) && isFinite(parseFloat(val));
}

function generateSQL(records) {
  const inserts = [];

  for (const r of records) {
    // Pad OPEID to 8 chars
    const opeid = r.opeid ? r.opeid.toString().padStart(8, '0') : null;

    const values = {
      institution_name: escapeSQL(r.institution_name),
      page_name: escapeSQL(r.page_name),
      ipeds_id: escapeSQL(r.unitid),
      opeid: escapeSQL(opeid),
      address: escapeSQL(r.address),
      city: escapeSQL(r.city),
      state_abbr: escapeSQL(r.state_abbr),
      zip: escapeSQL(r.zip),
      lat: isValidNumber(r.lat) ? parseFloat(r.lat) : 'NULL',
      lng: isValidNumber(r.lng) ? parseFloat(r.lng) : 'NULL',
      locale: escapeSQL(r.locale),
      website: escapeSQL(r.website),
      institution_control: escapeSQL(r.institution_control),
      institution_category: "'vocational'",
      vocational_type: escapeSQL(r.vocational_type),
      iclevel: 3,
      total_enrollment: isValidNumber(r.total_enrollment) ? Math.round(parseFloat(r.total_enrollment)) : 'NULL',
      tuition_in_state: isValidNumber(r.tuition_in_state) ? Math.round(parseFloat(r.tuition_in_state)) : 'NULL',
      tuition_out_state: isValidNumber(r.tuition_out_state) ? Math.round(parseFloat(r.tuition_out_state)) : 'NULL',
      pct_receiving_aid: isValidNumber(r.pct_pell) ? Math.round(parseFloat(r.pct_pell) * 100) : 'NULL',
      pct_white: isValidNumber(r.pct_white) ? Math.round(parseFloat(r.pct_white) * 100) : 'NULL',
      pct_black: isValidNumber(r.pct_black) ? Math.round(parseFloat(r.pct_black) * 100) : 'NULL',
      pct_hispanic: isValidNumber(r.pct_hispanic) ? Math.round(parseFloat(r.pct_hispanic) * 100) : 'NULL',
      pct_asian: isValidNumber(r.pct_asian) ? Math.round(parseFloat(r.pct_asian) * 100) : 'NULL',
      pct_female: isValidNumber(r.pct_female) ? Math.round(parseFloat(r.pct_female) * 100) : 'NULL',
      accreditation: escapeSQL(r.accreditation),
      offers_certificate: 1,
      is_degree_granting: 0,
      active: 1,
    };

    inserts.push(`INSERT INTO colleges (
      institution_name, page_name, ipeds_id, opeid,
      address, city, state_abbr, zip, lat, lng, locale,
      website, institution_control, institution_category, vocational_type, iclevel,
      total_enrollment, tuition_in_state, tuition_out_state,
      pct_receiving_aid, pct_white, pct_black, pct_hispanic, pct_asian, pct_female,
      accreditation, offers_certificate, is_degree_granting, active
    ) VALUES (
      ${values.institution_name}, ${values.page_name}, ${values.ipeds_id}, ${values.opeid},
      ${values.address}, ${values.city}, ${values.state_abbr}, ${values.zip}, ${values.lat}, ${values.lng}, ${values.locale},
      ${values.website}, ${values.institution_control}, ${values.institution_category}, ${values.vocational_type}, ${values.iclevel},
      ${values.total_enrollment}, ${values.tuition_in_state}, ${values.tuition_out_state},
      ${values.pct_receiving_aid}, ${values.pct_white}, ${values.pct_black}, ${values.pct_hispanic}, ${values.pct_asian}, ${values.pct_female},
      ${values.accreditation}, ${values.offers_certificate}, ${values.is_degree_granting}, ${values.active}
    );`);
  }

  return inserts.join('\n');
}

async function main() {
  const csvPath = path.join(__dirname, '../data/college-scorecard/MERGED2023_24_PP.csv');

  console.log('Parsing College Scorecard for vocational schools...');
  const records = await parseCSV(csvPath);

  console.log('\nGenerating SQL inserts...');
  const sql = generateSQL(records);

  const outputPath = path.join(__dirname, '../data/college-scorecard/vocational-import.sql');
  fs.writeFileSync(outputPath, sql);

  console.log(`\nSQL file written to: ${outputPath}`);
  console.log(`Total INSERT statements: ${records.length}`);
}

main().catch(console.error);
