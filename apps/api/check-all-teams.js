import Database from "better-sqlite3";

const db = new Database("./sqlite.db");

const userId = "user_2z0DUpwFMhf1Lk6prAP9MzVJZIh";

console.log("=== 全チームデータの確認 ===\n");

// 全チームの確認
const allTeams = db.prepare("SELECT * FROM teams").all();
console.log("データベース内の全チーム:");
allTeams.forEach((team) => {
  console.log(`- ID: ${team.id}, 名前: ${team.name}, URL: ${team.custom_url}`);
});

console.log("\n=== ユーザーのチーム参加状況 ===\n");

// ユーザーのチーム参加状況
const userTeams = db
  .prepare(
    `
  SELECT tm.*, t.name, t.custom_url 
  FROM team_members tm
  JOIN teams t ON tm.team_id = t.id
  WHERE tm.user_id = ?
`,
  )
  .all(userId);

console.log(`ユーザー ${userId} の参加チーム:`);
userTeams.forEach((team) => {
  console.log(
    `- チームID: ${team.team_id}, 名前: ${team.name}, ロール: ${team.role}, URL: ${team.custom_url}`,
  );
});

// チームメンバーテーブルの全データ
console.log("\n=== team_members テーブルの全データ ===\n");
const allMembers = db.prepare("SELECT * FROM team_members").all();
console.log("全メンバーシップ:");
allMembers.forEach((member) => {
  console.log(
    `- ID: ${member.id}, チームID: ${member.team_id}, ユーザーID: ${member.user_id}, ロール: ${member.role}`,
  );
});

// getTeams APIと同じロジックでデータ取得
console.log("\n=== getTeams APIと同じロジックでの取得 ===\n");
const apiTeams = db
  .prepare(
    `
  SELECT 
    t.id,
    t.name,
    t.description,
    t.custom_url as customUrl,
    tm.role,
    t.created_at as createdAt,
    t.updated_at as updatedAt
  FROM teams t
  INNER JOIN team_members tm ON t.id = tm.team_id
  WHERE tm.user_id = ?
  ORDER BY t.created_at
`,
  )
  .all(userId);

console.log("API経由で取得されるはずのチーム:");
apiTeams.forEach((team) => {
  console.log(
    `- ID: ${team.id}, 名前: ${team.name}, URL: ${team.customUrl}, ロール: ${team.role}`,
  );
});

db.close();
