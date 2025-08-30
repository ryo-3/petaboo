import Database from "better-sqlite3";

const db = new Database("./sqlite.db");

console.log("=== 孤立したチームメンバーシップのクリーンアップ ===\n");

// 存在しないチームへの参加記録を削除
const result = db
  .prepare(
    `
  DELETE FROM team_members 
  WHERE team_id NOT IN (SELECT id FROM teams)
`,
  )
  .run();

console.log(
  `✅ ${result.changes} 件の孤立したメンバーシップレコードを削除しました`,
);

// クリーンアップ後の確認
const userId = "user_2z0DUpwFMhf1Lk6prAP9MzVJZIh";

const remainingTeams = db
  .prepare(
    `
  SELECT tm.*, t.name, t.custom_url 
  FROM team_members tm
  JOIN teams t ON tm.team_id = t.id
  WHERE tm.user_id = ?
`,
  )
  .all(userId);

console.log("\nクリーンアップ後のユーザーの参加チーム:");
remainingTeams.forEach((team) => {
  console.log(
    `- チームID: ${team.team_id}, 名前: ${team.name}, ロール: ${team.role}, URL: ${team.custom_url}`,
  );
});

const stats = db
  .prepare(
    `
  SELECT COUNT(*) as count FROM team_members WHERE user_id = ?
`,
  )
  .get(userId);

console.log(`\n現在の参加チーム数: ${stats.count}`);

db.close();
