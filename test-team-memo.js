// テスト用のチームメモを作成するスクリプト
import Database from "better-sqlite3";

// UUIDを生成する簡単な関数
function generateUuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c == "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const db = new Database("./apps/api/sqlite.db");

// テスト用チームメモを挿入
const insertMemo = db.prepare(`
  INSERT INTO team_memos (team_id, user_id, original_id, uuid, title, content, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

try {
  const now = Math.floor(Date.now() / 1000);
  const uuid = generateUuid();

  const result = insertMemo.run(
    1, // team_id
    "test_user_123", // user_id
    "1", // original_id (一時的)
    uuid,
    "テストメモ1",
    "これはチーム共有メモのテストです。\n\n複数行のコンテンツもサポートしています。",
    now,
    now,
  );

  // original_idを実際のIDに更新
  const updateOriginalId = db.prepare(`
    UPDATE team_memos SET original_id = ? WHERE id = ?
  `);
  updateOriginalId.run(
    result.lastInsertRowid.toString(),
    result.lastInsertRowid,
  );

  console.log("✅ テストメモを作成しました:", {
    id: result.lastInsertRowid,
    uuid: uuid,
    title: "テストメモ1",
  });

  // 作成されたデータを確認
  const selectMemo = db.prepare(`
    SELECT * FROM team_memos WHERE id = ?
  `);
  const createdMemo = selectMemo.get(result.lastInsertRowid);
  console.log("📝 作成されたメモ:", createdMemo);
} catch (error) {
  console.error("❌ エラー:", error);
} finally {
  db.close();
}
