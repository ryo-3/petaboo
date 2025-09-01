import Database from "better-sqlite3";
import fs from "fs";

// SQLiteデータベースに接続
const db = new Database("./sqlite.db");

const tables = [
  "users",
  "memos",
  "tasks",
  "boards",
  "tags",
  "categories",
  "taggings",
  "board_items",
  "board_categories",
];

let sqlCommands = [];

console.log("Generating SQL dump for D1 migration...");

for (const table of tables) {
  try {
    const rows = db.prepare(`SELECT * FROM ${table}`).all();

    if (rows.length > 0) {
      console.log(`Processing ${table}: ${rows.length} rows`);

      // Get column names
      const columns = Object.keys(rows[0]);

      for (const row of rows) {
        const values = columns.map((col) => {
          const value = row[col];
          if (value === null) return "NULL";
          if (typeof value === "string")
            return `'${value.replace(/'/g, "''")}'`;
          return value;
        });

        const sql = `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${values.join(", ")});`;
        sqlCommands.push(sql);
      }
    } else {
      console.log(`${table}: empty`);
    }
  } catch (error) {
    console.log(`${table}: not found or error - ${error.message}`);
  }
}

// SQLファイルに書き出し
const sqlContent = sqlCommands.join("\n");
fs.writeFileSync("./migration-to-d1.sql", sqlContent);

console.log(
  `\nGenerated migration-to-d1.sql with ${sqlCommands.length} commands`,
);
console.log(
  'Next: Run "wrangler d1 execute petaboo --remote --file=./migration-to-d1.sql"',
);

db.close();
