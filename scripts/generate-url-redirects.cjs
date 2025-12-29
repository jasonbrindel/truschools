const { execSync } = require('child_process');
const fs = require('fs');

// Load old URLs
const oldUrls = JSON.parse(fs.readFileSync('./data/old-school-urls.json', 'utf8'));
console.log(`Loaded ${oldUrls.length.toLocaleString()} old URLs`);

// Get all current schools from database
console.log('Fetching current schools from database...');

const result = execSync(
  `CLOUDFLARE_ACCOUNT_ID=db05e74e773d91c84692ba064111c43c npx wrangler d1 execute trueschools-db --remote --command="SELECT page_name, school_name, city, state FROM schools WHERE active = 1" --json`,
  { maxBuffer: 50 * 1024 * 1024 }
).toString();

const parsed = JSON.parse(result);
const currentSchools = parsed[0].results;
console.log(`Found ${currentSchools.length.toLocaleString()} active schools in database`);

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

// Slugify function (same as used in Astro)
function slugify(text) {
  return text.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

// Build lookup maps for current schools
// Key: state_abbr + city_slug + school_name_slug (without city-state suffix)
const currentByLocation = new Map();

for (const school of currentSchools) {
  const citySlug = slugify(school.city);
  const stateAbbr = school.state.toLowerCase();

  // Extract just the school name part from page_name (remove -city-state suffix)
  // page_name format: "school-name-city-state" -> we want "school-name"
  const pageParts = school.page_name.split('-');
  const stateIndex = pageParts.lastIndexOf(stateAbbr);

  let schoolSlug;
  if (stateIndex > 0) {
    // Find where city starts (before state)
    const cityParts = citySlug.split('-');
    const potentialCityStart = stateIndex - cityParts.length;

    if (potentialCityStart > 0) {
      // Check if the parts before state match city
      const potentialCity = pageParts.slice(potentialCityStart, stateIndex).join('-');
      if (potentialCity === citySlug) {
        schoolSlug = pageParts.slice(0, potentialCityStart).join('-');
      }
    }
  }

  if (!schoolSlug) {
    // Fallback: try to match school_name directly
    schoolSlug = slugify(school.school_name);
  }

  // Store with multiple keys for matching
  const key = `${stateAbbr}|${citySlug}|${schoolSlug}`;
  if (!currentByLocation.has(key)) {
    currentByLocation.set(key, school);
  }

  // Also store by just school slug + state for broader matching
  const stateKey = `${stateAbbr}|${schoolSlug}`;
  if (!currentByLocation.has(stateKey)) {
    currentByLocation.set(stateKey, school);
  }
}

console.log(`Built lookup with ${currentByLocation.size} entries`);

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

  // Try exact match with city
  const exactKey = `${stateAbbrLower}|${oldUrl.city}|${oldUrl.school}`;
  let match = currentByLocation.get(exactKey);

  // Try match without city (state + school slug only)
  if (!match) {
    const stateKey = `${stateAbbrLower}|${oldUrl.school}`;
    match = currentByLocation.get(stateKey);
  }

  if (match) {
    matched.push(oldUrl);
    // Only create redirect if page_name differs from old school slug
    if (match.page_name !== oldUrl.school) {
      const citySlug = slugify(match.city);
      redirects.push({
        from: `/schools/${oldUrl.state}/${oldUrl.city}/${oldUrl.school}`,
        to: `/schools/${oldUrl.state}/${citySlug}/${match.page_name}`,
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
fs.writeFileSync('./data/school-redirects.json', JSON.stringify(redirects, null, 2));
console.log(`\nSaved redirects to data/school-redirects.json`);

// Save not matched for analysis
fs.writeFileSync('./data/unmatched-old-urls.json', JSON.stringify(notMatched.slice(0, 1000), null, 2));
console.log(`Saved sample of unmatched URLs to data/unmatched-old-urls.json`);

// Show sample of redirects
console.log(`\nSample redirects:`);
for (let i = 0; i < Math.min(10, redirects.length); i++) {
  console.log(`  ${redirects[i].from}`);
  console.log(`    -> ${redirects[i].to}`);
}

// Show sample of unmatched
console.log(`\nSample unmatched:`);
for (let i = 0; i < Math.min(10, notMatched.length); i++) {
  console.log(`  /schools/${notMatched[i].state}/${notMatched[i].city}/${notMatched[i].school}/`);
}
