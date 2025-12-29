const fs = require('fs');

// Load redirects
const redirects = JSON.parse(fs.readFileSync('./data/school-redirects.json', 'utf8'));
console.log(`Loaded ${redirects.length.toLocaleString()} redirects`);

// Group by page_name to avoid duplicates (some old URLs might map to same school)
const pageNameToOldSlug = new Map();
for (const r of redirects) {
  const oldSlug = r.from.split('/').pop();
  // Only store if we don't already have one (keep first match)
  if (!pageNameToOldSlug.has(r.pageName)) {
    pageNameToOldSlug.set(r.pageName, oldSlug);
  }
}

console.log(`Unique page_names to update: ${pageNameToOldSlug.size.toLocaleString()}`);

// Generate SQL
const sqlLines = [];
for (const [pageName, oldSlug] of pageNameToOldSlug) {
  // Escape single quotes
  const escapedOldSlug = oldSlug.replace(/'/g, "''");
  const escapedPageName = pageName.replace(/'/g, "''");
  sqlLines.push(`UPDATE schools SET old_page_name = '${escapedOldSlug}' WHERE page_name = '${escapedPageName}';`);
}

// Write to file
const sqlContent = sqlLines.join('\n');
fs.writeFileSync('./data/update-old-page-names.sql', sqlContent);
console.log(`Written ${sqlLines.length.toLocaleString()} UPDATE statements to data/update-old-page-names.sql`);

// Also split into batches for execution (D1 has limits)
const batchSize = 500;
const batches = [];
for (let i = 0; i < sqlLines.length; i += batchSize) {
  batches.push(sqlLines.slice(i, i + batchSize).join('\n'));
}

fs.mkdirSync('./data/old-pagename-batches', { recursive: true });
for (let i = 0; i < batches.length; i++) {
  const batchNum = String(i + 1).padStart(3, '0');
  fs.writeFileSync(`./data/old-pagename-batches/batch-${batchNum}.sql`, batches[i]);
}
console.log(`Split into ${batches.length} batch files in data/old-pagename-batches/`);
