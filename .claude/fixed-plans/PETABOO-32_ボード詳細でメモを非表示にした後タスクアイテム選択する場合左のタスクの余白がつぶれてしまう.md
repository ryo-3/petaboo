# PETABOO-32: ボード詳細でメモを非表示にした後タスクアイテム選択する場合　左のタスクの余白がつぶれてしまう

> ⚠️ Codexに実装依頼する際は、以下を厳守すること：

- **既存ファイルを丸ごと再生成させないこと**
  → Codexへの依頼は必ず **差分（patch形式）** で行う
- **日本語コメント・文字列を扱う場合はUTF-8前提で依頼すること**
  → 文字化け防止のため明記する
- **Codexに git add / git commit を実行させないこと**
- **完了した場合ファイルを`.claude/fixed-plans` に移動する**

---

## 目的

ボード詳細画面で「メモを非表示」にした状態でタスクアイテムを選択した際、左側の一覧パネル（タスク一覧）の左端の余白（padding）が消えてしまう問題を修正する。

## 問題の原因

### 現状の動作

1. `board-detail-screen.tsx` で、アイテム選択時の一覧パネルには `BoardTaskSection` が表示される
2. `BoardTaskSection` は `showMemo` prop に応じて左パディングを制御している:
   ```tsx
   // board-task-section.tsx:227-230
   <div className={`flex flex-col flex-1 min-h-0 relative ${
     showMemo ? "pl-4" : ""
   }`}>
   ```
3. 選択モードで `showMemo=false` が渡されると、左パディングが適用されない
4. しかし、選択モードでは一覧パネルが画面左端に位置するため、パディングが必要

### 問題の発生条件

- メモを非表示にする（コントロールパネルでメモボタンをOFF）
- その後タスクアイテムを選択する
- 一覧パネル（タスク一覧）が左端に表示される際、左余白がない

## 変更範囲

### 対象ファイル

- `apps/web/components/screens/board-detail-screen.tsx`

### 変更内容

選択モードで `BoardTaskSection` に渡す `showMemo` prop を、実際のメモ表示状態ではなく、一覧パネルが画面左端にあるかどうかで判定するように修正。

## 実装手順

### Step 1: board-detail-screen.tsx の修正

**修正箇所:** 選択モード時の `BoardTaskSection` への `showMemo` prop

**現状（1212-1218行目付近）:**

```tsx
) : selectedTask ? (
  <BoardTaskSection
    boardId={boardId}
    initialBoardId={boardId}
    rightPanelMode={rightPanelMode}
    showMemo={showMemo}
    showTask={showTask}
```

**修正後:**

```tsx
) : selectedTask ? (
  <BoardTaskSection
    boardId={boardId}
    initialBoardId={boardId}
    rightPanelMode={rightPanelMode}
    showMemo={false}  // 選択モードでは常にfalse（一覧パネルが左端なのでpl-4適用のため）
    showTask={showTask}
```

### Step 2: BoardTaskSection の条件修正

**修正箇所:** `apps/web/components/features/board/board-task-section.tsx`

**現状（227-230行目）:**

```tsx
<div className={`flex flex-col flex-1 min-h-0 relative ${
  showMemo ? "pl-4" : ""
}`}>
```

**修正後:**

```tsx
<div className={`flex flex-col flex-1 min-h-0 relative ${
  showMemo ? "pl-4" : "pl-4"  // 常にpl-4を適用（左端の余白を確保）
}`}>
```

※ これだと `showMemo` の意味がなくなるため、より適切な修正は:

**代替案:** `board-detail-screen.tsx` 側で、選択モードの一覧パネルに常に `pl-4` を適用する

**修正箇所:** `board-detail-screen.tsx` 1126行目付近

**現状:**

```tsx
<ResizablePanel
  id="selected-list"
  order={listOrder}
  defaultSize={sizes.list}
  minSize={25}
  maxSize={75}
  className="rounded-lg bg-white flex flex-col min-h-0 border-r border-gray-200"
>
```

**修正後:**

```tsx
<ResizablePanel
  id="selected-list"
  order={listOrder}
  defaultSize={sizes.list}
  minSize={25}
  maxSize={75}
  className="rounded-lg bg-white flex flex-col min-h-0 border-r border-gray-200 pl-4"
>
```

## 影響範囲・懸念点

- メモ選択時の一覧パネル（メモ一覧）にも同じ修正が適用される
- `BoardMemoSection` にも同様の問題がある可能性があるため、両方を確認する必要がある

## Codex用ToDoリスト

1. [ ] `apps/web/components/screens/board-detail-screen.tsx` の1126行目付近、選択モードの一覧パネル `ResizablePanel` に `pl-4` クラスを追加
2. [ ] 修正後、以下のケースを確認:
   - メモ非表示 → タスク選択 → 左余白が正しく表示されること
   - メモ表示 → タスク選択 → 左余白が二重にならないこと
   - タスク非表示 → メモ選択 → 左余白が正しく表示されること
3. [ ] 型チェック: `npm run check:wsl`
