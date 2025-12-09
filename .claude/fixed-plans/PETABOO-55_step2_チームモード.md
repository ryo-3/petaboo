# PETABOO-55 Step 2: チームモード キャッシュ統一

> ⚠️ Codexに実装依頼する際は、以下を厳守すること：
>
> - **既存ファイルを丸ごと再生成させないこと** → Codexへの依頼は必ず **差分（patch形式）** で行う
> - **日本語コメント・文字列を扱う場合はUTF-8前提で依頼すること** → 文字化け防止のため明記する
> - **Codexに git add / git commit を実行させないこと**
> - **完了した場合ファイルを`.claude/fixed-plans` に移動する**

## ステータス: 📋 計画中

## 前提

- **Step 1 完了済み**: `cache-utils.ts` は既にチームモード対応（`teamId` パラメータあり）
- 個人モードの hooks は `updateItemCache` に統一済み

---

## 目標

```
チームモードの保存処理を統一
- use-team-tasks.ts / use-team-memos.ts の invalidate を削除
- updateItemCache(teamId付き) に置換
- チームボード連携も統一
```

---

## 現状分析

### invalidateQueries の数

| ファイル                       | invalidate数 | 対象                      |
| ------------------------------ | ------------ | ------------------------- |
| use-team-tasks.ts              | 7            | team-tasks, team-taggings |
| use-team-memos.ts              | 6            | team-memos, team-taggings |
| use-unified-item-operations.ts | 9            | チームモード部分          |
| **合計**                       | **22**       |                           |

### 対象外（Step 2 ではスキップ）

| ファイル                   | 理由                       |
| -------------------------- | -------------------------- |
| use-team-taggings.ts       | タグ関連は後回し           |
| use-team-tags.ts           | タグ関連は後回し           |
| use-create-team.ts         | チーム作成は特殊（影響小） |
| use-manage-join-request.ts | メンバー管理は別系統       |
| use-board-categories.ts    | ボードカテゴリは別系統     |

---

## 修正するファイル

### 優先度順

| #   | ファイル                       | invalidate数 | 内容                        |
| --- | ------------------------------ | ------------ | --------------------------- |
| 1   | use-team-tasks.ts              | 7            | チームタスクCRUD            |
| 2   | use-team-memos.ts              | 6            | チームメモCRUD              |
| 3   | use-unified-item-operations.ts | 9            | 統一削除/復元（チーム部分） |

---

## 修正パターン

### Before（現状）

```typescript
// use-team-tasks.ts の useCreateTeamTask 例
onSuccess: (newTask) => {
  queryClient.invalidateQueries({ queryKey: ["team-tasks", teamId] });
  queryClient.invalidateQueries({ queryKey: ["team-taggings", teamId] });
};
```

### After（修正後）

```typescript
import { updateItemCache } from "@/src/lib/cache-utils";

// use-team-tasks.ts の useCreateTeamTask 例
onSuccess: (newTask) => {
  updateItemCache({
    queryClient,
    itemType: "task",
    operation: "create",
    item: newTask,
    teamId,
    boardId: newTask.boardId,
  });
};
```

---

## 具体的な修正箇所

### 1. use-team-tasks.ts

**ファイル:** `apps/web/src/hooks/use-team-tasks.ts`

| Hook              | 操作   | 現状のinvalidate          | 修正内容                 |
| ----------------- | ------ | ------------------------- | ------------------------ |
| useCreateTeamTask | create | team-tasks, team-taggings | `updateItemCache` に置換 |
| useUpdateTeamTask | update | team-tasks, team-taggings | `updateItemCache` に置換 |
| useDeleteTeamTask | delete | team-tasks, team-taggings | `updateItemCache` に置換 |

**削除対象:**

- L140: `queryClient.invalidateQueries({ queryKey: ["team-tasks", teamId] });`
- L142: `queryClient.invalidateQueries({ queryKey: ["team-taggings", teamId] });`
- L182: `queryClient.invalidateQueries({ queryKey: ["team-tasks", teamId] });`
- L184: `queryClient.invalidateQueries({ queryKey: ["team-taggings", teamId] });`
- L217: `queryClient.invalidateQueries({ queryKey: ["team-tasks", teamId] });`
- L219: `queryClient.invalidateQueries({ queryKey: ["team-taggings", teamId] });`
- （計7箇所）

### 2. use-team-memos.ts

**ファイル:** `apps/web/src/hooks/use-team-memos.ts`

| Hook              | 操作   | 現状のinvalidate          | 修正内容                 |
| ----------------- | ------ | ------------------------- | ------------------------ |
| useCreateTeamMemo | create | team-memos, team-taggings | `updateItemCache` に置換 |
| useUpdateTeamMemo | update | team-memos, team-taggings | `updateItemCache` に置換 |
| useDeleteTeamMemo | delete | team-memos                | `updateItemCache` に置換 |

**削除対象:**

- L127: `queryClient.invalidateQueries({ queryKey: ["team-memos", teamId] });`
- L129: `queryClient.invalidateQueries({ queryKey: ["team-taggings", teamId] });`
- L169: `queryClient.invalidateQueries({ queryKey: ["team-memos", teamId] });`
- L171: `queryClient.invalidateQueries({ queryKey: ["team-taggings", teamId] });`
- L204: `queryClient.invalidateQueries({ queryKey: ["team-memos", teamId] });`
- （計6箇所）

### 3. use-unified-item-operations.ts

**ファイル:** `apps/web/src/hooks/use-unified-item-operations.ts`

このファイルは個人・チーム両方を扱う。チームモード部分のみ修正。

**修正対象:**

- `teamId` が存在する条件分岐内の `invalidateQueries` を `updateItemCache(teamId付き)` に置換
- 削除/復元/完全削除の各処理

---

## team-taggings の扱い

### 現状

タスク/メモの作成・更新時に `team-taggings` も invalidate している。

### 方針

**Step 2 では team-taggings の invalidate は残す**

理由:

- タグ付け（taggings）はタスク/メモとは別テーブル
- タグ付け変更時のキャッシュ更新は複雑（紐付け追加/削除の検出が必要）
- Step 3 以降でタグ系の最適化を検討

```typescript
// Step 2 での暫定対応
onSuccess: (newTask) => {
  updateItemCache({
    queryClient,
    itemType: "task",
    operation: "create",
    item: newTask,
    teamId,
    boardId: newTask.boardId,
  });

  // タグ関連は暫定でinvalidateを残す
  queryClient.invalidateQueries({ queryKey: ["team-taggings", teamId] });
};
```

---

## 実装手順

### Phase 1: use-team-tasks.ts 修正

1. [ ] `updateItemCache` をインポート
2. [ ] useCreateTeamTask の onSuccess を修正
3. [ ] useUpdateTeamTask の onSuccess を修正
4. [ ] useDeleteTeamTask の onSuccess を修正
5. [ ] team-tasks の invalidate を削除（team-taggings は残す）
6. [ ] 型チェック通過確認

### Phase 2: use-team-memos.ts 修正

1. [ ] `updateItemCache` をインポート
2. [ ] useCreateTeamMemo の onSuccess を修正
3. [ ] useUpdateTeamMemo の onSuccess を修正
4. [ ] useDeleteTeamMemo の onSuccess を修正
5. [ ] team-memos の invalidate を削除（team-taggings は残す）
6. [ ] 型チェック通過確認

### Phase 3: use-unified-item-operations.ts 修正

1. [ ] チームモード部分の invalidate を特定
2. [ ] `updateItemCache(teamId付き)` に置換
3. [ ] 型チェック通過確認

### Phase 4: 最終確認

1. [ ] `npm run check:wsl` 通過
2. [ ] チームモードでの動作確認
   - タスク作成/更新/削除
   - メモ作成/更新/削除
   - ボード連携
3. [ ] invalidate 数を再カウント

---

## テスト項目

### チームタスク

- [ ] チームタスク作成 → 一覧に即座に表示
- [ ] チームタスク更新 → 一覧に即座に反映
- [ ] チームタスク削除 → 一覧から消える、削除済みに追加

### チームメモ

- [ ] チームメモ作成 → 一覧に即座に表示
- [ ] チームメモ更新 → 一覧に即座に反映
- [ ] チームメモ削除 → 一覧から消える、削除済みに追加

### チームボード連携

- [ ] チームボード詳細でタスク/メモ操作 → ボード内の表示が更新
- [ ] チームボード → タスク一覧遷移 → データ整合性

### 他メンバーとの同期（確認のみ）

- [ ] 他メンバーの変更が60秒後に反映される（refetchInterval）
- [ ] 自分の変更は即座に反映される

---

## 期待される効果

| 項目                              | Before              | After                        |
| --------------------------------- | ------------------- | ---------------------------- |
| invalidateQueries（チームモード） | 22箇所              | 約6箇所（team-taggingsのみ） |
| 不要なAPIコール                   | 多数                | 削減                         |
| コードの一貫性                    | 個人/チームで異なる | 統一                         |

---

## 注意事項

1. **team-taggings は残す** - Step 3 以降で対応
2. **他メンバーの変更取得は既存のまま** - refetchInterval: 60秒
3. **競合チェックは Step 3** - この Step では実装しない

---

## 次のステップ（Step 3）

Step 2 完了後、以下を検討:

1. **競合チェック（楽観的ロック）**
   - API側: updatedAt 比較ミドルウェア
   - フロント側: 409 エラー時のハンドリング

2. **team-taggings の最適化**
   - タグ付け変更を検出して個別更新

---

## 関連ファイル

- 設計方針: `.claude/開発メモ/キャッシュ設計方針.md`
- Step 1: `.claude/plans/PETABOO-55_step1_個人モード.md`
- 共通関数: `apps/web/src/lib/cache-utils.ts`
