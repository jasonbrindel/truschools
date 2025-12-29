const fs = require('fs');

// Parse college URLs from old sitemap
const content = fs.readFileSync('./data/old-sitemaps/sitemap-colleges-universities.xml', 'utf8');
const matches = content.match(/<loc>([^<]+)<\/loc>/g) || [];

const collegeUrls = [];

for (const match of matches) {
  const url = match.replace(/<\/?loc>/g, '');
  const urlPath = url.replace('http://www.trueschools.com', '');

  // Parse /colleges-universities/[state]/[school]/ pattern
  const parts = urlPath.split('/').filter(Boolean);
  if (parts[0] === 'colleges-universities' && parts.length >= 3) {
    collegeUrls.push({
      path: urlPath,
      state: parts[1],
      school: parts[2]
    });
  }
}

console.log(`Found ${collegeUrls.length.toLocaleString()} college URLs from old sitemap`);

// Write to file
fs.writeFileSync('./data/old-college-urls.json', JSON.stringify(collegeUrls, null, 2));
console.log('Written to data/old-college-urls.json');

// Show sample
console.log('\nSample URLs:');
for (let i = 0; i < Math.min(10, collegeUrls.length); i++) {
  console.log(`  ${collegeUrls[i].path}`);
}
