import Database from "better-sqlite3";

// SQLiteデータベースに接続
const db = new Database("./sqlite.db");

// 主要テーブルのデータをエクスポート
console.log("=== Local Database Stats ===");

// メモ数
const memoCount = db.prepare("SELECT COUNT(*) as count FROM memos").get();
console.log(`Memos: ${memoCount.count}`);

// ボード数
const boardCount = db.prepare("SELECT COUNT(*) as count FROM boards").get();
console.log(`Boards: ${boardCount.count}`);

// タスク数
const taskCount = db.prepare("SELECT COUNT(*) as count FROM tasks").get();
console.log(`Tasks: ${taskCount.count}`);

// ユーザー数
const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get();
console.log(`Users: ${userCount.count}`);

// サンプルデータ確認
console.log("\n=== Sample Data ===");

const sampleMemo = db
  .prepare("SELECT id, title, user_id FROM memos LIMIT 1")
  .get();
if (sampleMemo) {
  console.log("Sample Memo:", sampleMemo);
}

const sampleUser = db
  .prepare("SELECT user_id, display_name FROM users LIMIT 1")
  .get();
if (sampleUser) {
  console.log("Sample User:", sampleUser);
}

db.close();
