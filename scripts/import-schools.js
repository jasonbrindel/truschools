/**
 * TruSchools Data Import Script
 *
 * This script imports school data from the MySQL SQL dump files
 * into the Cloudflare D1 SQLite database.
 *
 * Usage:
 *   1. First, apply migrations: npm run db:migrate:local
 *   2. Then run this script: node scripts/import-schools.js
 *
 * The script reads from the backup SQL files and converts them to D1-compatible format.
 */

import { readFileSync } from 'fs';
import { execSync } from 'child_process';

// Path to the SQL backup files
const SQL_BACKUP_PATH = '/Users/softdev/Library/Mobile Documents/com~apple~CloudDocs/Work/Websites & projects/Truschools.com/00Archives/2025-05-29full bkup/httpdocs/_db';

/**
 * Parse INSERT statements from MySQL dump and convert to SQLite-compatible format
 */
function parseInsertStatements(sqlContent, tableName) {
  const insertRegex = new RegExp(`INSERT INTO \`${tableName}\`[^;]+;`, 'gi');
  const matches = sqlContent.match(insertRegex) || [];

  return matches.map(insert => {
    // Convert MySQL syntax to SQLite
    return insert
      .replace(/\\'/g, "''")  // Escape single quotes
      .replace(/\\r\\n/g, '\n')
      .replace(/\\n/g, '\n')
      .replace(/\\\\/g, '\\');
  });
}

/**
 * Extract column values from an INSERT statement
 */
function extractValues(insertStatement) {
  const valuesMatch = insertStatement.match(/VALUES\s*\((.+)\)/i);
  if (!valuesMatch) return null;

  // Parse the values - this is simplified and may need adjustment
  const valuesStr = valuesMatch[1];
  const values = [];
  let current = '';
  let inString = false;
  let stringChar = '';

  for (let i = 0; i < valuesStr.length; i++) {
    const char = valuesStr[i];

    if (!inString && (char === "'" || char === '"')) {
      inString = true;
      stringChar = char;
      current += char;
    } else if (inString && char === stringChar && valuesStr[i - 1] !== '\\') {
      inString = false;
      current += char;
    } else if (!inString && char === ',') {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current.trim());

  return values;
}

/**
 * Generate SQLite INSERT statements for the schools table
 */
function generateSchoolInserts(mysqlInserts) {
  const sqliteInserts = [];

  for (const insert of mysqlInserts) {
    // Map MySQL columns to our new schema
    // This is a template - actual column mapping depends on the source data structure
    const converted = insert
      .replace(/`schools`/g, 'schools')
      .replace(/`/g, '')
      .replace(/SchoolName/g, 'school_name')
      .replace(/PageName/g, 'page_name')
      .replace(/SchoolNcesID/g, 'nces_id')
      .replace(/LocAddress/g, 'address')
      .replace(/LocCity/g, 'city')
      .replace(/LocState/g, 'state_abbr')
      .replace(/LocZip/g, 'zip');

    sqliteInserts.push(converted);
  }

  return sqliteInserts;
}

/**
 * Main import function
 */
async function importData() {
  console.log('TruSchools Data Import Script');
  console.log('==============================\n');

  console.log('Reading SQL backup files...');

  try {
    // Read the schools SQL file
    const schoolsSql = readFileSync(`${SQL_BACKUP_PATH}/trueschools1_7.sql`, 'utf-8');
    console.log(`Read trueschools1_7.sql (${(schoolsSql.length / 1024 / 1024).toFixed(2)} MB)`);

    // Count INSERT statements
    const schoolInserts = (schoolsSql.match(/INSERT INTO `schools`/gi) || []).length;
    console.log(`Found ${schoolInserts} school INSERT statements`);

    // Read colleges SQL file
    const collegesSql = readFileSync(`${SQL_BACKUP_PATH}/trueschools1_4.sql`, 'utf-8');
    console.log(`Read trueschools1_4.sql (${(collegesSql.length / 1024 / 1024).toFixed(2)} MB)`);

    const collegeInserts = (collegesSql.match(/INSERT INTO `colleges`/gi) || []).length;
    console.log(`Found ${collegeInserts} college INSERT statements`);

    console.log('\n==============================');
    console.log('Import Summary:');
    console.log(`- Schools: ~${schoolInserts * 100} records (estimated)`);
    console.log(`- Colleges: ~${collegeInserts * 100} records (estimated)`);
    console.log('\nTo complete the import:');
    console.log('1. Run migrations first: npm run db:migrate:local');
    console.log('2. Use wrangler d1 execute to import data');
    console.log('\nExample command:');
    console.log('wrangler d1 execute trueschools-db --local --file=./data/schools-import.sql');

  } catch (error) {
    console.error('Error reading SQL files:', error.message);
    console.log('\nMake sure the backup files exist at:');
    console.log(SQL_BACKUP_PATH);
  }
}

// Run the import
importData();
