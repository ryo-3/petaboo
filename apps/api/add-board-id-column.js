#!/usr/bin/env node

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔄 Adding board_id column to board_categories table...');

const dbPath = path.join(__dirname, 'sqlite.db');

try {
  const db = new Database(dbPath);
  
  // Check if column already exists
  const tableInfo = db.prepare("PRAGMA table_info(board_categories)").all();
  const hasboardIdColumn = tableInfo.some(col => col.name === 'board_id');
  
  if (hasboardIdColumn) {
    console.log('ℹ️  board_id column already exists');
  } else {
    // Add the board_id column
    db.exec("ALTER TABLE board_categories ADD COLUMN board_id INTEGER;");
    console.log('✅ Added board_id column to board_categories table');
  }
  
  db.close();
  console.log('🎉 Database schema update completed!');
  
} catch (error) {
  console.error('❌ Error occurred:', error.message);
  process.exit(1);
}