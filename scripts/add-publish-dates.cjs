const fs = require('fs');
const path = require('path');

const articlesDir = path.join(__dirname, '../src/pages/education-articles');

// Get all .astro files except index.astro
const files = fs.readdirSync(articlesDir)
  .filter(f => f.endsWith('.astro') && f !== 'index.astro')
  .sort();

// Generate dates starting from a base date, spreading articles across time
// We'll assign dates from oldest to newest based on alphabetical order
// This gives us a reasonable spread while being deterministic

const startDate = new Date('2024-08-01');
const daysBetween = 3; // Spread articles roughly 3 days apart

let updated = 0;
let skipped = 0;

files.forEach((file, index) => {
  const filePath = path.join(articlesDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Check if already has publishDate
  if (content.includes('const publishDate')) {
    console.log(`Skipping ${file} - already has publishDate`);
    skipped++;
    return;
  }

  // Calculate date for this article
  const articleDate = new Date(startDate);
  articleDate.setDate(articleDate.getDate() + (index * daysBetween));
  const dateStr = articleDate.toISOString().split('T')[0]; // YYYY-MM-DD format

  // Find a good place to add publishDate - after title or description
  // Try to add after const description line
  const descriptionPattern = /(const description\s*=\s*["'][^"']+["'];?)/;
  const titlePattern = /(const title\s*=\s*["'][^"']+["'];?)/;

  if (descriptionPattern.test(content)) {
    content = content.replace(descriptionPattern, `$1\nconst publishDate = "${dateStr}";`);
  } else if (titlePattern.test(content)) {
    content = content.replace(titlePattern, `$1\nconst publishDate = "${dateStr}";`);
  } else {
    console.log(`Warning: Could not find insertion point in ${file}`);
    return;
  }

  fs.writeFileSync(filePath, content);
  console.log(`Updated ${file} with date ${dateStr}`);
  updated++;
});

console.log(`\nDone! Updated: ${updated}, Skipped: ${skipped}`);
