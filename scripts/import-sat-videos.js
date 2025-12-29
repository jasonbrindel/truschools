// Script to import new SAT Prep videos from Khan Academy
// Run with: node scripts/import-sat-videos.js

const API_KEY = 'AIzaSyAakB5w_nT3Pr7ONRY2A95Ukd4Hk7SQwbQ';

const playlists = [
  {
    id: 'PL6dL3ACWCL8fKWXrw4w7wi9VaaRmDwt3R',
    course: 'About the SAT',
    courseSlug: 'about-the-sat',
  },
  {
    id: 'PL6dL3ACWCL8e3XkjcecqjPEYnfyulUoJ6',
    course: 'Reading & Writing',
    courseSlug: 'reading-writing',
  },
  {
    id: 'PL6dL3ACWCL8ebFVL96B5PPrFv4gxckJu8',
    course: 'Heart of Algebra',
    courseSlug: 'heart-of-algebra',
  },
  {
    id: 'PL6dL3ACWCL8fIB2l-UQNQbqhANl8g3avL',
    course: 'Problem Solving & Data Analysis',
    courseSlug: 'problem-solving-data-analysis',
  },
  {
    id: 'PL6dL3ACWCL8c_Vw8F0-97LPMr927tkAFV',
    course: 'Passport to Advanced Math',
    courseSlug: 'passport-to-advanced-math',
  },
  {
    id: 'PL6dL3ACWCL8cIVmBrzwD8JEy2i9jZUWgA',
    course: 'Additional Topics in Math',
    courseSlug: 'additional-topics-math',
  },
];

async function fetchPlaylist(playlistId) {
  const videos = [];
  let pageToken = '';

  do {
    const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${playlistId}&key=${API_KEY}${pageToken ? `&pageToken=${pageToken}` : ''}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.items) {
      videos.push(...data.items);
    }

    pageToken = data.nextPageToken || '';
  } while (pageToken);

  return videos;
}

function cleanTitle(title) {
  // Remove " | Reading & Writing | SAT | Khan Academy" etc. from end
  return title
    .replace(/\s*\|\s*Reading & Writing\s*\|\s*SAT\s*\|\s*Khan Academy$/i, '')
    .replace(/\s*\|\s*Math\s*\|\s*SAT\s*\|\s*Khan Academy$/i, '')
    .replace(/\s*\|\s*Math\s*\|\s*New SAT\s*\|\s*Khan Academy$/i, '')
    .replace(/\s*\|\s*Tips & Strategies\s*\|\s*SAT\s*\|\s*Khan Academy$/i, '')
    .replace(/\s*\|\s*SAT\s*\|\s*Khan Academy$/i, '')
    .replace(/\s*\|\s*Khan Academy$/i, '')
    .trim();
}

function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/[—–]/g, '-')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function extractTagline(description) {
  // Get first line of description as tagline
  const firstLine = description.split('\n')[0];
  if (firstLine && firstLine.length < 200) {
    return firstLine;
  }
  return '';
}

async function main() {
  const allVideos = [];

  for (const playlist of playlists) {
    console.log(`Fetching ${playlist.course}...`);
    const videos = await fetchPlaylist(playlist.id);

    let order = 1;
    for (const video of videos) {
      const title = video.snippet.title;

      // Skip deprecated videos
      if (title.includes('[Deprecated]')) {
        console.log(`  Skipping deprecated: ${title}`);
        continue;
      }

      const cleanedTitle = cleanTitle(title);
      const slug = generateSlug(cleanedTitle);
      const videoId = video.snippet.resourceId.videoId;
      const description = video.snippet.description || '';
      const tagline = extractTagline(description);

      allVideos.push({
        dept: 'SAT Prep',
        deptSlug: 'sat-prep',
        course: playlist.course,
        courseSlug: playlist.courseSlug,
        class: cleanedTitle,
        classSlug: slug,
        order: order++,
        tagline: tagline,
        description: description,
        videoId: videoId,
        embedUrl: `https://www.youtube.com/embed/${videoId}`,
      });
    }

    console.log(`  Added ${order - 1} videos`);
  }

  console.log(`\nTotal videos: ${allVideos.length}`);

  // Generate SQL statements
  const sqlStatements = allVideos.map(v => {
    const escapeSql = (str) => str.replace(/'/g, "''").replace(/\n/g, '\\n').replace(/\r/g, '');
    return `INSERT INTO class_videos (dept, course, class, dept_page, course_page, class_page, class_order, class_tagline, class_description, author, author_tagline, author_web, embed_url) VALUES ('${escapeSql(v.dept)}', '${escapeSql(v.course)}', '${escapeSql(v.class)}', '${v.deptSlug}', '${v.courseSlug}', '${v.classSlug}', ${v.order}, '${escapeSql(v.tagline)}', '${escapeSql(v.description)}', 'Salman Khan', 'Khan Academy', 'https://www.khanacademy.org', '${v.embedUrl}');`;
  });

  // Output SQL file
  const fs = await import('fs');
  fs.writeFileSync('scripts/sat-videos-insert.sql', sqlStatements.join('\n'));
  console.log('\nSQL written to scripts/sat-videos-insert.sql');

  // Also output JSON for reference
  fs.writeFileSync('scripts/sat-videos.json', JSON.stringify(allVideos, null, 2));
  console.log('JSON written to scripts/sat-videos.json');
}

main().catch(console.error);
