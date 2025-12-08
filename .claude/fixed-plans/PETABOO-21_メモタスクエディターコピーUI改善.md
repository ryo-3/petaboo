# PETABOO-21: メモ・タスクエディター内コピーUI改善

> ⚠️ Codexに実装依頼する際は、以下を厳守すること：

- **既存ファイルを丸ごと再生成させないこと**
  → Codexへの依頼は必ず **差分（patch形式）** で行う
- **日本語コメント・文字列を扱う場合はUTF-8前提で依頼すること**
  → 文字化け防止のため明記する
- **Codexに git add / git commit を実行させないこと**
- **完了した場合ファイルを`.claude/fixed-plans` に移動する**

---

## 目的

1. コピーボタンをクリックした際、ツールチップが非表示にならず「コピーしました！」に変化するようにする
2. 個人ページでもテキストコピー・URLコピーボタンを表示する

## 現状の問題

1. **Tooltipのクリック時非表示問題**
   - `tooltip.tsx` の `handleClick` で `setIsHovered(false)` を呼び出している
   - コピーボタンクリック時にツールチップが消えてしまい、コピーできたか分かりにくい

2. **個人ページにコピーボタンがない**
   - `task-editor.tsx` (1374-1383行): `shareUrl && ...` の条件で `shareUrl` が `teamMode` の時のみ生成される
   - `memo-editor.tsx` (1332-1340行): 同様に `shareUrl && ...` の条件で `teamMode` の時のみ生成される

## 変更範囲

### 1. ShareUrlButton コンポーネントの改善

**ファイル**: `apps/web/components/ui/buttons/share-url-button.tsx`

- Tooltipの`text`プロパティにコピー状態を直接渡しているため、これは問題なし
- 問題はTooltipコンポーネント側のクリック時非表示

### 2. Tooltipコンポーネントの改善

**ファイル**: `apps/web/components/ui/base/tooltip.tsx`

- `onClick`で`setIsHovered(false)`を呼ばないようにする
- または、`preventCloseOnClick`のようなpropsを追加する
- 推奨: コピーボタン等のインタラクティブな要素では、クリック後もツールチップを表示し続けたい場合がある

### 3. TaskEditor: 個人モードでもShareUrlButtonを表示

**ファイル**: `apps/web/components/features/task/task-editor.tsx`

- 1047-1052行の `shareUrl` 計算ロジックを変更
- チームモードでなくても現在のURLを返すようにする

### 4. MemoEditor: 個人モードでもShareUrlButtonを表示

**ファイル**: `apps/web/components/features/memo/memo-editor.tsx`

- 611-617行の `shareUrl` 計算ロジックを変更
- チームモードでなくても現在のURLを返すようにする

## 実装手順

### Step 1: Tooltipコンポーネントの改善

`tooltip.tsx` の `handleClick` を削除または無効化する

**差分:**

```diff
- // クリック時にツールチップを非表示にする
- const handleClick = () => {
-   setIsHovered(false);
- };

...

  return (
    <div
      ref={wrapperRef}
      className={`relative inline-block ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
-     onClick={handleClick}
    >
```

### Step 2: TaskEditorのshareUrl計算を変更

`task-editor.tsx` の shareUrl 計算ロジックを変更

**差分:**

```diff
  // チーム機能でのURL共有用
  const shareUrl = useMemo(() => {
-   if (!teamMode || !task || task.id === 0) return null;
+   if (!task || task.id === 0) return null;

    // 現在のURLをそのまま返す
    return window.location.href;
- }, [teamMode, task]);
+ }, [task]);
```

### Step 3: MemoEditorのshareUrl計算を変更

`memo-editor.tsx` の shareUrl 計算ロジックを変更

**差分:**

```diff
  // チーム機能でのURL共有用
  const shareUrl = useMemo(() => {
-   if (!teamMode || !memo || memo.id === 0) return null;
+   if (!memo || memo.id === 0) return null;

    // 現在のURLをそのまま返す
    return window.location.href;
- }, [teamMode, memo]);
+ }, [memo]);
```

## 影響範囲・懸念点

- Tooltipのクリック時非表示を削除すると、他の箇所で影響が出る可能性がある
  - 確認した結果、クリック後もツールチップが表示され続けるが、マウスを離せば消えるので問題なし
- 個人ページでのShareUrlButtonは既存のコンポーネントをそのまま使用するため、UI変更は最小限

## テスト確認項目

1. チームページでテキストコピーボタンをクリック → ツールチップが「コピーしました！」に変化し、非表示にならない
2. チームページでURLコピーボタンをクリック → 同上
3. 個人ページでメモエディターを開く → テキストコピー・URLコピーボタンが表示される
4. 個人ページでタスクエディターを開く → テキストコピー・URLコピーボタンが表示される
5. 他のTooltip使用箇所で動作に問題がないか確認

## Codex用ToDoリスト

- [ ] `apps/web/components/ui/base/tooltip.tsx` の `handleClick` と `onClick={handleClick}` を削除
- [ ] `apps/web/components/features/task/task-editor.tsx` の `shareUrl` の `teamMode` 条件を削除
- [ ] `apps/web/components/features/memo/memo-editor.tsx` の `shareUrl` の `teamMode` 条件を削除
