const fs = require('fs');
const path = require('path');

const articlesDir = path.join(__dirname, '../src/pages/education-articles');

// Get all .astro files except index.astro
const files = fs.readdirSync(articlesDir)
  .filter(f => f.endsWith('.astro') && f !== 'index.astro');

let updated = 0;
let skipped = 0;

// New imports to add
const newImports = [
  "import RelatedArticles from '@/components/RelatedArticles.astro';",
  "import BrowseByTopic from '@/components/BrowseByTopic.astro';",
  "import ArticleNewsletter from '@/components/ArticleNewsletter.astro';",
  "import ShareButtons from '@/components/ShareButtons.astro';"
];

files.forEach(file => {
  const filePath = path.join(articlesDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  const slug = file.replace('.astro', '');

  // Check if already has RelatedArticles (meaning already updated)
  if (content.includes('RelatedArticles')) {
    console.log(`Skipping ${file} - already has enhancements`);
    skipped++;
    return;
  }

  // Extract tags from the file
  const tagsMatch = content.match(/const tags\s*=\s*\[([^\]]+)\]/);
  let tagsStr = "['Uncategorized']";
  if (tagsMatch) {
    tagsStr = `[${tagsMatch[1]}]`;
  }

  // Add imports after ArticleRating import
  const articleRatingImport = "import ArticleRating from '@/components/ArticleRating.astro';";
  if (content.includes(articleRatingImport)) {
    content = content.replace(
      articleRatingImport,
      articleRatingImport + '\n' + newImports.join('\n')
    );
  } else {
    console.log(`Warning: Could not find ArticleRating import in ${file}`);
    return;
  }

  // Find the ArticleRating component and add new components after it
  // Pattern: <ArticleRating slug="..." />
  const articleRatingPattern = /(<ArticleRating slug="[^"]+" \/>)/;
  const match = content.match(articleRatingPattern);

  if (match) {
    const newComponents = `
    ${match[1]}

    <!-- Related Articles -->
    <RelatedArticles currentSlug="${slug}" currentTags={tags} />

    <!-- Browse by Topic -->
    <BrowseByTopic tags={tags} />

    <!-- Newsletter Signup -->
    <ArticleNewsletter articleTags={tags} />

    <!-- Share Buttons -->
    <ShareButtons title={title} slug="${slug}" />`;

    content = content.replace(match[1], newComponents);
  } else {
    console.log(`Warning: Could not find ArticleRating component in ${file}`);
    return;
  }

  fs.writeFileSync(filePath, content);
  console.log(`Updated ${file}`);
  updated++;
});

console.log(`\nDone! Updated: ${updated}, Skipped: ${skipped}`);
