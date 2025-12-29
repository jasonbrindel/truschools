const fs = require('fs');
const path = require('path');

const articlesDir = path.join(__dirname, '../src/pages/education-articles');

// Get all .astro files except index.astro
const files = fs.readdirSync(articlesDir)
  .filter(f => f.endsWith('.astro') && f !== 'index.astro');

let fixed = 0;

files.forEach(file => {
  const filePath = path.join(articlesDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Pattern to find broken lines where publishDate got inserted mid-string
  // Look for: description = "...'
  // const publishDate = "...";...rest of description";
  const brokenPattern = /const description = "(.*?)'\nconst publishDate = "(\d{4}-\d{2}-\d{2})";(.*?)";/;

  const match = content.match(brokenPattern);
  if (match) {
    const beforeApostrophe = match[1];
    const publishDate = match[2];
    const afterApostrophe = match[3];

    // Reconstruct the proper lines
    const fixedDescription = `const description = "${beforeApostrophe}'${afterApostrophe}";`;
    const fixedPublishDate = `const publishDate = "${publishDate}";`;

    content = content.replace(brokenPattern, `${fixedDescription}\n${fixedPublishDate}`);

    fs.writeFileSync(filePath, content);
    console.log(`Fixed ${file}`);
    fixed++;
  }
});

console.log(`\nFixed ${fixed} files`);
