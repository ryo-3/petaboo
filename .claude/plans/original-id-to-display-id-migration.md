# チーム側originalID完全撤廃 → displayId一本化 実装プラン

**作成日**: 2025-01-22
**ステータス**: 計画中
**優先度**: 高（技術的負債の早期解消）

---

## 🎯 目的

- チーム機能のみoriginalIdを完全撤廃
- displayId（"MORICREW-1"形式）に一本化
- 個人側（memos/tasks）は変更なし（originalId継続）
- 今のうちに技術的負債を解消

---

## ⚠️ Codex実装依頼時の厳守事項

> **以下を必ず守ること：**
>
> - 既存ファイルを丸ごと再生成させないこと（差分で依頼）
> - 日本語コメント・文字列はUTF-8前提で依頼
> - Codexにgit操作させないこと
> - 完了したら`.claude/fixed-plans`に移動

---

## Phase 0: 本番データバックアップ（30分）

### 目的

本番データの完全保存（保険＋ローカルテスト用）

### 手順

```bash
# バックアップディレクトリ作成
mkdir -p backups/$(date +%Y%m%d)

# 全データをSQLダンプ
npx wrangler d1 export DB --remote --output backups/$(date +%Y%m%d)/production-full.sql

# 主要テーブルをJSON形式でも保存
npx wrangler d1 execute DB --remote --command "SELECT * FROM teams" --json > backups/$(date +%Y%m%d)/teams.json
npx wrangler d1 execute DB --remote --command "SELECT * FROM team_tasks" --json > backups/$(date +%Y%m%d)/tasks.json
npx wrangler d1 execute DB --remote --command "SELECT * FROM team_memos" --json > backups/$(date +%Y%m%d)/memos.json
npx wrangler d1 execute DB --remote --command "SELECT * FROM team_board_items" --json > backups/$(date +%Y%m%d)/board_items.json
npx wrangler d1 execute DB --remote --command "SELECT * FROM team_deleted_tasks" --json > backups/$(date +%Y%m%d)/deleted_tasks.json
npx wrangler d1 execute DB --remote --command "SELECT * FROM team_deleted_memos" --json > backups/$(date +%Y%m%d)/deleted_memos.json
npx wrangler d1 execute DB --remote --command "SELECT * FROM team_notifications" --json > backups/$(date +%Y%m%d)/notifications.json
npx wrangler d1 execute DB --remote --command "SELECT * FROM team_taggings" --json > backups/$(date +%Y%m%d)/taggings.json

# 確認
ls -lh backups/$(date +%Y%m%d)/
```

### ローカルDBにインポート

```bash
# ローカルDBを本番データで置き換え
npx wrangler d1 execute DB --local --file backups/$(date +%Y%m%d)/production-full.sql

# 確認
npx wrangler d1 execute DB --local --command "SELECT COUNT(*) as count FROM team_tasks"
npx wrangler d1 execute DB --local --command "SELECT COUNT(*) as count FROM team_memos"
```

---

## Phase 1: スキーマ変更（1日）

### 1.1 マイグレーションファイル作成

**ファイル: `apps/api/drizzle/XXXX_replace_original_id_with_display_id.sql`**

```sql
-- チーム側テーブルのみ変更（個人側はスルー）

-- team_tasks
ALTER TABLE team_tasks ADD COLUMN display_id TEXT;
UPDATE team_tasks SET display_id = original_id; -- 一時的に値をコピー

-- team_memos
ALTER TABLE team_memos ADD COLUMN display_id TEXT;
UPDATE team_memos SET display_id = original_id;

-- team_deleted_tasks
ALTER TABLE team_deleted_tasks ADD COLUMN display_id TEXT;
UPDATE team_deleted_tasks SET display_id = original_id;

-- team_deleted_memos
ALTER TABLE team_deleted_memos ADD COLUMN display_id TEXT;
UPDATE team_deleted_memos SET display_id = original_id;

-- team_board_items
ALTER TABLE team_board_items ADD COLUMN display_id TEXT;
UPDATE team_board_items SET display_id = original_id;

-- team_notifications
ALTER TABLE team_notifications ADD COLUMN target_display_id TEXT;
UPDATE team_notifications SET target_display_id = target_original_id;

-- team_taggings
ALTER TABLE team_taggings ADD COLUMN target_display_id TEXT;
UPDATE team_taggings SET target_display_id = target_original_id;

-- インデックス追加（パフォーマンス対策）
CREATE INDEX idx_team_tasks_display_id ON team_tasks(team_id, display_id);
CREATE INDEX idx_team_memos_display_id ON team_memos(team_id, display_id);
CREATE INDEX idx_team_board_items_display_id ON team_board_items(display_id);

-- ⚠️ original_idカラムの削除は後で行う（Phase 6）
```

### 1.2 スキーマ定義更新

**対象ファイル:**

- `apps/api/src/db/schema/team/tasks.ts`
- `apps/api/src/db/schema/team/memos.ts`
- `apps/api/src/db/schema/team/boards.ts`
- `apps/api/src/db/schema/team/notifications.ts`
- `apps/api/src/db/schema/team/tags.ts`

**変更例（team/tasks.ts）:**

```typescript
export const teamTasks = sqliteTable("team_tasks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  teamId: integer("team_id").notNull(),
  userId: text("user_id").notNull(),

  // ❌ 削除: originalId: text("original_id").notNull(),
  displayId: text("display_id").notNull(), // 🆕 追加

  uuid: text("uuid"),
  title: text("title").notNull(),
  // ... 他のフィールド
});

// 削除済みテーブルも同様
export const teamDeletedTasks = sqliteTable("team_deleted_tasks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  displayId: text("display_id").notNull(), // 🆕
  // ...
});
```

**変更例（team/boards.ts）:**

```typescript
export const teamBoardItems = sqliteTable("team_board_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  boardId: integer("board_id").notNull(),
  itemType: text("item_type").notNull(),
  displayId: text("display_id").notNull(), // 🆕 original_id → display_id
  deletedAt: integer("deleted_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});
```

### 1.3 マイグレーション実行

```bash
# ローカルで実行
npm run db:generate
npx wrangler d1 execute DB --local --file apps/api/drizzle/XXXX_replace_original_id_with_display_id.sql

# 確認
npx wrangler d1 execute DB --local --command "PRAGMA table_info(team_tasks)"
```

---

## Phase 2: displayId生成ロジック実装（半日）

### 2.1 生成関数の作成

**ファイル: `apps/api/src/utils/displayId.ts`（新規作成）**

```typescript
import { db } from "../db";
import { teams } from "../db/schema/team/teams";
import { teamTasks, teamMemos } from "../db/schema/team";
import { eq, desc, sql } from "drizzle-orm";

/**
 * チームタスク用のdisplayIdを生成
 * @param db データベース接続
 * @param teamId チームID
 * @returns displayId（例: "MORICREW-1"）
 */
export async function generateTaskDisplayId(
  db: D1Database,
  teamId: number,
): Promise<string> {
  // 1. チームのcustomUrlを取得
  const team = await db
    .select({ customUrl: teams.customUrl })
    .from(teams)
    .where(eq(teams.id, teamId))
    .get();

  if (!team) {
    throw new Error(`Team not found: ${teamId}`);
  }

  const teamSlug = team.customUrl.toUpperCase(); // "MORICREW"

  // 2. チーム全体の最大シーケンス番号を取得（タスクとメモ共通）
  const [maxTask] = await db
    .select({
      max: sql<number>`MAX(CAST(SUBSTR(display_id, LENGTH('${teamSlug}-') + 1) AS INTEGER))`,
    })
    .from(teamTasks)
    .where(eq(teamTasks.teamId, teamId));

  const [maxMemo] = await db
    .select({
      max: sql<number>`MAX(CAST(SUBSTR(display_id, LENGTH('${teamSlug}-') + 1) AS INTEGER))`,
    })
    .from(teamMemos)
    .where(eq(teamMemos.teamId, teamId));

  const maxSeq = Math.max(maxTask?.max || 0, maxMemo?.max || 0);
  const nextSeq = maxSeq + 1;

  return `${teamSlug}-${nextSeq}`;
}

/**
 * チームメモ用のdisplayIdを生成
 */
export async function generateMemoDisplayId(
  db: D1Database,
  teamId: number,
): Promise<string> {
  // タスクと同じロジック（共通連番）
  return generateTaskDisplayId(db, teamId);
}

/**
 * displayIdをパース
 */
export function parseDisplayId(displayId: string): {
  teamSlug: string;
  sequence: number;
} | null {
  const match = displayId.match(/^([A-Z0-9_-]+)-(\d+)$/);
  if (!match) return null;

  return {
    teamSlug: match[1].toLowerCase(),
    sequence: parseInt(match[2], 10),
  };
}
```

### 2.2 originalId関数の削除

**ファイル: `apps/api/src/utils/originalId.ts`**

- `generateOriginalId()` 関数は個人側で使用中のため**削除しない**
- チーム側で使っている箇所のみ削除

---

## Phase 3: API実装修正（2日）

### 3.1 タスク作成API修正

**ファイル: `apps/api/src/routes/teams/tasks.ts`**

**変更箇所1: タスク作成（L300付近）**

```typescript
// Before（2段階挿入）
const result = await db
  .insert(teamTasks)
  .values({
    teamId,
    userId: auth.userId,
    originalId: "", // ❌ 削除
    uuid: generateUuid(),
    // ...
  })
  .returning({ id: teamTasks.id });

const originalId = generateOriginalId(result[0].id); // ❌ 削除
await db
  .update(teamTasks)
  .set({ originalId })
  .where(eq(teamTasks.id, result[0].id));

// After（1回の挿入）
const displayId = await generateTaskDisplayId(db, teamId); // 🆕 事前生成

const result = await db
  .insert(teamTasks)
  .values({
    teamId,
    userId: auth.userId,
    displayId, // 🆕
    uuid: generateUuid(),
    // ...
  })
  .returning();

return c.json(result[0], 201);
```

**変更箇所2: タスク削除（L580付近）**

```typescript
// Before
await db.insert(teamDeletedTasks).values({
  originalId: task.originalId, // ❌
  // ...
});

// After
await db.insert(teamDeletedTasks).values({
  displayId: task.displayId, // 🆕
  // ...
});
```

**変更箇所3: タスク復元（L810付近）**

```typescript
// Before
app.post("/:teamId/tasks/restore/:originalId", async (c) => {
  const { originalId } = c.req.param(); // ❌

  const deletedTask = await db.select()
    .from(teamDeletedTasks)
    .where(eq(teamDeletedTasks.originalId, originalId)) // ❌
    .get();

// After
app.post("/:teamId/tasks/restore/:displayId", async (c) => {
  const { displayId } = c.req.param(); // 🆕

  const deletedTask = await db.select()
    .from(teamDeletedTasks)
    .where(eq(teamDeletedTasks.displayId, displayId)) // 🆕
    .get();
```

### 3.2 メモAPI修正

**ファイル: `apps/api/src/routes/teams/memos.ts`**

- タスクと同様の修正を適用
- `generateMemoDisplayId()` を使用

### 3.3 ボードAPI修正

**ファイル: `apps/api/src/routes/teams/boards.ts`**

**変更箇所: board_itemsのJOIN（L685付近）**

```typescript
// Before
.leftJoin(teamMemos, eq(teamBoardItems.originalId, teamMemos.originalId))
.leftJoin(teamTasks, eq(teamBoardItems.originalId, teamTasks.originalId))

// After
.leftJoin(teamMemos, eq(teamBoardItems.displayId, teamMemos.displayId))
.leftJoin(teamTasks, eq(teamBoardItems.displayId, teamTasks.displayId))
```

**変更箇所: アイテム追加（L1304付近）**

```typescript
// Before
const result = await db.insert(teamBoardItems).values({
  boardId: parseInt(boardId),
  itemType: itemType,
  originalId: originalId, // ❌
});

// After
const result = await db.insert(teamBoardItems).values({
  boardId: parseInt(boardId),
  itemType: itemType,
  displayId: displayId, // 🆕 APIパラメータ名も変更
});
```

### 3.4 通知API修正

**ファイル: `apps/api/src/routes/teams/notifications.ts`**

```typescript
// Before
targetOriginalId: notification.targetOriginalId, // ❌

// After
targetDisplayId: notification.targetDisplayId, // 🆕
```

### 3.5 OpenAPI定義修正

**ファイル: `apps/api/src/routes/teams/tasks.ts`（OpenAPI部分）**

```typescript
// APIパラメータ定義
const restoreTaskRoute = createRoute({
  method: "post",
  path: "/{teamId}/tasks/restore/{displayId}", // 🆕 originalId → displayId
  request: {
    params: z.object({
      teamId: z.string(),
      displayId: z.string(), // 🆕
    }),
  },
  // ...
});
```

---

## Phase 4: フロントエンド修正（2日）

### 4.1 型定義修正

**ファイル: `apps/web/src/types/common.ts`**

```typescript
// OriginalId型は個人側で使用中のため削除しない
export type OriginalId = string;

// 🆕 DisplayId型を追加
export type DisplayId = string;

export const DisplayIdUtils = {
  parse(displayId: string): { teamSlug: string; sequence: number } | null {
    const match = displayId.match(/^([A-Z0-9_-]+)-(\d+)$/);
    if (!match) return null;
    return {
      teamSlug: match[1].toLowerCase(),
      sequence: parseInt(match[2], 10),
    };
  },

  isValid(displayId: string): boolean {
    return /^[A-Z0-9_-]+-\d+$/.test(displayId);
  },
};
```

**ファイル: `apps/web/src/types/task.ts`**

```typescript
// チーム側のTask型
export interface TeamTask {
  id: number;
  displayId: string; // 🆕 originalId → displayId
  uuid?: string;
  title: string;
  // ...
}

// 個人側のTask型（変更なし）
export interface Task {
  id: number;
  originalId: string; // そのまま
  title: string;
  // ...
}
```

### 4.2 API Client修正

**ファイル: `apps/web/src/lib/api-client.ts`**

```typescript
// Before
restoreTeamTask: async (teamId: number, originalId: string, token?: string) => {
  const url = `${API_BASE_URL}/teams/${teamId}/tasks/restore/${originalId}`; // ❌

// After
restoreTeamTask: async (teamId: number, displayId: string, token?: string) => {
  const url = `${API_BASE_URL}/teams/${teamId}/tasks/restore/${displayId}`; // 🆕
```

### 4.3 URL生成修正

**ファイル: `apps/web/src/utils/urlUtils.ts`**

```typescript
// Before
export function generateTeamTaskUrl(params: {
  teamName: string;
  task: { originalId: string }; // ❌
}): string {
  return `/team/${teamName}?tab=tasks&task=${task.originalId}`;

// After
export function generateTeamTaskUrl(params: {
  teamName: string;
  task: { displayId: string }; // 🆕
}): string {
  return `/team/${teamName}?tab=tasks&task=${task.displayId}`;
}
```

### 4.4 コンポーネント修正

**主要な修正ファイル:**

1. `apps/web/components/features/team/team-detail.tsx`
2. `apps/web/components/features/team/team-board-detail-wrapper.tsx`
3. `apps/web/src/hooks/use-simple-memo-save.ts`
4. `apps/web/src/hooks/use-simple-item-save.ts`
5. `apps/web/src/hooks/use-unified-item-operations.ts`
6. `apps/web/src/utils/boardDeleteUtils.ts`

**修正内容:**

- `originalId` → `displayId` に全て置換
- `getItemOriginalId()` → `getItemDisplayId()` に関数名変更

### 4.5 URL解析修正（互換性対応）

**ファイル: `apps/web/components/features/team/team-detail.tsx`**

```typescript
// 新旧URL両対応（移行期間のみ）
useEffect(() => {
  const taskParam = searchParams.get("task");
  if (!taskParam || !tasks) return;

  let foundTask: TeamTask | null = null;

  // displayId形式で検索（"MORICREW-1"）
  foundTask = tasks.find((t) => t.displayId === taskParam) || null;

  // 見つからなければ旧形式（数値のみ）でも検索（互換性）
  if (!foundTask && /^\d+$/.test(taskParam)) {
    // 一時的に暫定データ（display_id = original_id）から検索
    foundTask = tasks.find((t) => t.displayId === taskParam) || null;
  }

  if (foundTask) {
    setSelectedTask(foundTask);
  }
}, [searchParams, tasks]);
```

---

## Phase 5: 既存データの連番付与（半日）

### 目的

既存データに正しいdisplayId（"MORICREW-1"形式）を付与

### バックフィルスクリプト作成

**ファイル: `apps/api/scripts/backfill-display-ids.ts`（新規作成）**

```typescript
import { db } from "../src/db";
import { teams, teamTasks, teamMemos } from "../src/db/schema/team";
import { eq, asc } from "drizzle-orm";

async function backfillDisplayIds() {
  console.log("🚀 displayId バックフィル開始");

  const allTeams = await db.select().from(teams);

  for (const team of allTeams) {
    console.log(`\n📂 チーム: ${team.name} (${team.customUrl})`);
    const teamSlug = team.customUrl.toUpperCase();

    // タスクとメモを作成日時順に取得（混在）
    const tasks = await db
      .select()
      .from(teamTasks)
      .where(eq(teamTasks.teamId, team.id))
      .orderBy(asc(teamTasks.createdAt));

    const memos = await db
      .select()
      .from(teamMemos)
      .where(eq(teamMemos.teamId, team.id))
      .orderBy(asc(teamMemos.createdAt));

    // 全アイテムを時系列で統合
    const allItems = [
      ...tasks.map((t) => ({ ...t, type: "task" as const })),
      ...memos.map((m) => ({ ...m, type: "memo" as const })),
    ].sort((a, b) => a.createdAt - b.createdAt);

    // 連番を付与
    for (let i = 0; i < allItems.length; i++) {
      const item = allItems[i];
      const newDisplayId = `${teamSlug}-${i + 1}`;

      if (item.type === "task") {
        await db
          .update(teamTasks)
          .set({ displayId: newDisplayId })
          .where(eq(teamTasks.id, item.id));
        console.log(
          `  ✅ タスク #${item.id}: ${item.displayId} → ${newDisplayId}`,
        );
      } else {
        await db
          .update(teamMemos)
          .set({ displayId: newDisplayId })
          .where(eq(teamMemos.id, item.id));
        console.log(
          `  ✅ メモ #${item.id}: ${item.displayId} → ${newDisplayId}`,
        );
      }
    }

    console.log(`✨ ${team.name}: ${allItems.length}件 完了`);
  }

  console.log("\n🎉 バックフィル完了！");
}

backfillDisplayIds().catch(console.error);
```

### 実行

```bash
# ローカルで実行
cd apps/api
tsx scripts/backfill-display-ids.ts

# 確認
npx wrangler d1 execute DB --local --command "SELECT id, display_id, title FROM team_tasks ORDER BY id LIMIT 10"
```

---

## Phase 6: original_idカラム削除（半日）

### 6.1 マイグレーション作成

**ファイル: `apps/api/drizzle/XXXX_drop_original_id_columns.sql`**

```sql
-- チーム側のみ削除（個人側は保持）

-- インデックス削除（もしあれば）
DROP INDEX IF EXISTS idx_team_tasks_original_id;
DROP INDEX IF EXISTS idx_team_memos_original_id;

-- カラム削除
ALTER TABLE team_tasks DROP COLUMN original_id;
ALTER TABLE team_memos DROP COLUMN original_id;
ALTER TABLE team_deleted_tasks DROP COLUMN original_id;
ALTER TABLE team_deleted_memos DROP COLUMN original_id;
ALTER TABLE team_board_items DROP COLUMN original_id;
ALTER TABLE team_notifications DROP COLUMN target_original_id;
ALTER TABLE team_taggings DROP COLUMN target_original_id;
```

### 6.2 実行

```bash
# ローカルで実行
npx wrangler d1 execute DB --local --file apps/api/drizzle/XXXX_drop_original_id_columns.sql

# 確認
npx wrangler d1 execute DB --local --command "PRAGMA table_info(team_tasks)"
```

---

## 動作確認チェックリスト

### ローカル環境で全て確認

- [ ] タスク作成で displayId が "MORICREW-1" 形式で生成される
- [ ] メモ作成で displayId が "MORICREW-2" 形式で生成される（連番継続）
- [ ] タスク削除が正常動作
- [ ] タスク復元が正常動作（displayIdで復元）
- [ ] メモ削除・復元も同様
- [ ] ボードにタスク追加が正常動作
- [ ] ボード詳細でタスク表示が正常
- [ ] URL共有が displayId で機能
- [ ] 通知が正常動作
- [ ] タグ付けが正常動作
- [ ] 検索で displayId でも見つかる
- [ ] 既存データがすべて正しい displayId を持つ
- [ ] original_id カラムが存在しない
- [ ] 個人側（memos/tasks）は影響なし

---

## 本番適用手順

### ステップ1: 最終バックアップ

```bash
# 本番データバックアップ（最終版）
npx wrangler d1 export DB --remote --output backups/final-before-migration-$(date +%Y%m%d-%H%M%S).sql
```

### ステップ2: メンテナンス通知

ユーザーに事前通知（30分程度のメンテナンス）

### ステップ3: マイグレーション実行

```bash
# Phase 1のマイグレーション
npx wrangler d1 execute DB --remote --file apps/api/drizzle/XXXX_replace_original_id_with_display_id.sql

# 確認
npx wrangler d1 execute DB --remote --command "SELECT id, display_id FROM team_tasks LIMIT 5"
```

### ステップ4: コードデプロイ

```bash
# API デプロイ
cd apps/api
npm run deploy

# Web デプロイ
cd apps/web
npm run build
# （デプロイ方法に応じて）
```

### ステップ5: バックフィルスクリプト実行

```bash
# 本番DBで実行（要注意！）
cd apps/api
tsx scripts/backfill-display-ids.ts --remote

# 確認
npx wrangler d1 execute DB --remote --command "SELECT id, display_id, title FROM team_tasks LIMIT 10"
```

### ステップ6: 動作確認

- タスク作成
- メモ作成
- 削除・復元
- URL共有

### ステップ7: original_id削除（最終段階）

```bash
# 数日間運用して問題なければ実行
npx wrangler d1 execute DB --remote --file apps/api/drizzle/XXXX_drop_original_id_columns.sql
```

---

## ロールバック手順

### Phase 1-4の途中で問題発生

```bash
# バックアップからリストア
npx wrangler d1 execute DB --remote --file backups/final-before-migration-*.sql

# 旧バージョンにコードを戻す
git revert <commit-hash>
```

### Phase 6（カラム削除）後

**不可能**（カラム削除は不可逆）
→ Phase 5まで十分にテストしてから実行すること

---

## 工数見積もり

| Phase    | 内容                           | 工数    |
| -------- | ------------------------------ | ------- |
| Phase 0  | バックアップ＋ローカル取り込み | 0.5日   |
| Phase 1  | スキーマ変更                   | 1日     |
| Phase 2  | displayId生成ロジック          | 0.5日   |
| Phase 3  | API修正（68箇所）              | 2日     |
| Phase 4  | フロントエンド修正             | 2日     |
| Phase 5  | 既存データ連番付与             | 0.5日   |
| Phase 6  | original_id削除                | 0.5日   |
| **合計** |                                | **7日** |

---

## リスクと対策

| リスク               | 影響度 | 対策                                       |
| -------------------- | ------ | ------------------------------------------ |
| マイグレーション失敗 | 高     | ローカルで事前テスト、バックアップ複数取得 |
| displayId重複        | 中     | UNIQUE制約、バックフィルスクリプトで検証   |
| URL互換性問題        | 低     | 暫定的にフォールバック処理                 |
| パフォーマンス低下   | 低     | インデックス追加                           |
| 個人側への影響       | 低     | コードレビューで確認                       |

---

## 次のステップ

1. このプランをレビュー
2. 承認後、Phase 0から実装開始
3. 各Phaseごとに動作確認
4. 問題なければ本番適用

---

**最終更新**: 2025-01-22
