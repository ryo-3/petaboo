# PETABOO-31: targetOriginalIdカラム削除計画

> ⚠️ Codexに実装依頼する際は、以下を厳守すること：

- **既存ファイルを丸ごと再生成させないこと**
  → Codexへの依頼は必ず **差分（patch形式）** で行う
- **日本語コメント・文字列を扱う場合はUTF-8前提で依頼すること**
  → 文字化け防止のため明記する
- **Codexに git add / git commit を実行させないこと**
- **完了した場合ファイルを`.claude/fixed-plans` に移動する**

---

## 目的

`taggings` テーブルの `target_original_id` カラムを削除し、`target_display_id` に統一する。

**背景:**

- `target_original_id` は「旧フィールド（後で削除予定）」とコメントされている
- 現在は両カラムに同じ値が入っている
- フロントでは互換性のため両方をOR条件でチェックしているが、不要

## 変更範囲

### API側

| ファイル                              | 変更内容                               |
| ------------------------------------- | -------------------------------------- |
| `apps/api/src/db/schema/tags.ts`      | `targetOriginalId` フィールド削除      |
| `apps/api/src/routes/taggings/api.ts` | INSERT時の `targetOriginalId` 設定削除 |

### フロント側（型定義）

| ファイル                            | 変更内容                                 |
| ----------------------------------- | ---------------------------------------- |
| `apps/web/src/types/tag.ts`         | `Tagging` 型から `targetOriginalId` 削除 |
| `apps/web/lib/api/comments.ts`      | 型から削除（必要に応じて）               |
| `apps/web/lib/api/notifications.ts` | 型から削除（必要に応じて）               |

### フロント側（条件式簡素化）

| ファイル                                                        | 変更内容                          |
| --------------------------------------------------------------- | --------------------------------- |
| `apps/web/components/features/memo/memo-editor.tsx`             | OR条件を `targetDisplayId` のみに |
| `apps/web/components/features/memo/memo-status-display.tsx`     | OR条件を `targetDisplayId` のみに |
| `apps/web/components/features/memo/memo-tag-filter-wrapper.tsx` | OR条件を `targetDisplayId` のみに |
| `apps/web/components/features/task/task-editor.tsx`             | OR条件を `targetDisplayId` のみに |
| `apps/web/components/features/task/task-status-display.tsx`     | OR条件を `targetDisplayId` のみに |

### DB（最後に実行）

- ローカル・本番から `target_original_id` カラム削除

---

## 実装手順

### Phase 1: フロント側の条件式簡素化

**1-1. `apps/web/components/features/memo/memo-editor.tsx`**

```diff
- (tagging.targetDisplayId === memoTargetId ||
-   tagging.targetOriginalId === memoTargetId),
+ tagging.targetDisplayId === memoTargetId,
```

```diff
- (id) => t.targetOriginalId === id || t.targetDisplayId === id,
+ (id) => t.targetDisplayId === id,
```

```diff
- (t.targetOriginalId === memoId || t.targetDisplayId === memoId),
+ t.targetDisplayId === memoId,
```

**1-2. `apps/web/components/features/memo/memo-status-display.tsx`**

```diff
- tagging.targetOriginalId === id ||
- (id) => t.targetOriginalId === id || t.targetDisplayId === id,
+ (id) => t.targetDisplayId === id,
```

**1-3. `apps/web/components/features/memo/memo-tag-filter-wrapper.tsx`**

```diff
- tagging.targetOriginalId === id || tagging.targetDisplayId === id,
+ tagging.targetDisplayId === id,
```

**1-4. `apps/web/components/features/task/task-editor.tsx`**

```diff
- tagging.targetOriginalId === teamOriginalId),
+ tagging.targetDisplayId === teamOriginalId),
```

```diff
- (t.targetOriginalId === id || t.targetDisplayId === id),
+ t.targetDisplayId === id,
```

**1-5. `apps/web/components/features/task/task-status-display.tsx`**

```diff
- (id) => t.targetOriginalId === id || t.targetDisplayId === id,
+ (id) => t.targetDisplayId === id,
```

### Phase 2: フロント型定義から削除

**2-1. `apps/web/src/types/tag.ts`**

```diff
 export interface Tagging {
   id: number;
   tagId: number;
   targetType: "memo" | "task" | "board";
-  targetOriginalId: string; // 個人側で使用中（個人側Phase完了後に削除予定）
   targetDisplayId: string;
   userId: string;
   createdAt: Date;
   tag?: Tag;
 }
```

**2-2. `apps/web/lib/api/comments.ts`** - 確認して必要なら削除

**2-3. `apps/web/lib/api/notifications.ts`** - 確認して必要なら削除

### Phase 3: API側から削除

**3-1. `apps/api/src/routes/taggings/api.ts`**

```diff
     const newTagging: NewTagging = {
       tagId,
       targetType,
-      targetOriginalId: targetDisplayId, // target_original_id も設定
       targetDisplayId,
       userId: auth.userId,
       createdAt: new Date(),
     };
```

**3-2. `apps/api/src/db/schema/tags.ts`**

```diff
 export const taggings = sqliteTable("taggings", {
   id: integer("id").primaryKey({ autoIncrement: true }),
   tagId: integer("tag_id")
     .notNull()
     .references(() => tags.id, { onDelete: "cascade" }),
   targetType: text("target_type").notNull(), // 'memo' | 'task' | 'board'
-  targetOriginalId: text("target_original_id").notNull(), // 旧フィールド（後で削除予定）
-  targetDisplayId: text("target_display_id"), // 対象のdisplayId
+  targetDisplayId: text("target_display_id").notNull(), // 対象のdisplayId
   userId: text("user_id").notNull(),
   createdAt: integer("created_at", { mode: "timestamp" })
     .notNull()
     .default(sql`(unixepoch())`),
 });
```

### Phase 4: DBカラム削除

**4-1. マイグレーション作成不要（手動実行）**

```sql
-- ローカル
ALTER TABLE taggings DROP COLUMN target_original_id;

-- 本番
ALTER TABLE taggings DROP COLUMN target_original_id;
```

---

## 影響範囲・懸念点

- **個人側タグ機能**: `targetDisplayId` のみを参照するように変更
- **チーム側タグ機能**: 既に `targetDisplayId` のみ使用（影響なし）
- **既存データ**: ローカル1件、本番0件のため影響軽微

## 確認項目

- [ ] フロント型チェック通過 (`npm run check:wsl`)
- [ ] API型チェック通過 (`npm run check:api`)
- [ ] 個人側メモにタグ付け・表示できる
- [ ] 個人側タスクにタグ付け・表示できる
- [ ] タグフィルターが動作する

---

## Codex用ToDoリスト

1. [ ] Phase 1: フロント条件式から `targetOriginalId` 参照を削除
2. [ ] Phase 2: フロント型定義から `targetOriginalId` を削除
3. [ ] Phase 3: API側から `targetOriginalId` を削除
4. [ ] 型チェック実行・エラー修正
5. [ ] Phase 4: DBカラム削除（手動）
