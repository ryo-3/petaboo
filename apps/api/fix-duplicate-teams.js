import Database from "better-sqlite3";

const db = new Database("./sqlite.db");

const userId = "user_2z0DUpwFMhf1Lk6prAP9MzVJZIh";

console.log("=== 重複チーム参加データの確認と修正 ===\n");

// 重複確認
const duplicates = db
  .prepare(
    `
  SELECT *, rowid 
  FROM team_members 
  WHERE user_id = ?
  ORDER BY team_id, joined_at
`,
  )
  .all(userId);

console.log("現在のデータ:");
duplicates.forEach((row) => {
  console.log(
    `- ROWID: ${row.rowid}, ID: ${row.id}, チームID: ${row.team_id}, ロール: ${row.role}, 参加日時: ${new Date(row.joined_at * 1000).toLocaleString("ja-JP")}`,
  );
});

// 重複を削除（最初のレコードのみ残す）
const uniqueTeams = {};
const toDelete = [];

duplicates.forEach((row) => {
  const key = `${row.team_id}_${row.user_id}`;
  if (!uniqueTeams[key]) {
    uniqueTeams[key] = row;
    console.log(`\n✓ 保持: ROWID ${row.rowid} (チームID: ${row.team_id})`);
  } else {
    toDelete.push(row.rowid);
    console.log(`✗ 削除対象: ROWID ${row.rowid} (チームID: ${row.team_id})`);
  }
});

if (toDelete.length > 0) {
  console.log(`\n削除対象: ${toDelete.length} 件の重複レコード`);
  console.log("削除を実行しますか？ (実行する場合はコメントアウトを解除)");

  // 実際に削除する場合はこのコメントを外す
  const deleteStmt = db.prepare("DELETE FROM team_members WHERE rowid = ?");
  toDelete.forEach((rowid) => {
    deleteStmt.run(rowid);
  });
  console.log(`\n✅ ${toDelete.length} 件の重複レコードを削除しました`);

  // 削除後の確認
  const afterDelete = db
    .prepare(
      `
    SELECT COUNT(*) as count 
    FROM team_members 
    WHERE user_id = ?
  `,
    )
    .get(userId);

  console.log(`\n削除後の参加チーム数: ${afterDelete.count}`);
} else {
  console.log("\n重複レコードはありません");
}

db.close();
