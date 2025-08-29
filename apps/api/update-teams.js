const Database = require('better-sqlite3');
const db = new Database('sqlite.db');

// 既存のチームにcustomUrlを設定
const teams = db.prepare('SELECT id, name FROM teams WHERE custom_url IS NULL OR custom_url = ""').all();

teams.forEach(team => {
  // 名前からURLを生成（英数字とハイフンのみ）
  const customUrl = team.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || `team-${team.id}`;
  
  console.log(`Updating team ${team.id} (${team.name}) with customUrl: ${customUrl}`);
  
  db.prepare('UPDATE teams SET custom_url = ? WHERE id = ?').run(customUrl, team.id);
});

console.log('Done!');
db.close();