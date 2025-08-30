// チームテーブルのis_publicカラムを追加するスクリプト
const Database = require('better-sqlite3');

const db = new Database('./apps/api/sqlite.db');

try {
  // 現在のテーブル構造を確認
  console.log('現在のteamsテーブル構造:');
  const tableInfo = db.prepare('PRAGMA table_info(teams)').all();
  console.log(tableInfo);

  // is_publicカラムが存在するかチェック
  const hasIsPublic = tableInfo.some(col => col.name === 'is_public');
  
  if (hasIsPublic) {
    console.log('✅ is_publicカラムは既に存在しています');
  } else {
    console.log('⚠️ is_publicカラムが存在しません。追加します...');
    
    // is_publicカラムを追加
    db.exec(`
      ALTER TABLE teams ADD COLUMN is_public INTEGER NOT NULL DEFAULT 0;
    `);
    
    console.log('✅ is_publicカラムを追加しました');
    
    // 追加後の構造を確認
    const updatedTableInfo = db.prepare('PRAGMA table_info(teams)').all();
    console.log('更新後のテーブル構造:');
    console.log(updatedTableInfo);
  }

} catch (error) {
  console.error('❌ エラー:', error);
} finally {
  db.close();
}