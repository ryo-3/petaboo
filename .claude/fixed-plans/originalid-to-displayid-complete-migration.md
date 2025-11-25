# originalId完全廃止 → displayId一本化 実装プラン

**作成日**: 2025-11-23
**ステータス**: 調査完了、実装待ち
**優先度**: 高（技術的負債の解消）

---

## 🎯 目的

- **個人用メモ/タスク**でも `originalId` を廃止
- すべて `displayId` に統一（個人・チーム共通）
- Phase 4.5 で個人用DBに `displayId` カラム追加済み
- 347箇所の `originalId` 使用箇所を `displayId` に置き換え

---

## 📊 調査結果サマリー

### originalId使用箇所（合計347箇所）

#### 1. 型定義 (49箇所)

- `apps/web/src/types/api.ts`: 29箇所
- `apps/web/src/types/common.ts`: 20箇所（OriginalIdUtils含む）

#### 2. フック (67箇所)

- `use-unified-item-operations.ts`: 18箇所
- `use-deleted-task-actions.ts`: 17箇所
- `use-tasks.ts`: 16箇所
- `use-memos.ts`: 12箇所
- `use-bulk-delete-operations.tsx`: 11箇所
- `use-unified-restoration.ts`: 8箇所

#### 3. コンポーネント (125箇所)

- `board-detail-screen-3panel.tsx`: 18箇所
- `task-editor.tsx`: 15箇所
- `memo-status-display.tsx`: 15箇所
- `team-board-detail-wrapper.tsx`: 12箇所
- `task-status-display.tsx`: 12箇所
- その他多数

#### 4. ユーティリティ (15箇所)

- `boardDeleteUtils.ts`: 15箇所

#### 5. APIクライアント (12箇所)

- `api-client.ts`: 12箇所

#### 6. OriginalIdUtils使用 (98箇所)

- `OriginalIdUtils.fromItem()`
- `OriginalIdUtils.from()`
- `OriginalIdUtils.toNumber()`

---

## 🚨 重要な制約

### APIエンドポイント（個人用）

現在、個人用の削除済みアイテムAPIは `originalId` を使用：

```typescript
// 個人用メモ
DELETE /memos/deleted/:originalId        // 完全削除
POST /memos/deleted/:originalId/restore  // 復元

// 個人用タスク
DELETE /tasks/deleted/:originalId        // 完全削除
POST /tasks/deleted/:originalId/restore  // 復元
```

**Phase 4.5 で既に `displayId` カラムは追加済み**なので、これらを `displayId` に変更可能。

---

## 📋 実装プラン

### Phase 1: API層の修正（個人用）

#### 1.1 個人用メモAPI修正

**ファイル: `apps/api/src/routes/memos/route.ts`**

```typescript
// Before: originalId
app.delete("/deleted/:originalId", ...)
app.post("/deleted/:originalId/restore", ...)

// After: displayId
app.delete("/deleted/:displayId", ...)
app.post("/deleted/:displayId/restore", ...)
```

**修正箇所:**

- L535: `DELETE /deleted/:originalId` → `DELETE /deleted/:displayId`
- L586: `POST /deleted/:originalId/restore` → `POST /deleted/:displayId/restore`

#### 1.2 個人用タスクAPI修正

**ファイル: `apps/api/src/routes/tasks/route.ts`**

同様に `originalId` → `displayId` に変更。

---

### Phase 2: フロントエンド型定義の修正

#### 2.1 BaseItemFieldsから originalId を削除

**ファイル: `apps/web/src/types/common.ts`**

```typescript
// Before
export interface BaseItemFields {
  id: number;
  originalId?: OriginalId; // ❌ 削除
  displayId: string;
  // ...
}

// After
export interface BaseItemFields {
  id: number;
  displayId: string; // ✅ これだけ
  // ...
}
```

#### 2.2 OriginalIdUtils を削除

**ファイル: `apps/web/src/types/common.ts`**

```typescript
// ❌ 完全削除
export const OriginalIdUtils = { ... }
```

使用箇所（98箇所）すべてを `displayId` に置き換え。

#### 2.3 削除済みアイテム型の修正

**ファイル: `apps/web/src/types/memo.ts`, `task.ts`**

```typescript
// Before
export interface DeletedMemo {
  originalId: OriginalId; // ❌ 削除
  displayId: string;
  // ...
}

// After
export interface DeletedMemo {
  displayId: string; // ✅ これだけ
  // ...
}
```

---

### Phase 3: APIクライアントの修正

**ファイル: `apps/web/src/lib/api-client.ts`**

```typescript
// Before
permanentDeleteNote: async (originalId: string, token?: string) => {
  await fetch(`${API_BASE_URL}/memos/deleted/${originalId}`, ...)
}

// After
permanentDeleteNote: async (displayId: string, token?: string) => {
  await fetch(`${API_BASE_URL}/memos/deleted/${displayId}`, ...)
}
```

**修正対象:**

- `permanentDeleteNote(originalId)` → `permanentDeleteNote(displayId)`
- `restoreNote(originalId)` → `restoreNote(displayId)`
- `permanentDeleteTask(originalId)` → `permanentDeleteTask(displayId)`
- `restoreTask(originalId)` → `restoreTask(displayId)`

---

### Phase 4: フック層の修正（自動置換可）

#### 4.1 一括置換対象ファイル

以下のファイルで `originalId` → `displayId` に機械的に置換：

1. **use-unified-item-operations.ts** (18箇所)
   - `originalId` パラメータ → `displayId`
   - `item.originalId` → `item.displayId`

2. **use-deleted-task-actions.ts** (17箇所)
3. **use-deleted-memo-actions.ts** (7箇所)
4. **use-tasks.ts** (16箇所)
5. **use-memos.ts** (12箇所)
6. **use-bulk-delete-operations.tsx** (11箇所)
7. **use-unified-restoration.ts** (8箇所)

#### 4.2 置換パターン

```bash
# 変数名
originalId → displayId

# 関数パラメータ
(originalId: string) → (displayId: string)

# オブジェクトプロパティ
item.originalId → item.displayId
deletedItem.originalId → deletedItem.displayId

# OriginalIdUtils削除
OriginalIdUtils.fromItem(item) → item.displayId
OriginalIdUtils.from(id) → id.toString()
OriginalIdUtils.toNumber(originalId) → parseInt(displayId, 10)
```

---

### Phase 5: コンポーネント層の修正（自動置換可）

#### 5.1 主要コンポーネント

1. **board-detail-screen-3panel.tsx** (18箇所)
2. **task-editor.tsx** (15箇所)
3. **memo-editor.tsx** (7箇所)
4. **memo-status-display.tsx** (15箇所)
5. **task-status-display.tsx** (12箇所)
6. **team-board-detail-wrapper.tsx** (12箇所)
7. **board-right-panel.tsx** (9箇所)

すべて同じパターンで置換可能。

---

### Phase 6: ユーティリティ修正

**ファイル: `apps/web/src/utils/boardDeleteUtils.ts`**

15箇所の `originalId` → `displayId` 置換。

---

## 🔧 実装手順

### ステップ1: API修正（慎重に）

```bash
# 個人用メモAPI
apps/api/src/routes/memos/route.ts
# L535, L586 の originalId → displayId

# 個人用タスクAPI
apps/api/src/routes/tasks/route.ts
# 同様に修正
```

### ステップ2: フロント型定義修正

```bash
# BaseItemFields修正
apps/web/src/types/common.ts

# 削除済みアイテム型修正
apps/web/src/types/memo.ts
apps/web/src/types/task.ts
```

### ステップ3: 一括置換スクリプト実行

```bash
# OriginalIdUtils.fromItem(xxx) → xxx.displayId
find apps/web -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i 's/OriginalIdUtils\.fromItem(\([^)]*\))/\1.displayId/g' {} +

# originalId → displayId (変数名)
find apps/web -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i 's/\boriginalId\b/displayId/g' {} +
```

⚠️ **注意**: 一括置換後に手動レビュー必須

### ステップ4: 型チェック＆エラー修正

```bash
npm run check:wsl
```

### ステップ5: 動作確認

- 個人メモ作成・削除・復元
- 個人タスク作成・削除・復元
- チームメモ・タスク（既存動作）
- 画像添付機能

---

## 🚨 リスク管理

### 高リスク

| リスク               | 対策                                          |
| -------------------- | --------------------------------------------- |
| 既存データとの不整合 | Phase 4.5 で displayId 追加済み、後方互換あり |
| API破壊的変更        | エンドポイントURLが変わるため慎重に           |
| 一括置換ミス         | 型チェック＋手動レビュー                      |

### 中リスク

| リスク                    | 対策                 |
| ------------------------- | -------------------- |
| OriginalIdUtils削除の影響 | 98箇所すべて置換確認 |
| コメント内の originalId   | 検索して手動修正     |

---

## 📝 チェックリスト

### API修正

- [ ] 個人用メモAPI: DELETE, POST エンドポイント修正
- [ ] 個人用タスクAPI: DELETE, POST エンドポイント修正
- [ ] OpenAPI定義更新（api.ts自動生成）

### フロント型定義

- [ ] BaseItemFields から originalId 削除
- [ ] DeletedMemo, DeletedTask から originalId 削除
- [ ] OriginalIdUtils 完全削除

### フロント実装

- [ ] api-client.ts 修正
- [ ] 全フック修正（67箇所）
- [ ] 全コンポーネント修正（125箇所）
- [ ] ユーティリティ修正（15箇所）

### 検証

- [ ] 型チェック成功
- [ ] 個人メモ: 作成・削除・復元
- [ ] 個人タスク: 作成・削除・復元
- [ ] チーム機能: 既存動作確認
- [ ] 画像添付: 個人・チーム両方

---

## 💡 次のステップ

1. このプランをレビュー
2. 承認後、Phase 1 から慎重に実装
3. 各Phase完了後に動作確認
4. 問題なければコミット

---

**最終更新**: 2025-11-23
