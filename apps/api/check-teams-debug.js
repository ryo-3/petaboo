import Database from "better-sqlite3";

const db = new Database("./sqlite.db");

// 特定ユーザーのチーム参加状況を確認
const userId = "user_2z0DUpwFMhf1Lk6prAP9MzVJZIh";

console.log("=== チーム参加状況チェック ===");
console.log("ユーザーID:", userId);
console.log("");

// 全チーム参加情報
const allTeams = db
  .prepare(
    `
  SELECT tm.*, t.name, t.custom_url 
  FROM team_members tm
  JOIN teams t ON tm.team_id = t.id
  WHERE tm.user_id = ?
`,
  )
  .all(userId);

console.log("全チーム参加情報:");
allTeams.forEach((team) => {
  console.log(
    `- チームID: ${team.team_id}, チーム名: ${team.name}, ロール: ${team.role}, URL: ${team.custom_url}`,
  );
});
console.log("");

// 管理者として参加しているチーム数
const adminCount = db
  .prepare(
    `
  SELECT COUNT(*) as count 
  FROM team_members 
  WHERE user_id = ? AND role = 'admin'
`,
  )
  .get(userId);

console.log("管理者(admin)として参加:", adminCount.count, "チーム");

// メンバーとして参加しているチーム数
const memberCount = db
  .prepare(
    `
  SELECT COUNT(*) as count 
  FROM team_members 
  WHERE user_id = ? AND role = 'member'
`,
  )
  .get(userId);

console.log("メンバー(member)として参加:", memberCount.count, "チーム");

// 全参加チーム数
const totalCount = db
  .prepare(
    `
  SELECT COUNT(*) as count 
  FROM team_members 
  WHERE user_id = ?
`,
  )
  .get(userId);

console.log("全参加チーム数:", totalCount.count, "チーム");
console.log("");

// 現在のAPIロジックで計算される値
console.log("=== APIロジックの結果（修正前） ===");
console.log("ownedTeams (管理者):", adminCount.count);
console.log("memberTeams (全体-管理者):", totalCount.count - adminCount.count);
console.log("");

console.log("=== APIロジックの結果（修正後） ===");
console.log("ownedTeams (管理者):", adminCount.count);
console.log("memberTeams (メンバー役割のみ):", memberCount.count);

db.close();
