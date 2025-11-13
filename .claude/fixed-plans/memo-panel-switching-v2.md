# メモ画面パネル切り替え機能実装計画（v2）

> ⚠️ Codexに実装依頼する際は、以下を厳守すること：
>
> - **既存ファイルを丸ごと再生成させないこと** → Codexへの依頼は必ず **差分（patch形式）** で行う
> - **日本語コメント・文字列を扱う場合はUTF-8前提で依頼すること** → 文字化け防止のため明記する
> - **Codexに git add / git commit を実行させないこと**
> - **完了した場合ファイルを `.claude/fixed-plans` に移動する**

**最終更新日**: 2025-11-12

## 1. 目的

チームモードのメモ選択時に、左パネル（メモ一覧）を非表示にしても、**ヘッダーコントロールパネルが常に表示され続ける**ようにする。

### 現在の問題

- 左パネル（メモ一覧）内に `DesktopUpper` があり、その中にヘッダーコントロールパネルが含まれている
- 左パネルを非表示にすると、ヘッダーコントロールパネルも一緒に消えてしまう
- パネル切り替えボタンが使えなくなり、元に戻せなくなる

### 解決方法

ボード詳細画面と同じパターンを実装：

- **左パネル表示時**: 左パネル内の `DesktopUpper` がヘッダーコントロールパネルとして機能
- **左パネル非表示時**: 中央パネル内に `DesktopUpper` を表示し、ヘッダーコントロールパネルとして機能

## 2. 参照実装

`apps/web/components/screens/board-detail-screen-3panel.tsx`

### ボード詳細のパターン

#### 左パネル表示時（1368-1434行目）

```tsx
{
  showListPanel && (
    <ResizablePanel id="selected-list">
      <div className="flex flex-col h-full relative">
        <DesktopUpper
          currentMode="board"
          floatControls={true}
          showMemo={showListPanel}
          showTask={showDetailPanel}
          showComment={showCommentPanel}
          onMemoToggle={handleListPanelToggle}
          onTaskToggle={handleDetailPanelToggle}
          onCommentToggle={handleCommentPanelToggle}
          isSelectedMode={true}
          // ... その他のprops
        />
        {/* 一覧コンテンツ */}
      </div>
    </ResizablePanel>
  );
}
```

#### 左パネル非表示時、中央パネル内にDesktopUpperを表示（1554-1618行目）

```tsx
{
  showDetailPanel && (
    <ResizablePanel id="selected-detail">
      <div className="h-full flex flex-col min-h-0">
        {/* 一覧非表示時はDesktopUpperを表示 */}
        {!showListPanel && (
          <div>
            <DesktopUpper
              currentMode="board"
              floatControls={true}
              showMemo={showListPanel}
              showTask={showDetailPanel}
              showComment={showCommentPanel}
              onMemoToggle={handleListPanelToggle}
              onTaskToggle={handleDetailPanelToggle}
              onCommentToggle={handleCommentPanelToggle}
              isSelectedMode={true}
              // ... その他のprops（左パネルと同じ）
            />
          </div>
        )}
        {/* エディターコンテンツ */}
      </div>
    </ResizablePanel>
  );
}
```

## 3. 現在のメモ画面の構造

### 左パネル（746-886行目）

```tsx
const leftPanelContent = (
  <div className="...">
    <DesktopUpper
      currentMode="memo"
      floatControls={true}
      // ... props
    />
    <DesktopLower
    // メモ一覧
    />
  </div>
);
```

### 中央パネル（889行目以降）

```tsx
const centerPanelContent = (
  <>
    {/* 新規作成モード */}
    {memoScreenMode === "create" && <MemoEditor ... />}
    {/* 表示モード（既存メモ） */}
    {memoScreenMode === "view" && selectedMemo && <MemoEditor ... />}
    {/* 表示モード（削除済みメモ） */}
    {memoScreenMode === "view" && selectedDeletedMemo && <MemoEditor ... />}
  </>
);
```

**問題点**: 中央パネルに `DesktopUpper` がない

## 4. 実装内容

### 4-1. パネル表示状態の管理（state追加）

左パネルを非表示にできるように、パネル表示状態を管理するstateを追加。

```tsx
// チームモード & メモ選択時のみ使用
const [showListPanel, setShowListPanel] = useState<boolean>(() => {
  if (typeof window !== "undefined" && teamMode) {
    const saved = localStorage.getItem("team-memo-panel-visibility");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.showListPanel ?? true;
      } catch {
        return true;
      }
    }
  }
  return true;
});

const [showDetailPanel, setShowDetailPanel] = useState<boolean>(() => {
  // 同様
});

const [showCommentPanel, setShowCommentPanel] = useState<boolean>(() => {
  // 同様
});
```

### 4-2. localStorage保存

```tsx
useEffect(() => {
  if (teamMode && typeof window !== "undefined") {
    localStorage.setItem(
      "team-memo-panel-visibility",
      JSON.stringify({
        showListPanel,
        showDetailPanel,
        showCommentPanel,
      }),
    );
  }
}, [showListPanel, showDetailPanel, showCommentPanel, teamMode]);
```

### 4-3. トグルハンドラー

```tsx
import { validatePanelToggle } from "@/src/utils/panel-helpers";

const handleListPanelToggle = useCallback(() => {
  setShowListPanel((prev) => {
    const newValue = !prev;
    if (
      !validatePanelToggle(
        {
          left: showListPanel,
          center: showDetailPanel,
          right: showCommentPanel,
        },
        "left",
        newValue,
      )
    ) {
      return prev;
    }
    return newValue;
  });
}, [showListPanel, showDetailPanel, showCommentPanel]);

// handleDetailPanelToggle, handleCommentPanelToggle も同様
```

### 4-4. 左パネルの `DesktopUpper` にパネル切り替え機能を追加

**現在（750-770行目）**:

```tsx
<DesktopUpper
  currentMode="memo"
  activeTab={displayTab as "normal" | "deleted"}
  onTabChange={handleCustomTabChange}
  onCreateNew={handleCreateNew}
  rightPanelMode={memoScreenMode === "list" ? "hidden" : "view"}
  selectionMode={selectionMode}
  onSelectionModeChange={handleSelectionModeChange}
  onSelectAll={handleSelectAll}
  isAllSelected={isAllSelected}
  hideControls={false}
  floatControls={true}
  normalCount={memos?.length || 0}
  deletedMemosCount={deletedMemos?.length || 0}
  hideAddButton={hideHeaderButtons}
  onCsvImport={() => setIsCsvImportModalOpen(true)}
  teamMode={teamMode}
  teamId={teamId}
  marginBottom=""
  headerMarginBottom="mb-1.5"
/>
```

**修正後**:

```tsx
<DesktopUpper
  currentMode="memo"
  activeTab={displayTab as "normal" | "deleted"}
  onTabChange={handleCustomTabChange}
  onCreateNew={handleCreateNew}
  rightPanelMode={memoScreenMode === "list" ? "hidden" : "view"}
  selectionMode={selectionMode}
  onSelectionModeChange={handleSelectionModeChange}
  onSelectAll={handleSelectAll}
  isAllSelected={isAllSelected}
  hideControls={false}
  floatControls={true}
  normalCount={memos?.length || 0}
  deletedMemosCount={deletedMemos?.length || 0}
  hideAddButton={hideHeaderButtons}
  onCsvImport={() => setIsCsvImportModalOpen(true)}
  teamMode={teamMode}
  teamId={teamId}
  marginBottom=""
  headerMarginBottom="mb-1.5"
  // パネル切り替え（チームモード & メモ選択時のみ）
  isSelectedMode={teamMode && memoScreenMode !== "list"}
  showMemo={showListPanel}
  showTask={showDetailPanel}
  showComment={showCommentPanel}
  onMemoToggle={handleListPanelToggle}
  onTaskToggle={handleDetailPanelToggle}
  onCommentToggle={handleCommentPanelToggle}
  contentFilterRightPanelMode="editor"
  listTooltip="メモ一覧パネル"
  detailTooltip="メモ詳細パネル"
  selectedItemType="memo"
/>
```

### 4-5. 中央パネルに「左パネル非表示時のDesktopUpper」を追加（★最重要）

**現在（889行目以降）**:

```tsx
const centerPanelContent = (
  <>
    {/* 新規作成モード */}
    {memoScreenMode === "create" && (
      <MemoEditor ... />
    )}
    {/* 表示モード（既存メモ） */}
    {memoScreenMode === "view" && selectedMemo && (
      <MemoEditor ... />
    )}
    {/* 以下略 */}
  </>
);
```

**修正後**:

```tsx
const centerPanelContent = (
  <>
    {/* 左パネル非表示時、中央パネルにDesktopUpperを表示 */}
    {teamMode && !showListPanel && memoScreenMode !== "list" && (
      <div className="pt-2 md:pt-3 pl-2 md:pl-5 md:pr-2">
        <DesktopUpper
          currentMode="memo"
          activeTab={displayTab as "normal" | "deleted"}
          onTabChange={handleCustomTabChange}
          onCreateNew={handleCreateNew}
          rightPanelMode="view"
          selectionMode={selectionMode}
          onSelectionModeChange={handleSelectionModeChange}
          onSelectAll={handleSelectAll}
          isAllSelected={isAllSelected}
          hideControls={false}
          floatControls={true}
          normalCount={memos?.length || 0}
          deletedMemosCount={deletedMemos?.length || 0}
          hideAddButton={hideHeaderButtons}
          onCsvImport={() => setIsCsvImportModalOpen(true)}
          teamMode={teamMode}
          teamId={teamId}
          marginBottom=""
          headerMarginBottom="mb-1.5"
          // パネル切り替え
          isSelectedMode={true}
          showMemo={showListPanel}
          showTask={showDetailPanel}
          showComment={showCommentPanel}
          onMemoToggle={handleListPanelToggle}
          onTaskToggle={handleDetailPanelToggle}
          onCommentToggle={handleCommentPanelToggle}
          contentFilterRightPanelMode="editor"
          listTooltip="メモ一覧パネル"
          detailTooltip="メモ詳細パネル"
          selectedItemType="memo"
        />
      </div>
    )}
    {/* 新規作成モード */}
    {memoScreenMode === "create" && (
      <MemoEditor ... />
    )}
    {/* 以下略 */}
  </>
);
```

### 4-6. 右パネルにも「左・中央パネル非表示時のDesktopUpper」を追加

**現在（rightPanelContent）**:

```tsx
const rightPanelContent =
  teamMode && memoScreenMode !== "create" && selectedMemo ? (
    <CommentSection ... />
  ) : null;
```

**修正後**:

```tsx
const rightPanelContent =
  teamMode && memoScreenMode !== "create" && selectedMemo ? (
    <>
      {/* 左・中央パネル非表示時、右パネルにDesktopUpperを表示 */}
      {!showListPanel && !showDetailPanel && (
        <div className="pt-2 md:pt-3 pl-2 md:pl-5 md:pr-2">
          <DesktopUpper
            // 中央パネルと同じprops
          />
        </div>
      )}
      <CommentSection ... />
    </>
  ) : null;
```

### 4-7. ControlPanelLayoutにvisibility propsを渡す

```tsx
<ControlPanelLayout
  leftPanel={leftPanelContent}
  centerPanel={centerPanelContent}
  rightPanel={rightPanelContent}
  storageKey={...}
  defaultSizes={...}
  skipInitialSave={true}
  stateKey={selectedMemo?.originalId || "none"}
  visibility={
    teamMode
      ? {
          left: showListPanel,
          center: showDetailPanel,
          right: showCommentPanel,
        }
      : undefined
  }
/>
```

**注意**: `ControlPanelLayout` は既に `visibility` propsに対応済み（前回の実装で追加済み）

## 5. 実装の流れ

1. パネル表示状態のstate追加（useState × 3）
2. localStorage保存のuseEffect追加
3. トグルハンドラー追加（useCallback × 3）
4. 左パネルの `DesktopUpper` にパネル切り替えpropsを追加
5. **中央パネルに「左パネル非表示時のDesktopUpper」を追加（★最重要）**
6. 右パネルに「左・中央パネル非表示時のDesktopUpper」を追加
7. ControlPanelLayoutに `visibility` propsを渡す

## 6. テストチェックリスト

- [ ] チームモードでメモ選択時、パネル切り替えボタンが表示される
- [ ] 左パネルを非表示にできる
- [ ] **左パネル非表示時も、ヘッダーコントロールパネルが表示される**（★最重要）
- [ ] 左パネル非表示時、中央パネルのDesktopUpperが表示される
- [ ] 左・中央パネル非表示時、右パネルのDesktopUpperが表示される
- [ ] 最低1パネルは常に表示される（全非表示不可）
- [ ] パネル状態がlocalStorageに保存される
- [ ] ページリロード後も状態が復元される
- [ ] 個人モードで従来通り動作する
- [ ] リストモードで従来通り動作する

## 7. 重要な注意事項

### 前回の失敗から学んだこと

前回の実装では、以下の点が欠けていた：

- **中央パネルに「左パネル非表示時のDesktopUpper」を追加していなかった**
- そのため、左パネルを非表示にするとヘッダーコントロールパネルも消えてしまった

### ボード詳細との違い

ボード詳細では：

- 左パネル = メモ・タスク一覧
- 中央パネル = メモ・タスク詳細
- 右パネル = コメント

メモ画面では：

- 左パネル = メモ一覧
- 中央パネル = メモ詳細（エディター）
- 右パネル = コメント

構造は同じなので、同じパターンを適用できる。

## 8. 懸念点・影響範囲

### 懸念点

- DesktopUpperのpropsが多い（約20個）ため、3箇所で同じpropsを渡す必要がある
- propsの不整合があるとバグの原因になる

### 影響範囲

- memo-screen.tsx（1ファイルのみ）
- 他のファイルへの影響なし

## 9. 実装優先度

**最優先**: 4-5（中央パネルにDesktopUpperを追加）

これがないと、左パネルを非表示にしたときにヘッダーコントロールパネルが消えてしまい、機能として成立しない。
