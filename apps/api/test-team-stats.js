import Database from "better-sqlite3";

const db = new Database("./sqlite.db");
const userId = "user_2z0DUpwFMhf1Lk6prAP9MzVJZIh";

console.log("=== チーム統計のデバッグ ===\n");

// 1. ownedTeams のロジック（管理者として作成したチーム）
console.log("1. 管理者として作成したチーム（APIのownedTeamsロジック）:");
const ownedTeamsQuery = `
  SELECT COUNT(*) as count
  FROM teams t
  INNER JOIN team_members tm ON t.id = tm.team_id
  WHERE tm.user_id = ? AND tm.role = 'admin'
`;
const ownedResult = db.prepare(ownedTeamsQuery).get(userId);
console.log(`   結果: ${ownedResult.count} チーム\n`);

// 2. memberTeams のロジック（全参加チーム）
console.log("2. 参加している全チーム（APIのmemberTeamsロジック）:");
const allTeamsQuery = `
  SELECT COUNT(*) as count
  FROM team_members
  WHERE user_id = ?
`;
const allResult = db.prepare(allTeamsQuery).get(userId);
console.log(`   結果: ${allResult.count} チーム\n`);

// 3. 実際のデータを確認
console.log("3. 実際のデータ詳細:");
const detailQuery = `
  SELECT tm.*, t.name, t.custom_url
  FROM team_members tm
  LEFT JOIN teams t ON tm.team_id = t.id
  WHERE tm.user_id = ?
`;
const details = db.prepare(detailQuery).all(userId);
details.forEach((row) => {
  console.log(
    `   - チームID: ${row.team_id}, 名前: ${row.name}, URL: ${row.custom_url}, ロール: ${row.role}`,
  );
});

// 4. チームテーブルの確認
console.log("\n4. teamsテーブルの全データ:");
const allTeams = db.prepare("SELECT * FROM teams").all();
allTeams.forEach((team) => {
  console.log(
    `   - ID: ${team.id}, 名前: ${team.name}, URL: ${team.custom_url}`,
  );
});

// 5. team_membersテーブルの確認
console.log("\n5. team_membersテーブルの全データ:");
const allMembers = db.prepare("SELECT * FROM team_members").all();
allMembers.forEach((member) => {
  console.log(
    `   - チームID: ${member.team_id}, ユーザーID: ${member.user_id}, ロール: ${member.role}`,
  );
});

db.close();
