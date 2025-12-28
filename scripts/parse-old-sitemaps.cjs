const fs = require('fs');
const path = require('path');

const sitemapDir = './data/old-sitemaps';
const files = fs.readdirSync(sitemapDir).filter(f => f.endsWith('.xml'));

const urlPatterns = {};
let totalUrls = 0;

for (const file of files) {
  const content = fs.readFileSync(path.join(sitemapDir, file), 'utf8');
  const matches = content.match(/<loc>([^<]+)<\/loc>/g) || [];

  for (const match of matches) {
    const url = match.replace(/<\/?loc>/g, '');
    const urlPath = url.replace('http://www.trueschools.com', '');
    totalUrls++;

    // Extract pattern (first 2-3 path segments)
    const parts = urlPath.split('/').filter(Boolean);
    let pattern;

    if (parts.length === 0) {
      pattern = '/';
    } else if (parts.length === 1) {
      pattern = '/' + parts[0] + '/';
    } else if (parts[0] === 'schools') {
      // /schools/[state]/[city]/[school]/ or subpages like /map, /ratings, /stats
      const lastPart = parts[parts.length - 1];
      if (parts.length >= 4 && ['map', 'ratings', 'stats'].includes(lastPart)) {
        pattern = '/schools/[state]/[city]/[school]/' + lastPart + '/';
      } else if (parts.length >= 3) {
        pattern = '/schools/[state]/[city]/[school]/';
      } else if (parts.length === 2) {
        pattern = '/schools/[state]/';
      } else {
        pattern = '/schools/';
      }
    } else if (parts[0] === 'colleges-universities') {
      const lastPart = parts[parts.length - 1];
      if (parts.length >= 3 && ['admissions', 'faculty', 'financial-aid', 'programs'].includes(lastPart)) {
        pattern = '/colleges-universities/[state]/[school]/' + lastPart + '/';
      } else if (parts.length >= 3) {
        pattern = '/colleges-universities/[state]/[school]/';
      } else if (parts.length === 2) {
        pattern = '/colleges-universities/[state]/';
      } else {
        pattern = '/colleges-universities/';
      }
    } else if (parts[0] === 'preschools') {
      pattern = '/preschools/[state]/[city]/[school]/';
    } else if (parts[0] === 'kindergartens') {
      pattern = '/kindergartens/[state]/[city]/[school]/';
    } else if (parts[0] === 'elementary-schools') {
      pattern = '/elementary-schools/[state]/[city]/[school]/';
    } else if (parts[0] === 'middle-schools') {
      pattern = '/middle-schools/[state]/[city]/[school]/';
    } else if (parts[0] === 'high-schools') {
      pattern = '/high-schools/[state]/[city]/[school]/';
    } else if (parts[0] === 'resources') {
      pattern = '/resources/' + (parts[1] || '') + '/...';
    } else {
      pattern = '/' + parts[0] + '/...';
    }

    if (!urlPatterns[pattern]) {
      urlPatterns[pattern] = { count: 0, examples: [] };
    }
    urlPatterns[pattern].count++;
    if (urlPatterns[pattern].examples.length < 5) {
      urlPatterns[pattern].examples.push(urlPath);
    }
  }
}

console.log('Total URLs in old sitemaps: ' + totalUrls.toLocaleString() + '\n');
console.log('URL Patterns:\n');

const sorted = Object.entries(urlPatterns).sort((a, b) => b[1].count - a[1].count);
for (const [pattern, data] of sorted) {
  console.log(pattern);
  console.log('  Count: ' + data.count.toLocaleString());
  console.log('  Examples:');
  for (const ex of data.examples) {
    console.log('    ' + ex);
  }
  console.log('');
}
