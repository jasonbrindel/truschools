const fs = require('fs');
const path = require('path');

// Read the MySQL dump file
const sqlFile = fs.readFileSync(path.join(__dirname, '../data/videos/class_videos.sql'), 'utf8');

// Extract INSERT statements and convert to SQLite format
const insertRegex = /INSERT INTO `class_videos`[^;]+;/gs;
const matches = sqlFile.match(insertRegex);

if (!matches) {
  console.error('No INSERT statements found');
  process.exit(1);
}

// Convert MySQL INSERT syntax to SQLite
let output = '';

// First, add the table creation (will be done separately via migration)
output += '-- Import class_videos data\n';
output += '-- Run this after the migration creates the table\n\n';

for (const match of matches) {
  // Remove backticks and convert to SQLite format
  let converted = match
    .replace(/`/g, '')  // Remove backticks
    .replace(/\\'/g, "''")  // Convert escaped quotes
    .replace(/\\n/g, ' ')  // Remove newlines in strings
    .replace(/\r/g, '')  // Remove carriage returns
    .replace(/INSERT INTO class_videos \(/g, 'INSERT INTO class_videos (');

  output += converted + '\n\n';
}

// Write the converted SQL
fs.writeFileSync(path.join(__dirname, '../data/videos/class_videos_sqlite.sql'), output);

console.log('Converted MySQL to SQLite format');
console.log('Output: data/videos/class_videos_sqlite.sql');
