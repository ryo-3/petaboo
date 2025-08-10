#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🗑️  ローカルデータベースをリセットします...');

const dbPath = path.join(__dirname, 'sqlite.db');
const backupPath = path.join(__dirname, 'sqlite.db.backup');

try {
  // メインのデータベースファイルを削除
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
    console.log('✅ sqlite.db を削除しました');
  } else {
    console.log('ℹ️  sqlite.db は存在しませんでした');
  }

  // バックアップファイルを削除
  if (fs.existsSync(backupPath)) {
    fs.unlinkSync(backupPath);
    console.log('✅ sqlite.db.backup を削除しました');
  } else {
    console.log('ℹ️  sqlite.db.backup は存在しませんでした');
  }

  console.log('');
  console.log('🎉 データベースのリセットが完了しました！');
  console.log('');
  console.log('次の手順:');
  console.log('1. APIサーバーを再起動してください: npm run dev');
  console.log('2. 新しいデータベースファイルが自動作成されます');
  console.log('3. フロントエンドからアクセスしてテーブルを初期化してください');

} catch (error) {
  console.error('❌ エラーが発生しました:', error.message);
  process.exit(1);
}