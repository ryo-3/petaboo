# Context化計画書 #01: アイテム選択状態の統合（ItemSelectionContext）

## 📋 実施日・ステータス

- 作成日: 2025-01-07
- 最終更新: 2025-01-07
- ステータス: 計画中
- 優先度: 🔴 最高（Props削減効果が大きい）

---

## ⚠️ Codex実装時の厳守事項

- **既存ファイルを丸ごと再生成させないこと**
  → Codexへの依頼は必ず **差分（patch形式）** で行う
- **日本語コメント・文字列を扱う場合はUTF-8前提で依頼すること**
  → 文字化け防止のため明記する
- **Codexに git add / git commit を実行させないこと**

---

## 🎯 目的と背景

### この計画が解決する問題

**「チェックボックスで複数選択して一括操作する機能」の状態管理が統一されていない問題を解決する**

### 具体的な機能とは？

ユーザーがメモやタスクを複数選択して一括操作する機能：

1. **チェックモードに切り替え**
   - 「選択モード」ボタンをクリック → チェックボックスが表示される

2. **複数アイテムを選択**
   - メモ/タスクのチェックボックスをクリックして選択

3. **一括操作を実行**
   - 選択したアイテムを一括削除
   - 選択したアイテムをボードに追加
   - 選択したアイテムにタグを一括付与

この **選択状態（どのアイテムが選択されているか）** を管理するのが今回の対象です。

### 現状の問題点

#### 1. **状態管理方法が画面ごとにバラバラ**

**ボード詳細画面（board-detail-screen.tsx）**:

```typescript
<MultiSelectionProvider>  {/* ← Context で管理 ✅ */}
  <ボードの内容>
</MultiSelectionProvider>
```

**メモ一覧画面（memo-screen.tsx）**:

```typescript
// ❌ ローカル state で管理（Context 使ってない）
const [selectionMode, setSelectionMode] = useState("select");
const [checkedMemos, setCheckedMemos] = useState(new Set());
const [checkedDeletedMemos, setCheckedDeletedMemos] = useState(new Set());

// これらを DesktopUpper, DesktopLower, BulkActionButtons などに
// propsで渡している → 大量のprops drilling
```

**タスク一覧画面（task-screen.tsx）**:

```typescript
// ❌ 同じくローカル state で管理
const [selectionMode, setSelectionMode] = useState("select");
const [checkedTasks, setCheckedTasks] = useState(new Set());
const [checkedDeletedTasks, setCheckedDeletedTasks] = useState(new Set());
```

#### 2. **Props渡しの複雑化（Props Drilling）**

現在の各画面のProps数：

- memo-screen.tsx: **126 props**
- task-screen.tsx: **122 props**
- board-detail-screen-3panel.tsx: **129 props**

選択状態関連だけで **8-10個のprops** を複数コンポーネントに渡している：

```typescript
// これらのpropsを何層にも渡している
selectionMode;
onSelectionModeChange;
checkedMemos;
setCheckedMemos;
checkedDeletedMemos;
setCheckedDeletedMemos;
onToggleCheckMemo;
onToggleCheckDeletedMemo;
```

#### 3. **useScreenState が責任過多**

現在の [useScreenState.ts:24-27](apps/web/src/hooks/use-screen-state.ts#L24-L27) は以下を全て管理している：

- 選択状態（checkedItems, checkedDeletedItems）← 今回分離
- 画面モード（screenMode）
- アクティブタブ（activeTab）
- カラム数（columnCount）

→ 1つのフックが多すぎる責任を持っている

### 期待される成果

1. **Props削減**: 各画面で **8-15個のprops** を削減
2. **コードの一貫性**: 全画面で同じ方法（Context）で選択状態を管理
3. **保守性向上**: 選択ロジックが一箇所（Context）に集約
4. **テスタビリティ向上**: Context単体でテスト可能

---

## 🔍 既存実装のレビュー

### MultiSelectionContext の現在の実装

**ファイル**: [apps/web/src/contexts/multi-selection-context.tsx](apps/web/src/contexts/multi-selection-context.tsx)

#### 管理している状態

```typescript
// 選択モード
selectionMode: "select" | "check";

// メモの選択状態（タブ別）
checkedNormalMemos: Set<string | number>; // 通常タブ
checkedDeletedMemos: Set<string | number>; // 削除済みタブ

// タスクの選択状態（タブ別）
checkedTodoTasks: Set<string | number>; // TODOタブ
checkedInProgressTasks: Set<string | number>; // 進行中タブ
checkedCompletedTasks: Set<string | number>; // 完了タブ
checkedDeletedTasks: Set<string | number>; // 削除済みタブ
```

#### 提供しているヘルパー関数

```typescript
// タブ名を指定して選択状態を取得/設定
getCheckedMemos(tab: string): Set<string | number>
setCheckedMemos(tab: string, value: Set | Function)
getCheckedTasks(tab: string): Set<string | number>
setCheckedTasks(tab: string, value: Set | Function)

// チェックボックスのトグル処理
handleMemoSelectionToggle(memoId: string | number, activeTab: string)
handleTaskSelectionToggle(taskId: string | number, activeTab: string)

// 選択モード切り替え（select → check 時に全選択をクリア）
handleSelectionModeChange(mode: "select" | "check")
```

#### カスタムフック

```typescript
// activeTab を引数に取り、現在のタブの選択状態を返す
useMultiSelection(activeMemoTab: string, activeTaskTab: string)
```

### 実装の品質評価

#### ✅ 良い点

1. **タブごとに選択状態を分離**
   - メモ: normal/deleted
   - タスク: todo/in_progress/completed/deleted
   - タブを切り替えても選択が混ざらない（正しい設計）

2. **型安全**
   - `Set<string | number>` で管理（重複なし、高速）
   - TypeScript で厳密に型チェック

3. **ヘルパー関数が豊富**
   - `getCheckedMemos(tab)` でタブに応じた選択取得
   - `handleMemoSelectionToggle()` でトグル処理が簡単

4. **選択モード切り替え時の自動クリア**
   - checkモード → selectモード に切り替えると全選択を自動クリア
   - UX的に正しい動作

#### ⚠️ 改善すべき点

1. **名前が不適切**
   - `MultiSelectionContext` → 何の"Multi"？意味が不明確
   - **提案**: `ItemSelectionContext` に変更
     - "Item" = メモ・タスク・ボードなど全アイテム種別を包括
     - シンプルで拡張性がある

2. **useMultiSelection の引数が必須**

   ```typescript
   useMultiSelection(activeMemoTab, activeTaskTab);
   ```

   - タブを毎回引数で渡す必要がある（少し面倒）
   - ただし、これは設計上必要なので許容範囲

3. **ボード画面でしか使われていない**
   - せっかく良い実装なのに、memo/task 画面では使われていない
   - → 今回の計画で全画面に適用する

### 総合評価: **★★★★☆ (4/5点)**

既存実装は **十分に良い設計** です。リネームして全画面に適用する価値があります。

---

## 📐 設計方針

### 1. Context のリネーム

**変更前**: `MultiSelectionContext`
**変更後**: `ItemSelectionContext`

**理由**:

- "Item" = メモ・タスク・ボードなど全アイテム種別を包括的に表現
- "Multi" は曖昧（複数選択？複数種類？）
- 将来的な拡張性を考慮

**影響範囲**:

- ファイル名: `multi-selection-context.tsx` → `item-selection-context.tsx`
- Context名: `MultiSelectionContext` → `ItemSelectionContext`
- Provider名: `MultiSelectionProvider` → `ItemSelectionProvider`
- Hook名: `useMultiSelection` → `useItemSelection`

### 2. useScreenState からの選択状態分離

**現在の useScreenState が管理している状態**:

```typescript
// 【削除対象】選択状態 → ItemSelectionContext に移行
checkedItems: Set<number>;
setCheckedItems;
checkedDeletedItems: Set<number>;
setCheckedDeletedItems;

// 【残す】画面表示関連（別のContext化候補）
(screenMode, setScreenMode); // 画面モード（list/view/create）
(activeTab, setActiveTab); // アクティブタブ
(columnCount, setColumnCount); // カラム数
effectiveColumnCount; // 有効カラム数（計算値）
```

**変更後の useScreenState**:

```typescript
// 選択状態を削除
// ❌ checkedItems, setCheckedItems
// ❌ checkedDeletedItems, setCheckedDeletedItems

// これらは残す（将来的に ViewSettingsContext などに移行予定）
(screenMode, setScreenMode);
(activeTab, setActiveTab);
(columnCount, setColumnCount);
effectiveColumnCount;
```

### 3. Provider 配置戦略

**方針**: 各画面のトップレベルで Provider をラップする

```typescript
// memo-screen.tsx
function MemoScreen(props: MemoScreenProps) {
  return (
    <ItemSelectionProvider>
      <MemoScreenContent {...props} />
    </ItemSelectionProvider>
  );
}

// task-screen.tsx
function TaskScreen(props: TaskScreenProps) {
  return (
    <ItemSelectionProvider>
      <TaskScreenContent {...props} />
    </ItemSelectionProvider>
  );
}

// board-detail-screen.tsx（既に Provider あり）
function BoardDetailScreen() {
  return (
    <ItemSelectionProvider>  {/* 名前だけ変更 */}
      <ボードの内容>
    </ItemSelectionProvider>
  );
}
```

**重要**: 画面ごとに Provider を設置 = 選択状態は画面間で共有されない

- これは意図した設計（メモ画面とタスク画面で選択が混ざらない）
- 画面を閉じたら選択状態もリセットされる

---

## 📋 実装手順

### Phase 0: Context のリネーム

#### 0-1. ファイル名変更

```bash
# ファイル移動
mv apps/web/src/contexts/multi-selection-context.tsx \
   apps/web/src/contexts/item-selection-context.tsx
```

#### 0-2. Context 名の一括置換

**ファイル**: `apps/web/src/contexts/item-selection-context.tsx`

```diff
- interface MultiSelectionContextType {
+ interface ItemSelectionContextType {

- const MultiSelectionContext = createContext<MultiSelectionContextType | undefined>(undefined);
+ const ItemSelectionContext = createContext<ItemSelectionContextType | undefined>(undefined);

- export function MultiSelectionProvider({ children }: { children: ReactNode }) {
+ export function ItemSelectionProvider({ children }: { children: ReactNode }) {

-   return <MultiSelectionContext.Provider value={value}>
+   return <ItemSelectionContext.Provider value={value}>

- export function useMultiSelection(
+ export function useItemSelection(

-   const context = useContext(MultiSelectionContext);
+   const context = useContext(ItemSelectionContext);

-     throw new Error("useMultiSelection must be used within a MultiSelectionProvider");
+     throw new Error("useItemSelection must be used within an ItemSelectionProvider");
```

#### 0-3. board-detail-screen での import 更新

**ファイル**: `apps/web/components/screens/board-detail-screen.tsx`
**ファイル**: `apps/web/components/screens/board-detail-screen-3panel.tsx`

```diff
- import { MultiSelectionProvider, useMultiSelection } from "@/contexts/multi-selection-context";
+ import { ItemSelectionProvider, useItemSelection } from "@/contexts/item-selection-context";

- const { ... } = useMultiSelection(activeMemoTab, activeTaskTab);
+ const { ... } = useItemSelection(activeMemoTab, activeTaskTab);

- <MultiSelectionProvider>
+ <ItemSelectionProvider>
```

---

### Phase 1: useScreenState の選択状態削除

#### 1-1. useScreenState.ts の修正

**ファイル**: [apps/web/src/hooks/use-screen-state.ts](apps/web/src/hooks/use-screen-state.ts)

**変更内容**:

```diff
interface ScreenStateReturn<T extends string> {
  screenMode: T;
  setScreenMode: (mode: T) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  columnCount: number;
  setColumnCount: (count: number) => void;
-  // Selection state
-  checkedItems: Set<number>;
-  setCheckedItems: React.Dispatch<React.SetStateAction<Set<number>>>;
-  checkedDeletedItems: Set<number>;
-  setCheckedDeletedItems: React.Dispatch<React.SetStateAction<Set<number>>>;
  effectiveColumnCount: number;
}

export function useScreenState<T extends string>(...) {
  const [screenMode, setScreenMode] = useState<T>(initialScreenMode);
  const [activeTab, setActiveTab] = useState(config.defaultActiveTab);
  const [columnCount, setColumnCount] = useColumnCountStorage(config.type);
-  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());
-  const [checkedDeletedItems, setCheckedDeletedItems] = useState<Set<number>>(new Set());

  // ... (その他の処理)

  return {
    screenMode,
    setScreenMode,
    activeTab,
    setActiveTab,
    columnCount,
    setColumnCount,
-    checkedItems,
-    setCheckedItems,
-    checkedDeletedItems,
-    setCheckedDeletedItems,
    effectiveColumnCount,
  };
}
```

---

### Phase 2: memo-screen.tsx の移行

#### 2-1. Provider の追加とコンポーネント分割

**ファイル**: [apps/web/components/screens/memo-screen.tsx:162](apps/web/components/screens/memo-screen.tsx#L162)

**変更内容**:

```diff
+ import { ItemSelectionProvider, useItemSelection } from "@/contexts/item-selection-context";

function MemoScreen({ ... }: MemoScreenProps) {
-  const { isTeamMode: teamMode, teamId: teamIdRaw } = useTeamContext();
-  const teamId = teamIdRaw ?? undefined;
-  // ... 大量の state と処理
-
-  return (
-    <div className="h-full">
-      {/* コンテンツ */}
-    </div>
-  );
+  return (
+    <ItemSelectionProvider>
+      <MemoScreenContent {...props} />
+    </ItemSelectionProvider>
+  );
}

+ function MemoScreenContent({ ... }: MemoScreenProps) {
+   const { isTeamMode: teamMode, teamId: teamIdRaw } = useTeamContext();
+   const teamId = teamIdRaw ?? undefined;
+
+   // ItemSelectionContext から選択状態を取得
+   const {
+     selectionMode,
+     setSelectionMode,
+     checkedNormalMemos,
+     checkedDeletedMemos,
+     setCheckedMemos,
+     handleMemoSelectionToggle,
+     handleSelectionModeChange,
+   } = useItemSelection("normal", "deleted");
+
+   // ... 既存のコード（selectionMode の state 定義を削除）
+
+   return (
+     <div className="h-full">
+       {/* コンテンツ */}
+     </div>
+   );
+ }
```

#### 2-2. ローカル state の削除

**ファイル**: [apps/web/components/screens/memo-screen.tsx:196-199](apps/web/components/screens/memo-screen.tsx#L196-L199)

```diff
-  // 選択モード管理
-  const [selectionMode, setSelectionMode] = useState<"select" | "check">(
-    initialSelectionMode,
-  );
```

**理由**: Context から取得するため不要

#### 2-3. useScreenState の呼び出し修正

**ファイル**: [apps/web/components/screens/memo-screen.tsx:313-332](apps/web/components/screens/memo-screen.tsx#L313-L332)

```diff
  const {
    screenMode,
    setScreenMode: setMemoScreenMode,
    activeTab,
    setActiveTab,
    columnCount,
    setColumnCount,
-    checkedItems: checkedMemos,
-    setCheckedItems: setCheckedMemos,
-    checkedDeletedItems: checkedDeletedMemos,
-    setCheckedDeletedItems: setCheckedDeletedMemos,
    effectiveColumnCount,
  } = useScreenState(
    { type: "memo", defaultActiveTab: "normal", defaultColumnCount: 4 },
    "list" as MemoScreenMode,
    selectedMemo,
    selectedDeletedMemo,
    preferences || undefined,
  );
```

#### 2-4. 選択状態の参照を Context に変更

**影響範囲**: memo-screen.tsx 内の以下の箇所

1. **line 388-407**: useBulkDeleteButton
2. **line 398-407**: useSelectAll
3. **line 454-474**: useMemosBulkDelete
4. **line 700-742**: DesktopUpper（selectionMode, onSelectionModeChange）
5. **line 744-777**: DesktopLower（checkedMemos, onToggleCheckMemo）
6. **line 780-807**: BulkActionButtons
7. **line 810-829**: SelectionMenuButton
8. **line 832-856**: ボード追加ボタン
9. **line 1132-1150**: TagManagementModal

**変更例**:

```diff
  const { showDeleteButton } = useBulkDeleteButton({
    activeTab,
    deletedTabName: "deleted",
-    checkedItems: checkedMemos,
-    checkedDeletedItems: checkedDeletedMemos,
+    checkedItems: checkedNormalMemos,
+    checkedDeletedItems: checkedDeletedMemos,
    isDeleting: isLeftDeleting,
    isRestoring: isRestoreLidOpen,
  });
```

```diff
  <DesktopUpper
    currentMode="memo"
    activeTab={displayTab as "normal" | "deleted"}
    onTabChange={handleCustomTabChange}
    onCreateNew={handleCreateNew}
    columnCount={columnCount}
    onColumnCountChange={setColumnCount}
    rightPanelMode={memoScreenMode === "list" ? "hidden" : "view"}
    selectionMode={selectionMode}
    onSelectionModeChange={(mode) => {
-      setSelectionMode(mode);
-      if (mode === "select") {
-        setCheckedMemos(new Set());
-        setCheckedDeletedMemos(new Set());
-      }
+      handleSelectionModeChange(mode);
    }}
    // ... その他のprops
  />
```

#### 2-5. トグル処理の修正

**ファイル**: [apps/web/components/screens/memo-screen.tsx:764-767](apps/web/components/screens/memo-screen.tsx#L764-L767)

```diff
  <DesktopLower
    // ...
-    onToggleCheckMemo={createToggleHandler(checkedMemos, setCheckedMemos)}
-    onToggleCheckDeletedMemo={createToggleHandler(
-      checkedDeletedMemos,
-      setCheckedDeletedMemos,
-    )}
+    onToggleCheckMemo={(memoId) => handleMemoSelectionToggle(memoId, "normal")}
+    onToggleCheckDeletedMemo={(memoId) => handleMemoSelectionToggle(memoId, "deleted")}
    // ...
  />
```

---

### Phase 3: task-screen.tsx の移行

#### 3-1. Provider の追加とコンポーネント分割

**ファイル**: [apps/web/components/screens/task-screen.tsx:166](apps/web/components/screens/task-screen.tsx#L166)

```diff
+ import { ItemSelectionProvider, useItemSelection } from "@/contexts/item-selection-context";

function TaskScreen({ ... }: TaskScreenProps) {
-  const { isTeamMode: teamMode, teamId: teamIdRaw } = useTeamContext();
-  // ... 大量の state と処理
-
-  return (
-    <div className="h-full">
-      {/* コンテンツ */}
-    </div>
-  );
+  return (
+    <ItemSelectionProvider>
+      <TaskScreenContent {...props} />
+    </ItemSelectionProvider>
+  );
}

+ function TaskScreenContent({ ... }: TaskScreenProps) {
+   const { isTeamMode: teamMode, teamId: teamIdRaw } = useTeamContext();
+   const teamId = teamIdRaw ?? undefined;
+
+   // ItemSelectionContext から選択状態を取得
+   const {
+     selectionMode,
+     setSelectionMode,
+     checkedTodoTasks,
+     checkedInProgressTasks,
+     checkedCompletedTasks,
+     checkedDeletedTasks,
+     setCheckedTasks,
+     handleTaskSelectionToggle,
+     handleSelectionModeChange,
+   } = useItemSelection("normal", activeTab);
+
+   // ... 既存のコード
+
+   return (
+     <div className="h-full">
+       {/* コンテンツ */}
+     </div>
+   );
+ }
```

#### 3-2. ローカル state の削除

**ファイル**: [apps/web/components/screens/task-screen.tsx:254-257](apps/web/components/screens/task-screen.tsx#L254-L257)

```diff
-  // 選択モード管理
-  const [selectionMode, setSelectionMode] = useState<"select" | "check">(
-    initialSelectionMode,
-  );
```

#### 3-3. useScreenState の呼び出し修正

**ファイル**: [apps/web/components/screens/task-screen.tsx:341-360](apps/web/components/screens/task-screen.tsx#L341-L360)

```diff
  const {
    screenMode: taskScreenMode,
    setScreenMode: setTaskScreenModeInternal,
    activeTab,
    setActiveTab,
    columnCount,
    setColumnCount,
-    checkedItems: checkedTasks,
-    setCheckedItems: setCheckedTasks,
-    checkedDeletedItems: checkedDeletedTasks,
-    setCheckedDeletedItems: setCheckedDeletedTasks,
    effectiveColumnCount,
  } = useScreenState(
    { type: "task", defaultActiveTab: "todo", defaultColumnCount: 2 },
    "list" as TaskScreenMode,
    selectedTask,
    selectedDeletedTask,
    preferences || undefined,
  );
```

#### 3-4. タブ別の選択状態取得

**ファイル**: task-screen.tsx（DesktopUpper の直前）

```diff
+ // activeTab に応じて現在のタブの選択状態を取得
+ const checkedTasks = activeTab === "todo"
+   ? checkedTodoTasks
+   : activeTab === "in_progress"
+   ? checkedInProgressTasks
+   : activeTab === "completed"
+   ? checkedCompletedTasks
+   : new Set<number>();
```

#### 3-5. 選択状態の参照を Context に変更

**影響範囲**: task-screen.tsx 内の以下の箇所

1. **line 432-440**: useBulkDeleteButton
2. **line 442-454**: useSelectAll
3. **line 471-488**: useTasksBulkDelete
4. **line 490-504**: useTasksBulkRestore
5. **line 632-681**: DesktopUpper（selectionMode, onSelectionModeChange）
6. **line 683-721**: DesktopLower（checkedTasks, onToggleCheckTask）
7. **line 724-754**: BulkActionButtons
8. **line 757-776**: SelectionMenuButton
9. **line 779-801**: ボード追加ボタン
10. **line 1084-1102**: TagManagementModal

**変更例**:

```diff
  <DesktopUpper
    currentMode="task"
    activeTab={activeTabTyped}
    onTabChange={handleTabChange(tabChangeHandler)}
    onCreateNew={handleCreateNew}
    columnCount={columnCount}
    onColumnCountChange={setColumnCount}
    rightPanelMode={taskScreenMode === "list" ? "hidden" : "view"}
    selectionMode={selectionMode}
    onSelectionModeChange={(mode) => {
-      setSelectionMode(mode);
-      if (mode === "select") {
-        setCheckedTasks(new Set());
-        setCheckedDeletedTasks(new Set());
-      }
+      handleSelectionModeChange(mode);
    }}
    // ... その他のprops
  />
```

---

### Phase 4: 型チェック・動作確認

#### 4-1. 型チェック

```bash
pnpm run check:wsl
```

**期待結果**: 型エラー 0件

#### 4-2. 動作確認項目

**メモ画面**:

- [ ] チェックモードに切り替えできる
- [ ] メモを複数選択できる
- [ ] 選択したメモを一括削除できる
- [ ] 削除済みタブで選択・復元できる
- [ ] タブ切り替え時に選択がクリアされる
- [ ] ボード追加機能が動作する（ボードから呼び出された場合）
- [ ] select モードに戻すと選択が全てクリアされる

**タスク画面**:

- [ ] チェックモードに切り替えできる
- [ ] TODO/進行中/完了タブでそれぞれ個別に選択できる
- [ ] 選択したタスクを一括削除できる
- [ ] 削除済みタブで選択・復元できる
- [ ] タブ切り替え時に選択がクリアされる
- [ ] ボード追加機能が動作する（ボードから呼び出された場合）

**ボード詳細画面**:

- [ ] 既存の選択機能が正常動作する（破壊的変更がないこと確認）
- [ ] リネーム後も問題なく動作する

---

## 📊 Props削減効果の試算

### memo-screen.tsx

**削除可能な内部state**:

```typescript
// ❌ 削除（Context に移行）
const [selectionMode, setSelectionMode] = useState(...)
```

**削除可能なprops（propsインターフェースから削除）**:

```typescript
// ❌ 削除（内部で Context から取得）
initialSelectionMode?: "select" | "check"
```

**削減されるprops drilling**:

```typescript
// これらを各コンポーネントに渡す必要がなくなる
selectionMode: "select" | "check"
onSelectionModeChange: (mode: "select" | "check") => void
checkedMemos: Set<number>
setCheckedMemos: (value: Set<number>) => void
checkedDeletedMemos: Set<number>
setCheckedDeletedMemos: (value: Set<number>) => void
onToggleCheckMemo: (id: number) => void
onToggleCheckDeletedMemo: (id: number) => void
```

**削減効果**: 約 **8-15箇所** のprops渡しを削減

### task-screen.tsx

同様に約 **8-15箇所** のprops渡しを削減

### board-detail-screen.tsx

リネームのみ（props数は変わらないが、名前の一貫性向上）

### 合計削減見込み

- **Props定義**: -2個（initialSelectionMode削減 × 2画面）
- **内部state**: 選択関連のローカルstateを全て削除（約6-8個/画面）
- **Props drilling**: 約 **16-30箇所** のprops渡しを削減
- **コード行数**: 約 **50-100行** 削減

---

## ⚠️ 注意点・懸念事項

### 1. Context のスコープ（画面ごとに分離）

**仕様**: 画面ごとに Provider を設置するため、選択状態は画面間で共有されない

**これは意図した設計です**:

- ✅ メモ画面の選択状態がタスク画面に影響しない
- ✅ 画面を閉じたら選択状態もリセットされる（メモリリーク防止）
- ✅ 画面ごとに独立して選択操作できる

### 2. initialSelectionMode の扱い

**現状**: propsで受け取り、useState で管理

```typescript
interface MemoScreenProps {
  initialSelectionMode?: "select" | "check";
}
```

**変更後の選択肢**:

**A. Provider に initialMode props を追加（推奨）**:

```typescript
<ItemSelectionProvider defaultSelectionMode={initialSelectionMode || "select"}>
  <MemoScreenContent {...props} />
</ItemSelectionProvider>
```

**B. props を削除して常に "select" で開始**:

- ほとんどの場合 "select" で開始するため、初期値指定は不要かも
- 必要なら Context の `setSelectionMode()` で後から変更可能

**決定**: まず **A案** で実装し、動作確認後に不要なら **B案** に移行

### 3. タスク画面のタブ別選択状態

**注意点**: タスク画面は TODO/進行中/完了で選択状態が分離

**Context は既に対応済み**:

```typescript
checkedTodoTasks: Set<number>;
checkedInProgressTasks: Set<number>;
checkedCompletedTasks: Set<number>;
checkedDeletedTasks: Set<number>;
```

**使用方法**:

```typescript
const { checkedTodoTasks, checkedInProgressTasks, ... } = useItemSelection("normal", activeTab);

// 現在のタブの選択状態を取得
const checkedTasks = activeTab === "todo" ? checkedTodoTasks
                   : activeTab === "in_progress" ? checkedInProgressTasks
                   : activeTab === "completed" ? checkedCompletedTasks
                   : new Set();
```

### 4. board-detail 画面への影響

**確認事項**: board-detail 画面では既に Context を使用

**変更内容**:

- ✅ リネームのみ（MultiSelectionProvider → ItemSelectionProvider）
- ✅ 機能的な変更なし
- ✅ 動作に影響なし（既に実績がある実装）

**対応**:

- Phase 0 でリネームを先に実施
- board-detail 画面で動作確認
- 問題なければ memo/task 画面の移行を進める

---

## 🎯 成功基準

1. **型エラーゼロ**: `pnpm run check:wsl` がエラーなく完了
2. **動作確認完了**: 上記の動作確認項目が全てパス
3. **Props削減達成**: memo/task画面で合計 **15箇所以上** のprops削減
4. **既存機能維持**: board詳細画面の選択機能が正常動作
5. **コードの一貫性**: 全画面で ItemSelectionContext を使用
6. **命名の統一**: "MultiSelection" → "ItemSelection" に統一

---

## 🔄 ロールバック方針

万が一、問題が発生した場合のロールバック手順：

### リネームのみロールバック（Phase 0 の巻き戻し）

```bash
# ファイル名を戻す
mv apps/web/src/contexts/item-selection-context.tsx \
   apps/web/src/contexts/multi-selection-context.tsx

# git で差分を戻す
git checkout -- apps/web/src/contexts/
git checkout -- apps/web/components/screens/board-detail-screen.tsx
git checkout -- apps/web/components/screens/board-detail-screen-3panel.tsx
```

### 全体ロールバック（Phase 1-3 の巻き戻し）

```bash
# 実装前のコミットに戻す
git reset --hard <実装前のコミットハッシュ>
```

---

## 📝 備考

### 次のContext化候補

本計画完了後、以下の順で進める:

1. **ViewSettingsContext** - 表示設定（既に計画作成済み、Codexが実装中）
2. **FilterContext** - ボード・タグフィルター関連
3. **ModalContext** - モーダル状態管理
4. **ScreenStateContext** - 画面モード・タブ管理（useScreenState の残り）

### 参考資料

- **既存実装**: [apps/web/src/contexts/multi-selection-context.tsx](apps/web/src/contexts/multi-selection-context.tsx)
- **useScreenState**: [apps/web/src/hooks/use-screen-state.ts](apps/web/src/hooks/use-screen-state.ts)
- **memo-screen**: [apps/web/components/screens/memo-screen.tsx](apps/web/components/screens/memo-screen.tsx)
- **task-screen**: [apps/web/components/screens/task-screen.tsx](apps/web/components/screens/task-screen.tsx)
- **board-detail-screen**: [apps/web/components/screens/board-detail-screen.tsx](apps/web/components/screens/board-detail-screen.tsx)

### 実装時の追加確認事項

1. **useItemSelection の引数**
   - `useItemSelection(activeMemoTab, activeTaskTab)` の引数が必須
   - memo 画面では `useItemSelection("normal", "")` のように空文字でもOK
   - task 画面では `useItemSelection("", activeTab)` のように使い分け

2. **handleSelectionModeChange の動作**
   - select モードに切り替えると全選択が自動クリアされる
   - この動作が意図通りか確認

3. **パフォーマンス**
   - Context の re-render 頻度を確認
   - 必要に応じて useMemo / useCallback で最適化
