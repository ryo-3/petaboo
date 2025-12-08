# PETABOO-71: 画像が載せられない不具合がある

> ⚠️ Codexに実装依頼する際は、以下を厳守すること：

- **既存ファイルを丸ごと再生成させないこと**
  → Codexへの依頼は必ず **差分（patch形式）** で行う
- **日本語コメント・文字列を扱う場合はUTF-8前提で依頼すること**
  → 文字化け防止のため明記する
- **Codexに git add / git commit を実行させないこと**
- **完了した場合ファイルを`.claude/fixed-plans` に移動する**

---

## 問題の概要

タイトルを入れて画像保存する際に、画像保存ができていない不具合。

## 原因分析

### 問題箇所

[memo-editor.tsx:895-908](apps/web/components/features/memo/memo-editor.tsx#L895-L908)

```typescript
} else {
  // 通常の保存処理
  await handleSave();

  // 保存後の処理用のoriginalIdを取得
  targetId =
    memo && memo.id > 0
      ? teamMode
        ? (memo?.displayId ?? memo.displayId ?? null)
        : (memo?.displayId ?? null)
      : null;
  if (!targetId && lastSavedMemoRef.current) {
    targetId = lastSavedMemoRef.current?.displayId ?? null;
  }
}
```

### 根本原因

1. **タイミングの問題**: `handleSave()` は非同期で実行され、内部で `onSaveComplete` コールバックを呼ぶが、`isSaving` フラグのリセットに `setTimeout` を使っている

2. **新規メモ作成時のフロー**:
   - `handleSave()` → `executeSave()` → メモ作成API呼び出し → `onSaveComplete(createdItem, false, true)` が呼ばれる
   - `onSaveComplete` で `lastSavedMemoRef.current = savedMemo` が設定される
   - しかし、`pendingSaveResultRef.current` への設定後、実際に `flushPendingSaveResult()` が呼ばれるタイミングが遅い

3. **問題の発生パターン**:
   - 新規メモ作成（`memo` が null または `id === 0`）
   - タイトル（content）を入力 + 画像を追加
   - 保存ボタンを押す
   - `handleSaveWithTags()` が呼ばれる
   - `hasOnlyImages` は `false`（テキストがあるため）
   - 通常保存処理 `handleSave()` が実行される
   - `handleSave()` 完了直後に `targetId` を取得しようとする
   - しかし、`memo` は null で `lastSavedMemoRef.current` もまだ設定されていない
   - 結果: `targetId = null`
   - `if (hasUploads && targetId)` の条件が `false` になり、画像がアップロードされない

### 検証ポイント

[memo-editor.tsx:967-968](apps/web/components/features/memo/memo-editor.tsx#L967-L968):

```typescript
if (hasUploads && targetId) {
  await uploadPendingImages(targetId);
```

`targetId` が `null` のため、この条件分岐に入らず画像がアップロードされない。

## 解決策

### 方法1: handleSave の戻り値を活用する（推奨）

`useSimpleItemSave` の `executeSave` 関数が作成したメモの `displayId` を返すように修正し、`handleSaveWithTags` でその戻り値を使用する。

### 方法2: onSaveComplete を同期的に待つ

`pendingSaveResultRef` が設定されるのを待つ仕組みを追加する。

### 方法3: 100ms遅延で対応（暫定策）

現在のキャッシュベースの取得ロジック（916-950行目）のように、遅延を入れて対処する。ただし、これは根本解決ではない。

---

## 実装計画（方法1を採用）

### 変更ファイル

1. **apps/web/src/hooks/use-simple-item-save.ts**
2. **apps/web/components/features/memo/memo-editor.tsx**
3. **apps/web/components/features/task/task-editor.tsx**（同様の問題があれば）

### 詳細手順

#### Step 1: use-simple-item-save.ts の修正

`executeSave` と `handleSave` 関数が作成/更新されたアイテムの `displayId` を返すように変更。

**修正箇所**:

- `executeSave` の戻り値を `Promise<string | null>` に変更
- 新規作成時: `createdItem.displayId` を返す
- 既存更新時: `item.displayId` を返す

```diff
// executeSave の戻り値の型を変更
- const executeSave = useCallback(async () => {
+ const executeSave = useCallback(async (): Promise<string | null> => {

// 新規作成成功時（680行目付近）
  onSaveComplete?.(createdItem, false, true);
+ return createdItem.displayId || null;

// 既存更新成功時（566行目付近）
  onSaveComplete?.(updatedItem, false, false);
+ return updatedItem.displayId || null;

// 空の新規アイテムの場合
  onSaveComplete?.(item || emptyItem, true, true);
+ return null;

// 関数の最後（return文がない場合）
+ return null;
```

**handleSave の修正**:

```diff
- const handleSave = useCallback(async () => {
+ const handleSave = useCallback(async (): Promise<string | null> => {

// モーダル表示時（早期リターン）
  if (boardsToRemove.length > 0) {
    setPendingBoardChanges({ boardsToAdd, boardsToRemove });
    setShowBoardChangeModal(true);
-   return;
+   return null;
  }

// 通常保存
- await executeSave();
+ return await executeSave();
```

#### Step 2: memo-editor.tsx の修正

`handleSaveWithTags` で `handleSave` の戻り値を使用する。

**修正箇所**: 895-909行目

```diff
} else {
  // 通常の保存処理
- await handleSave();
+ const savedDisplayId = await handleSave();

  // 保存後の処理用のoriginalIdを取得
- targetId =
-   memo && memo.id > 0
-     ? teamMode
-       ? (memo?.displayId ?? memo.displayId ?? null)
-       : (memo?.displayId ?? null)
-     : null;
- if (!targetId && lastSavedMemoRef.current) {
-   targetId = lastSavedMemoRef.current?.displayId ?? null;
- }
+ // 新規作成時はhandleSaveの戻り値を使用、既存更新時はmemoのdisplayIdを使用
+ targetId = savedDisplayId || memo?.displayId || null;
}
```

#### Step 3: task-editor.tsx の確認と修正

同様のパターンがあれば修正する。

---

## Codex用 ToDoリスト

### 1. use-simple-item-save.ts

- [ ] `executeSave` の戻り値の型を `Promise<string | null>` に変更
- [ ] 新規作成成功時に `createdItem.displayId` を返す
- [ ] 既存更新成功時に `updatedItem.displayId` を返す
- [ ] 空の新規アイテム時に `null` を返す
- [ ] `handleSave` の戻り値の型を `Promise<string | null>` に変更
- [ ] モーダル表示時の早期リターンで `null` を返す
- [ ] 通常保存時に `executeSave()` の戻り値を返す

### 2. memo-editor.tsx

- [ ] `handleSaveWithTags` で `handleSave()` の戻り値を受け取る
- [ ] `targetId` の取得ロジックを戻り値ベースに変更

### 3. task-editor.tsx（必要に応じて）

- [ ] 同様の修正を適用

---

## 影響範囲

- メモエディター（新規作成 + 画像添付）
- タスクエディター（同様のパターンがあれば）
- 既存のメモ更新 + 画像添付（影響なし：既に `memo.displayId` が使える）

## テスト項目

1. **新規メモ + 画像**: タイトルを入力し、画像を添付して保存 → 画像が保存されること
2. **新規メモ + 画像のみ**: 画像のみ添付して保存 → 画像が保存されること（既存の処理で対応済み）
3. **既存メモ + 画像追加**: 既存メモに画像を追加して保存 → 画像が保存されること
4. **既存メモの内容変更のみ**: 画像なしで内容を変更して保存 → 正常に保存されること
5. **チームモード**: 上記1-4をチームモードでも確認
