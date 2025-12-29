const { execSync } = require('child_process');
const fs = require('fs');

// Load old URLs
const oldUrls = JSON.parse(fs.readFileSync('./data/old-school-urls.json', 'utf8'));
console.log(`Loaded ${oldUrls.length.toLocaleString()} old URLs`);

// Get all current page_names from database
console.log('Fetching current page_names from database...');

const result = execSync(
  `CLOUDFLARE_ACCOUNT_ID=db05e74e773d91c84692ba064111c43c npx wrangler d1 execute trueschools-db --remote --command="SELECT page_name, state FROM schools WHERE active = 1" --json`,
  { maxBuffer: 50 * 1024 * 1024 }
).toString();

const parsed = JSON.parse(result);
const currentSchools = parsed[0].results;
console.log(`Found ${currentSchools.length.toLocaleString()} active schools in database`);

// Create lookup map: page_name -> state
const currentPageNames = new Map();
for (const school of currentSchools) {
  currentPageNames.set(school.page_name, school.state);
}

// Check each old URL
const matched = [];
const notFound = [];

for (const oldUrl of oldUrls) {
  if (currentPageNames.has(oldUrl.school)) {
    matched.push(oldUrl);
  } else {
    notFound.push(oldUrl);
  }
}

console.log(`\nResults:`);
console.log(`  Matched: ${matched.length.toLocaleString()}`);
console.log(`  Not found: ${notFound.length.toLocaleString()}`);
console.log(`  Match rate: ${((matched.length / oldUrls.length) * 100).toFixed(1)}%`);

// Save not found for analysis
fs.writeFileSync('./data/old-urls-not-found.json', JSON.stringify(notFound, null, 2));
console.log(`\nSaved ${notFound.length.toLocaleString()} unmatched URLs to data/old-urls-not-found.json`);

// Show sample of not found
console.log(`\nSample of unmatched URLs:`);
for (let i = 0; i < Math.min(20, notFound.length); i++) {
  console.log(`  /schools/${notFound[i].state}/${notFound[i].city}/${notFound[i].school}/`);
}
