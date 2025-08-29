import Database from 'better-sqlite3';
const db = new Database('sqlite.db');

// 全チームのデータを確認
const teams = db.prepare('SELECT * FROM teams').all();
console.log('チーム一覧:');
console.table(teams);

db.close();