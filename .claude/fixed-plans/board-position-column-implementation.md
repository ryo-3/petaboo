# ボードアイテムにposition カラム追加実装Plan

> ⚠️ Codexに実装依頼する際は、以下を厳守すること：
>
> - **既存ファイルを丸ごと再生成させないこと** → Codexへの依頼は必ず **差分（patch形式）** で行う
> - **日本語コメント・文字列を扱う場合はUTF-8前提で依頼すること** → 文字化け防止のため明記する
> - **Codexに git add / git commit を実行させないこと**
> - **完了した場合ファイルを`.claude/fixed-plans` に移動する**

## 🎯 目的

ボードのURL連番を安定させるため、`team_board_items` テーブルに `position` カラムを追加する。

### 現状の問題点

- 現在は `createdAt` で並び順を決定し、動的に `boardIndex` を生成
- アイテム削除時に後続の番号が変動する
- ドラッグ&ドロップでの並び替えができない

### 期待される成果

- ボードごとに安定した順序番号（position）
- アイテム削除してもURLが変わらない
- 将来のドラッグ&ドロップ実装の基盤

## 📋 変更範囲

### 1. DBスキーマ変更

**ファイル**: `apps/api/src/db/schema/team/boards.ts`

```typescript
export const teamBoardItems = sqliteTable("team_board_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  boardId: integer("board_id")
    .notNull()
    .references(() => teamBoards.id, { onDelete: "cascade" }),
  itemType: text("item_type").notNull(), // 'memo' | 'task'
  displayId: text("display_id").notNull(),
  position: integer("position").notNull(), // ← 追加
  deletedAt: integer("deleted_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});
```

### 2. マイグレーションファイル生成

```bash
pnpm --filter @petaboo/api run db:generate
```

生成されるSQL（想定）:

```sql
ALTER TABLE team_board_items ADD COLUMN position INTEGER NOT NULL DEFAULT 0;
```

### 3. 既存データの position 値設定

マイグレーション後に実行するSQL（手動またはAPIで実行）:

```sql
-- 各ボード内でitemTypeごとにcreatedAt順で連番を振る
WITH ranked_items AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY board_id, item_type
      ORDER BY created_at
    ) as new_position
  FROM team_board_items
)
UPDATE team_board_items
SET position = (
  SELECT new_position
  FROM ranked_items
  WHERE ranked_items.id = team_board_items.id
);
```

**実行方法**:

```bash
npx wrangler d1 execute DB --local --command "上記SQL"
```

### 4. API修正（ボードアイテム取得）

**ファイル**: `apps/api/src/routes/teams/boards.ts`

**変更箇所**: `getTeamBoardItems` 関数（660行目付近）

#### Before:

```typescript
const items = await db
  .select()
  .from(teamBoardItems)
  .where(eq(teamBoardItems.boardId, parseInt(boardId)))
  .orderBy(teamBoardItems.createdAt); // ← createdAtでソート

// 動的にboardIndexを生成（807-816行目）
let memoIndex = 1;
let taskIndex = 1;
formattedItems.forEach((item) => {
  if (item.itemType === "memo" && item.content) {
    item.content.boardIndex = memoIndex++;
  } else if (item.itemType === "task" && item.content) {
    item.content.boardIndex = taskIndex++;
  }
});
```

#### After:

```typescript
const items = await db
  .select()
  .from(teamBoardItems)
  .where(eq(teamBoardItems.boardId, parseInt(boardId)))
  .orderBy(teamBoardItems.position); // ← positionでソート

// boardIndexはpositionをそのまま使用
// 動的生成コード（807-816行目）は削除
formattedItems.forEach((item) => {
  if (item.content) {
    item.content.boardIndex = item.team_board_items.position;
  }
});
```

### 5. API修正（アイテム追加時にposition自動設定）

**ファイル**: `apps/api/src/routes/teams/boards.ts`

**変更箇所**: `addTeamBoardItem` 関数（1235行目付近）

#### 追加ロジック:

```typescript
// 既存の最大position取得
const maxPositionResult = await db
  .select({ maxPos: sql<number>`MAX(position)` })
  .from(teamBoardItems)
  .where(
    and(
      eq(teamBoardItems.boardId, parseInt(boardId)),
      eq(teamBoardItems.itemType, itemType),
    ),
  );

const nextPosition = (maxPositionResult[0]?.maxPos || 0) + 1;

// アイテム追加
const result = await db
  .insert(teamBoardItems)
  .values({
    boardId: parseInt(boardId),
    itemType: itemType,
    displayId: displayId,
    position: nextPosition, // ← 追加
  })
  .returning();
```

### 6. 個人用ボードも同様に対応

**ファイル**: `apps/api/src/db/schema/boards.ts`

```typescript
export const boardItems = sqliteTable("board_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  boardId: integer("board_id")
    .notNull()
    .references(() => boards.id, { onDelete: "cascade" }),
  itemType: text("item_type").notNull(),
  itemId: integer("item_id").notNull(),
  position: integer("position").notNull(), // ← 追加
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }),
});
```

**対応APIファイル**: `apps/api/src/routes/boards.ts`

- 同様の修正を適用

## 📝 実装手順

1. **スキーマ変更**
   - `apps/api/src/db/schema/team/boards.ts` に `position` カラム追加
   - `apps/api/src/db/schema/boards.ts` に `position` カラム追加

2. **マイグレーション生成**

   ```bash
   pnpm --filter @petaboo/api run db:generate
   ```

3. **マイグレーション適用**

   ```bash
   pnpm --filter @petaboo/api run db:migration:local
   ```

4. **既存データの position 初期化**

   ```bash
   npx wrangler d1 execute DB --local --command "上記SQL"
   ```

5. **API修正（チーム用）**
   - `apps/api/src/routes/teams/boards.ts` の `getTeamBoardItems` を修正
   - `apps/api/src/routes/teams/boards.ts` の `addTeamBoardItem` を修正

6. **API修正（個人用）**
   - `apps/api/src/routes/boards.ts` の同様の関数を修正

7. **動作確認**
   - ボードアイテムの取得・追加・削除をテスト
   - URLの連番が安定していることを確認

## ⚠️ 注意事項

- 既存の `boardIndex` 動的生成コード（807-816行目）は削除すること
- `position` は itemTypeごとに独立して管理すること（メモとタスクは別カウント）
- 削除時に `position` の詰め直しは**不要**（隙間があってもOK）

## 🎯 Codex用ToDoリスト

- [ ] スキーマファイル修正（team/boards.ts, boards.ts）
- [ ] マイグレーション生成・適用
- [ ] 既存データの position 初期化SQL実行
- [ ] チーム用APIの修正（getTeamBoardItems, addTeamBoardItem）
- [ ] 個人用APIの修正（getBoardItems, addBoardItem）
- [ ] 動的boardIndex生成コード削除
- [ ] 動作確認（URLの安定性テスト）
