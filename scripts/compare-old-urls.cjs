const fs = require('fs');
const path = require('path');

// Parse all school URLs from old sitemaps
const sitemapDir = './data/old-sitemaps';
const files = fs.readdirSync(sitemapDir).filter(f => f.endsWith('.xml'));

const oldSchoolUrls = [];

for (const file of files) {
  // Only process school sitemaps (not colleges)
  if (!file.includes('schools-all') || file.includes('cities') || file.includes('states')) continue;

  const content = fs.readFileSync(path.join(sitemapDir, file), 'utf8');
  const matches = content.match(/<loc>([^<]+)<\/loc>/g) || [];

  for (const match of matches) {
    const url = match.replace(/<\/?loc>/g, '');
    const urlPath = url.replace('http://www.trueschools.com', '');

    // Parse /schools/[state]/[city]/[school]/ pattern
    const parts = urlPath.split('/').filter(Boolean);
    if (parts[0] === 'schools' && parts.length >= 4) {
      // Skip subpages like /map, /ratings, /stats
      const lastPart = parts[parts.length - 1];
      if (['map', 'ratings', 'stats'].includes(lastPart)) continue;

      oldSchoolUrls.push({
        path: urlPath,
        state: parts[1],
        city: parts[2],
        school: parts[3]
      });
    }
  }
}

console.log(`Found ${oldSchoolUrls.length.toLocaleString()} unique school URLs from old sitemaps`);

// Write to file for database comparison
const outputData = oldSchoolUrls.map(u => `${u.state}\t${u.city}\t${u.school}`).join('\n');
fs.writeFileSync('./data/old-school-urls.tsv', outputData);
console.log('Written to data/old-school-urls.tsv');

// Also output JSON for easier processing
fs.writeFileSync('./data/old-school-urls.json', JSON.stringify(oldSchoolUrls, null, 2));
console.log('Written to data/old-school-urls.json');
