# HeaderControlPanel Context化実装計画

> ⚠️ Codexに実装依頼する際は、以下を厳守すること：
>
> - **既存ファイルを丸ごと再生成させないこと**
>   → Codexへの依頼は必ず **差分（patch形式）** で行う
> - **日本語コメント・文字列を扱う場合はUTF-8前提で依頼すること**
>   → 文字化け防止のため明記する
> - **Codexに git add / git commit を実行させないこと**
> - **完了した場合ファイルを`.claude/fixed-plans` に移動する**

---

## 📌 目的

### 背景

- ヘッダーコントロールパネルが `position: fixed` で浮いており、長いボード名と被る問題が発生
- 現在は `DesktopUpper` から約30個のプロップスをバケツリレーで渡している
- 実際には `currentMode` でほとんどの表示内容が決まり、画面ごとの差分は少ない

### 解決方針

**Contextを使ってヘッダー内に直接配置する**

1. **HeaderControlPanelContext 作成**
   - 各画面から「モード」と「コールバック」を登録
   - Header コンポーネントで Context を読み取って表示

2. **メリット**
   - プロップスのバケツリレー解消（約30個 → 0個）
   - ヘッダー内に自然に配置できる（浮く必要がなくなる）
   - ボード名との位置競合問題を根本解決
   - コードの見通しが良くなる

3. **懸念点への対応**
   - useMultiSelectionとの違い：**表示先が常にヘッダーで統一**されている
   - 画面間の状態競合：各画面が切り替わる時に Context の値を更新するだけ
   - Portal的な使い方なので問題ない

---

## 📂 変更範囲

### 新規作成ファイル

1. **`apps/web/src/contexts/header-control-panel-context.tsx`**
   - HeaderControlPanelContext の定義
   - Provider と Hook

### 修正ファイル

2. **`apps/web/components/layout/header.tsx`**
   - HeaderControlPanel をヘッダー内に配置
   - Context から設定を取得して表示

3. **`apps/web/app/layout.tsx`**
   - HeaderControlPanelProvider を追加

4. **`apps/web/components/screens/memo-screen.tsx`**
   - Context に値を設定（useEffect）

5. **`apps/web/components/screens/task-screen.tsx`**
   - Context に値を設定（useEffect）

6. **`apps/web/components/screens/board-detail-screen-3panel.tsx`**
   - Context に値を設定（useEffect）
   - 既存の8箇所の floatControls 削除

7. **`apps/web/components/screens/board-detail-screen.tsx`**
   - Context に値を設定（useEffect）

8. **`apps/web/components/layout/desktop-upper.tsx`**
   - HeaderControlPanel の呼び出しを削除
   - プロップス定義を削除

9. **`apps/web/components/ui/controls/header-control-panel.tsx`**
   - floatControls プロップを削除
   - Context から値を取得するように変更
   - プロップスを大幅削減

---

## 🔧 実装手順

### Step 1: HeaderControlPanelContext 作成

**ファイル**: `apps/web/src/contexts/header-control-panel-context.tsx`

#### Context の型定義

```typescript
type HeaderControlPanelConfig = {
  // 基本設定
  currentMode: "memo" | "task" | "board";
  rightPanelMode: "hidden" | "view" | "create";

  // 選択モード
  selectionMode?: "select" | "check";
  onSelectionModeChange?: (mode: "select" | "check") => void;
  onSelectAll?: () => void;
  isAllSelected?: boolean;

  // ボード専用
  boardId?: number;
  onBoardSettings?: () => void;
  boardLayout?: "horizontal" | "vertical";
  isReversed?: boolean;
  onBoardLayoutChange?: (layout: "horizontal" | "vertical") => void;
  showMemo?: boolean;
  showTask?: boolean;
  showComment?: boolean;
  onMemoToggle?: (show: boolean) => void;
  onTaskToggle?: (show: boolean) => void;
  onCommentToggle?: (show: boolean) => void;
  contentFilterRightPanelMode?: "memo-list" | "task-list" | "editor" | null;

  // 選択時モード用
  isSelectedMode?: boolean;
  listTooltip?: string;
  detailTooltip?: string;
  selectedItemType?: "memo" | "task" | null;

  // CSV
  onCsvImport?: () => void;
  onBoardExport?: () => void;
  isExportDisabled?: boolean;

  // チーム
  teamMode?: boolean;
  teamId?: number;

  // タブ・カウント
  activeTab?: string;
  normalCount?: number;
  deletedMemosCount?: number;
  deletedTasksCount?: number;
  deletedCount?: number;
  todoCount?: number;
  inProgressCount?: number;
  completedCount?: number;

  // その他
  customTitle?: string;
  hideAddButton?: boolean;
  hideControls?: boolean;
};

type HeaderControlPanelContextType = {
  config: HeaderControlPanelConfig | null;
  setConfig: (config: HeaderControlPanelConfig | null) => void;
};
```

#### Provider 実装

```typescript
"use client";

import { createContext, useContext, useState, ReactNode } from "react";

const HeaderControlPanelContext = createContext<HeaderControlPanelContextType | undefined>(undefined);

export function HeaderControlPanelProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<HeaderControlPanelConfig | null>(null);

  return (
    <HeaderControlPanelContext.Provider value={{ config, setConfig }}>
      {children}
    </HeaderControlPanelContext.Provider>
  );
}

export function useHeaderControlPanel() {
  const context = useContext(HeaderControlPanelContext);
  if (context === undefined) {
    throw new Error("useHeaderControlPanel must be used within HeaderControlPanelProvider");
  }
  return context;
}
```

---

### Step 2: app/layout.tsx に Provider 追加

**ファイル**: `apps/web/app/layout.tsx`

Provider階層に追加:

```typescript
<ViewSettingsProvider userId={1}>
  <ToastProvider>
    <HeaderControlPanelProvider>  {/* ← 追加 */}
      <SelectorProvider>
        {children}
```

**位置**: ViewSettingsProvider の内側、SelectorProvider の外側

---

### Step 3: Header に HeaderControlPanel を配置

**ファイル**: `apps/web/components/layout/header.tsx`

ヘッダーの右側、通知アイコンの左に配置:

```typescript
import HeaderControlPanel from "@/components/ui/controls/header-control-panel";
import { useHeaderControlPanel } from "@/src/contexts/header-control-panel-context";

function Header() {
  const { config } = useHeaderControlPanel();

  // ... 既存コード ...

  return (
    <header className="fixed top-0 left-0 right-0 h-12 md:h-16 border-b border-gray-200 bg-white flex items-center px-3 md:pl-[14px] md:pr-8 z-10">
      <div className="flex items-center gap-2 md:gap-5 flex-1">
        {/* ロゴ・タイトル部分（既存） */}
        {/* ... */}
      </div>

      {/* ヘッダーコントロールパネル（新規追加） */}
      {config && !config.hideControls && (
        <div className="hidden md:flex items-center mr-4">
          <HeaderControlPanel />
        </div>
      )}

      {/* 通知アイコン & ユーザーメニュー（既存） */}
      <div className="flex items-center gap-2">
        {/* ... */}
      </div>
    </header>
  );
}
```

**配置位置**:

- タイトル部分（flex-1）の右側
- 通知・ユーザーボタンの左側
- `mr-4` でスペース確保

---

### Step 4: HeaderControlPanel を Context 対応に変更

**ファイル**: `apps/web/components/ui/controls/header-control-panel.tsx`

#### 変更内容

1. **プロップスを削除し、Context から取得**

```typescript
import { useHeaderControlPanel } from "@/src/contexts/header-control-panel-context";
import { useViewSettings } from "@/src/contexts/view-settings-context";

export default function HeaderControlPanel() {
  const { config } = useHeaderControlPanel();
  const { settings, updateSettings, sessionState, updateSessionState } = useViewSettings();

  // config が null の場合は何も表示しない
  if (!config) return null;

  // config から値を取得
  const {
    currentMode,
    rightPanelMode,
    selectionMode = "select",
    onSelectionModeChange,
    onSelectAll,
    isAllSelected = false,
    boardId,
    onBoardSettings,
    boardLayout = "horizontal",
    isReversed = false,
    onBoardLayoutChange,
    showMemo = true,
    showTask = true,
    showComment = true,
    onMemoToggle,
    onTaskToggle,
    onCommentToggle,
    contentFilterRightPanelMode,
    isSelectedMode = false,
    listTooltip,
    detailTooltip,
    selectedItemType = null,
    onCsvImport,
    onBoardExport,
    isExportDisabled = false,
    teamMode = false,
    teamId,
    activeTab,
    normalCount = 0,
    deletedMemosCount = 0,
    deletedTasksCount = 0,
    deletedCount = 0,
    todoCount = 0,
    inProgressCount = 0,
    completedCount = 0,
    customTitle,
    hideAddButton = false,
  } = config;

  // カラム数をContextから取得（既存のロジック）
  const columnCount =
    currentMode === "memo"
      ? settings.memoColumnCount
      : currentMode === "task"
        ? settings.taskColumnCount
        : settings.boardColumnCount;

  const onColumnCountChange = (count: number) => {
    if (currentMode === "memo") {
      updateSettings({ memoColumnCount: count });
    } else if (currentMode === "task") {
      updateSettings({ taskColumnCount: count });
    } else {
      updateSettings({ boardColumnCount: count });
    }
  };

  const sortOptions = sessionState.sortOptions;
  const onSortChange = (options: typeof sessionState.sortOptions) =>
    updateSessionState({ sortOptions: options });

  // 以下、既存のレンダリングロジック（変更なし）
  return (
    <>
      <div className="flex items-center gap-2 h-7">
        {/* 既存のコントロール群 */}
        {/* floatControls 関連のスタイルは削除 */}
      </div>

      <UnifiedFilterModal
        currentBoardId={boardId}
        topOffset={0}  {/* floatControls ? 72 : 0 → 0 に変更 */}
      />
    </>
  );
}
```

2. **削除する要素**
   - `floatControls` プロップ
   - `hideControls` プロップ（Context の config 有無で判定）
   - プロップスインターフェース全体
   - `floatControls` による position: fixed スタイル
   - `isInitialRender` state（不要に）
   - モバイル用ボード名表示（ヘッダーに移動するため）

---

### Step 5: 各画面で Context に値を設定

#### memo-screen.tsx

```typescript
import { useHeaderControlPanel } from "@/src/contexts/header-control-panel-context";
import { useEffect } from "react";

export default function MemoScreen() {
  const { setConfig } = useHeaderControlPanel();

  // ... 既存のstate・hooks ...

  // ヘッダーコントロールパネルの設定
  useEffect(() => {
    setConfig({
      currentMode: "memo",
      rightPanelMode,
      selectionMode,
      onSelectionModeChange: handleSelectionModeChange,
      onSelectAll: handleSelectAll,
      isAllSelected,
      activeTab,
      normalCount: memos?.length || 0,
      deletedMemosCount: deletedMemos?.length || 0,
      onCsvImport: handleCsvImport,
      teamMode,
      teamId,
    });

    // クリーンアップ
    return () => setConfig(null);
  }, [
    rightPanelMode,
    selectionMode,
    handleSelectionModeChange,
    handleSelectAll,
    isAllSelected,
    activeTab,
    memos?.length,
    deletedMemos?.length,
    handleCsvImport,
    teamMode,
    teamId,
    setConfig,
  ]);

  // ... 既存のレンダリング ...
  // DesktopUpper から HeaderControlPanel 関連のプロップスを削除
}
```

#### task-screen.tsx

同様の useEffect を追加:

```typescript
useEffect(
  () => {
    setConfig({
      currentMode: "task",
      rightPanelMode,
      selectionMode,
      onSelectionModeChange: handleSelectionModeChange,
      onSelectAll: handleSelectAll,
      isAllSelected,
      activeTab,
      todoCount: todoTasks?.length || 0,
      inProgressCount: inProgressTasks?.length || 0,
      completedCount: completedTasks?.length || 0,
      deletedTasksCount: deletedTasks?.length || 0,
      onCsvImport: handleCsvImport,
      teamMode,
      teamId,
    });

    return () => setConfig(null);
  },
  [
    /* 依存配列 */
  ],
);
```

#### board-detail-screen-3panel.tsx

```typescript
useEffect(
  () => {
    setConfig({
      currentMode: "board",
      rightPanelMode: centerPanelState,
      boardId,
      onBoardSettings,
      boardLayout: layout,
      isReversed: reversed,
      onBoardLayoutChange: setLayout,
      showMemo: visibleTypes.memo,
      showTask: visibleTypes.task,
      showComment: visibleTypes.comment,
      onMemoToggle: (show) =>
        setVisibleTypes((prev) => ({ ...prev, memo: show })),
      onTaskToggle: (show) =>
        setVisibleTypes((prev) => ({ ...prev, task: show })),
      onCommentToggle: (show) =>
        setVisibleTypes((prev) => ({ ...prev, comment: show })),
      onBoardExport: handleBoardExport,
      isExportDisabled: !hasItems,
      customTitle: board?.name,
      teamMode,
      teamId,
      // ... その他必要な値
    });

    return () => setConfig(null);
  },
  [
    /* 依存配列 */
  ],
);
```

**重要**: 8箇所の `floatControls={true}` を全て削除

---

### Step 6: DesktopUpper から HeaderControlPanel 削除

**ファイル**: `apps/web/components/layout/desktop-upper.tsx`

#### 削除する要素

1. **import文**

```typescript
// ❌ 削除
import HeaderControlPanel from "@/components/ui/controls/header-control-panel";
```

2. **プロップス定義（約50行）**
   - HeaderControlPanel 関連のプロップスを全て削除
   - 残すプロップス: タブ関連のみ

3. **controlsContent の削除**

```typescript
// ❌ 削除（lines 312-358）
const controlsContent = !shouldHideControls ? (
  <HeaderControlPanel
    currentMode={currentMode}
    // ... 大量のプロップス
  />
) : null;
```

4. **レンダリング部分の削除**

```typescript
// 変更前
return (
  <div className={...}>
    {!hideControls && controlsContent}  {/* ❌ 削除 */}
    {!hideTabs && headerContent}
  </div>
);

// 変更後
return (
  <div className={...}>
    {!hideTabs && headerContent}
  </div>
);
```

---

### Step 7: ヘッダーのボード名に最大幅制限を追加（オプション）

**ファイル**: `apps/web/components/layout/header.tsx`

長いボード名対策として最大幅を設定:

```typescript
<h1
  className={`text-sm md:text-xl font-bold text-gray-800 tracking-wide ${
    isMemoListPage ||
    isTaskListPage ||
    isBoardListPage ||
    isTeamMemoListPage ||
    isTeamTaskListPage ||
    isTeamBoardListPage ||
    (isTeamBoardPage && boardTitle)  // ← 追加
      ? "w-[95px] truncate"  // ← truncate追加
      : ""
  }`}
>
```

これで、コントロールパネル用のスペースを確保できます。

---

## 🧪 影響範囲

### 影響を受けるファイル

1. **新規作成（1ファイル）**
   - header-control-panel-context.tsx

2. **修正（8ファイル）**
   - app/layout.tsx
   - components/layout/header.tsx
   - components/layout/desktop-upper.tsx
   - components/ui/controls/header-control-panel.tsx
   - components/screens/memo-screen.tsx
   - components/screens/task-screen.tsx
   - components/screens/board-detail-screen.tsx
   - components/screens/board-detail-screen-3panel.tsx

### 破壊的変更

1. **表示位置の変更**
   - 浮動表示 → ヘッダー内固定表示
   - ユーザーには「より自然な配置」として見える

2. **プロップス構造の変更**
   - 大量のプロップス → Context経由
   - 内部実装の変更のみ、外部の挙動は同じ

---

## 📋 テスト確認項目

### 動作確認

1. **メモ画面**
   - [ ] コントロールパネルがヘッダー内に表示される
   - [ ] カラム数変更が動作する
   - [ ] 選択モード切り替えが動作する
   - [ ] 全選択/全解除が動作する
   - [ ] CSVインポートが動作する
   - [ ] タブ切り替え時にカウントが更新される

2. **タスク画面**
   - [ ] コントロールパネルがヘッダー内に表示される
   - [ ] カラム数変更が動作する
   - [ ] 選択モード切り替えが動作する
   - [ ] 全選択/全解除が動作する
   - [ ] CSVインポートが動作する
   - [ ] タブ切り替え時にカウントが更新される

3. **ボード詳細画面（3パネル）**
   - [ ] コントロールパネルがヘッダー内に表示される
   - [ ] カラム数変更が動作する
   - [ ] ボードレイアウト切り替えが動作する
   - [ ] コンテンツフィルター（メモ/タスク/コメント）が動作する
   - [ ] ボード設定が動作する
   - [ ] エクスポートが動作する
   - [ ] 8箇所のパネルで全て正常に動作する

4. **画面切り替え**
   - [ ] メモ → タスク → ボードの切り替えでコントロール内容が変わる
   - [ ] 各画面から離れた時にコントロールがクリアされる
   - [ ] メモリリークが発生しない

5. **レイアウト**
   - [ ] ヘッダー内の配置が自然
   - [ ] 長いボード名とコントロールが被らない
   - [ ] 通知・ユーザーボタンと適切にスペースが空いている
   - [ ] モバイル表示で正常に隠れる

6. **型エラー・Lintエラー**
   - [ ] 型エラーがない
   - [ ] Lintエラーがない
   - [ ] `npm run check:wsl` が通る

---

## 🎯 期待される成果

### 改善点

1. **コードの簡素化**
   - プロップスバケツリレー解消（約30個のプロップスが不要に）
   - DesktopUpper が約60行削減
   - 見通しの良いコード

2. **UIの改善**
   - ヘッダー内に自然に配置
   - 長いボード名との競合問題を根本解決
   - 浮動表示の不自然さ解消

3. **保守性の向上**
   - Context で一元管理
   - 各画面から必要な設定を登録するだけ
   - 新しい画面追加時も簡単

4. **パフォーマンス**
   - position: fixed の計算が不要
   - シンプルなレンダリング

---

## 📝 実装順序

1. **Context 作成**
   - header-control-panel-context.tsx 作成

2. **Provider 追加**
   - app/layout.tsx に追加

3. **HeaderControlPanel を Context 対応**
   - プロップスを削除、Context から取得

4. **Header に配置**
   - header.tsx に HeaderControlPanel 追加
   - ボード名に最大幅制限を追加

5. **各画面で Context 設定**
   - memo-screen.tsx
   - task-screen.tsx
   - board-detail-screen.tsx
   - board-detail-screen-3panel.tsx

6. **DesktopUpper をクリーンアップ**
   - HeaderControlPanel 削除
   - プロップス削除

7. **テスト**
   - 全画面で動作確認
   - 型エラー・Lintチェック

---

## 🚨 注意事項

1. **UTF-8エンディング必須**
   - すべてのファイルはUTF-8で保存
   - 日本語コメントあり

2. **差分形式で実装**
   - ファイル全体を再生成しない
   - 必要な箇所のみ変更

3. **useEffect の依存配列に注意**
   - 必要な値を全て含める
   - 無限ループを避ける
   - 関数は useCallback でメモ化推奨

4. **クリーンアップ必須**
   - 画面を離れる時に `setConfig(null)` を実行
   - メモリリーク防止

5. **段階的な実装**
   - まず1画面（memo-screen）で動作確認
   - 問題なければ他の画面に展開

---

## 📅 実装後の作業

1. **動作確認**
   - すべてのテスト項目を確認
   - 特に画面切り替え時の動作を重点的に

2. **品質チェック**

   ```bash
   npm run check:wsl
   ```

3. **構造マップの更新**
   - `.claude/構造マップ.md` に Context 追加を記載
   - 最終更新日を更新

4. **計画書の移動**
   - 完了後、このファイルを `.claude/fixed-plans/` に移動
