const fs = require('fs');
const path = require('path');

const articlesDir = path.join(__dirname, '../src/pages/education-articles');

// Get all .astro files except index.astro
const files = fs.readdirSync(articlesDir)
  .filter(f => f.endsWith('.astro') && f !== 'index.astro');

let updated = 0;
let skipped = 0;

files.forEach(file => {
  const filePath = path.join(articlesDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Check if already has ArticleRating
  if (content.includes('ArticleRating')) {
    console.log(`Skipping ${file} - already has ArticleRating`);
    skipped++;
    return;
  }

  // Extract slug from filename
  const slug = file.replace('.astro', '');

  // Add import after other component imports
  const importLine = "import ArticleRating from '@/components/ArticleRating.astro';";

  // Find the last import line and add after it
  const importRegex = /^import .+ from ['"]@\/components\/.+['"];?$/gm;
  let lastImportMatch;
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    lastImportMatch = match;
  }

  if (lastImportMatch) {
    const insertPos = lastImportMatch.index + lastImportMatch[0].length;
    content = content.slice(0, insertPos) + '\n' + importLine + content.slice(insertPos);
  } else {
    // Try to add after Layout import
    const layoutImport = content.match(/^import Layout from ['"]@\/layouts\/Layout.astro['"];?$/m);
    if (layoutImport) {
      const insertPos = layoutImport.index + layoutImport[0].length;
      content = content.slice(0, insertPos) + '\n' + importLine + content.slice(insertPos);
    } else {
      console.log(`Warning: Could not find import location in ${file}`);
      return;
    }
  }

  // Add the component before the footer
  // Try pattern 1: <!-- Footer --> before <footer
  const footerCommentPattern = /(\s*)(<!-- Footer -->)\n(\s*)(<footer class)/;
  if (footerCommentPattern.test(content)) {
    content = content.replace(footerCommentPattern,
      `$1<!-- Article Rating -->\n$1<ArticleRating slug="${slug}" />\n\n$1$2\n$3$4`);
  } else {
    // Try pattern 2: Just <footer class
    const footerPattern = /(\s*)(<footer class="mt-16)/;
    if (footerPattern.test(content)) {
      content = content.replace(footerPattern,
        `$1<!-- Article Rating -->\n$1<ArticleRating slug="${slug}" />\n\n$1$2`);
    } else {
      console.log(`Warning: Could not find footer pattern in ${file}`);
      return;
    }
  }

  fs.writeFileSync(filePath, content);
  console.log(`Updated ${file}`);
  updated++;
});

console.log(`\nDone! Updated: ${updated}, Skipped: ${skipped}`);
