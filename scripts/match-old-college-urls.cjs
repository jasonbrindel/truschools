const { execSync } = require('child_process');
const fs = require('fs');

// Load old URLs
const oldUrls = JSON.parse(fs.readFileSync('./data/old-college-urls.json', 'utf8'));
console.log(`Loaded ${oldUrls.length.toLocaleString()} old college URLs`);

// Get all current colleges from database
console.log('Fetching current colleges from database...');

const result = execSync(
  `CLOUDFLARE_ACCOUNT_ID=db05e74e773d91c84692ba064111c43c npx wrangler d1 execute trueschools-db --remote --command="SELECT page_name, institution_name, city, state FROM colleges WHERE active = 1" --json`,
  { maxBuffer: 50 * 1024 * 1024 }
).toString();

const parsed = JSON.parse(result);
const currentColleges = parsed[0].results;
console.log(`Found ${currentColleges.length.toLocaleString()} active colleges in database`);

// Create state name to abbreviation mapping
const stateMap = {
  'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR', 'california': 'CA',
  'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE', 'florida': 'FL', 'georgia': 'GA',
  'hawaii': 'HI', 'idaho': 'ID', 'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA',
  'kansas': 'KS', 'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
  'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS', 'missouri': 'MO',
  'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV', 'new-hampshire': 'NH', 'new-jersey': 'NJ',
  'new-mexico': 'NM', 'new-york': 'NY', 'north-carolina': 'NC', 'north-dakota': 'ND', 'ohio': 'OH',
  'oklahoma': 'OK', 'oregon': 'OR', 'pennsylvania': 'PA', 'rhode-island': 'RI', 'south-carolina': 'SC',
  'south-dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT', 'vermont': 'VT',
  'virginia': 'VA', 'washington': 'WA', 'west-virginia': 'WV', 'wisconsin': 'WI', 'wyoming': 'WY',
  'district-of-columbia': 'DC', 'puerto-rico': 'PR'
};

// Slugify function
function slugify(text) {
  return text.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

// Build lookup map for current colleges
// Key: state_abbr + school_name_slug (without city-state suffix)
const currentByName = new Map();

for (const college of currentColleges) {
  if (!college.state) continue;
  const stateAbbr = college.state.toLowerCase();

  // Extract just the school name part from page_name (remove -city-state suffix)
  const pageParts = college.page_name.split('-');
  const stateIndex = pageParts.lastIndexOf(stateAbbr);

  let schoolSlug;
  if (stateIndex > 0) {
    const citySlug = slugify(college.city);
    const cityParts = citySlug.split('-');
    const potentialCityStart = stateIndex - cityParts.length;

    if (potentialCityStart > 0) {
      const potentialCity = pageParts.slice(potentialCityStart, stateIndex).join('-');
      if (potentialCity === citySlug) {
        schoolSlug = pageParts.slice(0, potentialCityStart).join('-');
      }
    }
  }

  if (!schoolSlug) {
    // Fallback: use institution name
    schoolSlug = slugify(college.institution_name);
  }

  // Store with state + school slug key
  const key = `${stateAbbr}|${schoolSlug}`;
  if (!currentByName.has(key)) {
    currentByName.set(key, college);
  }
}

console.log(`Built lookup with ${currentByName.size} entries`);

// Match old URLs to current
const redirects = [];
const matched = [];
const notMatched = [];

for (const oldUrl of oldUrls) {
  const stateAbbr = stateMap[oldUrl.state];
  if (!stateAbbr) {
    notMatched.push({ ...oldUrl, reason: 'unknown state' });
    continue;
  }

  const stateAbbrLower = stateAbbr.toLowerCase();
  const key = `${stateAbbrLower}|${oldUrl.school}`;
  const match = currentByName.get(key);

  if (match) {
    matched.push(oldUrl);
    // Only create redirect if page_name differs from old school slug
    if (match.page_name !== oldUrl.school) {
      redirects.push({
        from: `/colleges-universities/${oldUrl.state}/${oldUrl.school}`,
        to: `/colleges-universities/${oldUrl.state}/${match.page_name}`,
        pageName: match.page_name
      });
    }
  } else {
    notMatched.push({ ...oldUrl, reason: 'no match found' });
  }
}

console.log(`\nResults:`);
console.log(`  Matched: ${matched.length.toLocaleString()}`);
console.log(`  Not matched: ${notMatched.length.toLocaleString()}`);
console.log(`  Redirects needed: ${redirects.length.toLocaleString()}`);
console.log(`  Match rate: ${((matched.length / oldUrls.length) * 100).toFixed(1)}%`);

// Save redirects
fs.writeFileSync('./data/college-redirects.json', JSON.stringify(redirects, null, 2));
console.log(`\nSaved redirects to data/college-redirects.json`);

// Save not matched for analysis
fs.writeFileSync('./data/unmatched-old-college-urls.json', JSON.stringify(notMatched.slice(0, 500), null, 2));
console.log(`Saved sample of unmatched URLs to data/unmatched-old-college-urls.json`);

// Show sample of redirects
console.log(`\nSample redirects:`);
for (let i = 0; i < Math.min(10, redirects.length); i++) {
  console.log(`  ${redirects[i].from}`);
  console.log(`    -> ${redirects[i].to}`);
}

// Show sample of unmatched
console.log(`\nSample unmatched:`);
for (let i = 0; i < Math.min(10, notMatched.length); i++) {
  console.log(`  /colleges-universities/${notMatched[i].state}/${notMatched[i].school}/`);
}
