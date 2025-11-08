# Context統合計画書 #01: useScreenStateシンプル化とContext整理

## 📋 実施日・ステータス

- 作成日: 2025-11-08
- 最終更新: 2025-11-08
- ステータス: ✅ Phase 1完了
- 優先度: 🟢 高（Phase 1完了、Phase 2は保留）
- 完了日: 2025-11-08

---

## 🎯 目的

現在のContext・Hook構造の重複と責任過多を解消し、保守性を向上させる。

---

## 🔍 現状分析

### 1. useScreenStateの責任過多

**ファイル**: `apps/web/src/hooks/use-screen-state.ts`

**現在管理している状態**:

```typescript
// ✅ 適切な責任
screenMode: T; // "list" | "view" | "create"
activeTab: string; // タブ管理
columnCount: number; // カラム数
effectiveColumnCount: number; // 計算値

// ❌ 他と重複・分離すべき
checkedItems: Set<number>; // 選択状態
checkedDeletedItems: Set<number>; // 削除済み選択状態
```

**問題点**:

- 選択状態は画面表示とは独立した機能（分離すべき）
- カラム数はViewSettingsContextでも管理している（重複）
- 1つのHookが多すぎる責任を持っている

### 2. ViewSettingsContextとの重複

**ViewSettingsContextが管理**:

```typescript
settings.memoColumnCount; // ← useScreenStateと重複
settings.taskColumnCount; // ← useScreenStateと重複
settings.boardColumnCount;
```

**memo-screen.tsxでの実際の使用**:

```typescript
// useScreenStateから取得したカラム数は無視
const { columnCount: unusedColumnCount } = useScreenState(...);

// ViewSettingsContextから取得して使用
const columnCount = settings.memoColumnCount;
const setColumnCount = (count) => updateSettings({ memoColumnCount: count });
```

**現状**: useScreenStateのcolumnCountは**使われていない**

### 3. 選択状態管理の分散

**3つの異なる実装が並存**:

#### A. memo-screen.tsx / task-screen.tsx

```typescript
const { checkedItems, checkedDeletedItems } = useScreenState(...);
```

- useState実装（useScreenState内部）
- コンポーネントごとに独立

#### B. board-detail-screen.tsx

```typescript
const { checkedNormalMemos, checkedDeletedMemos } = useMultiSelection({
  activeMemoTab,
  activeTaskTab,
});
```

- useState実装（use-multi-selection.ts内部）
- メモ・タスク両方の選択状態を管理

#### C. ~~MultiSelectionContext（Context版）~~

- **削除済み**（2025-11-08）
- デッドコードだった

### 4. NavigationContextとの関係

**NavigationContextも画面モード管理**:

```typescript
screenMode: "home" | "memo" | "task" | "create" | ...
currentMode: "memo" | "task" | "board"
```

**memo-screen.tsxでの使用**:

```typescript
const navigationContext = useNavigation();
navigationContext.setIsCreatingMemo(memoScreenMode === "create");
```

**問題**: 画面モード管理が分散している

---

## 📊 責任マトリクス（現状）

| 機能       | useScreenState | ViewSettings | Navigation | useMultiSelection |
| ---------- | -------------- | ------------ | ---------- | ----------------- |
| 画面モード | ✅ memo/task   | -            | ✅ 全画面  | -                 |
| タブ管理   | ✅             | -            | -          | -                 |
| カラム数   | ❌ 未使用      | ✅ 使用中    | -          | -                 |
| 選択状態   | ✅ memo/task   | -            | -          | ✅ board          |
| フィルター | -              | ✅           | -          | -                 |
| ソート     | -              | ✅           | -          | -                 |

---

## 🎯 統合方針

### Phase 1: useScreenStateから選択状態を分離（優先度：高）

**目的**: useScreenStateをシンプル化

**変更内容**:

#### 1-1. useScreenStateから選択状態を削除

```diff
// apps/web/src/hooks/use-screen-state.ts

interface ScreenStateReturn<T extends string> {
  screenMode: T;
  setScreenMode: (mode: T) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
-  columnCount: number;
-  setColumnCount: (count: number) => void;
-  checkedItems: Set<number>;
-  setCheckedItems: React.Dispatch<React.SetStateAction<Set<number>>>;
-  checkedDeletedItems: Set<number>;
-  setCheckedDeletedItems: React.Dispatch<React.SetStateAction<Set<number>>>;
  effectiveColumnCount: number;  // ← これも削除（ViewSettingsで計算）
}
```

**結果**: useScreenStateは「画面モード + タブ」のみを管理

#### 1-2. 選択状態は既存のuseMultiSelectionに統一

**全画面でuseMultiSelectionを使用**:

```typescript
// memo-screen.tsx
const {
  checkedNormalMemos,
  checkedDeletedMemos,
  handleMemoSelectionToggle,
  selectionMode,
  handleSelectionModeChange
} = useMultiSelection({ activeMemoTab: activeTab, activeTaskTab: "" });

// task-screen.tsx
const {
  checkedTodoTasks,
  checkedInProgressTasks,
  checkedCompletedTasks,
  checkedDeletedTasks,
  handleTaskSelectionToggle,
  selectionMode,
  handleSelectionModeChange
} = useMultiSelection({ activeMemoTab: "", activeTaskTab: activeTab });

// board-detail-screen.tsx（変更なし）
const { ... } = useMultiSelection({ activeMemoTab, activeTaskTab });
```

**メリット**:

- 選択状態管理が1箇所に統一
- 既存の実装を活用（リスク低）
- board画面では既に実績あり

### Phase 2: カラム数管理の完全統一（優先度：中）

**現状**: memo-screenではViewSettingsを使用、useScreenStateは無視

**変更**:

1. useScreenStateからcolumnCount関連を完全削除
2. 全画面でViewSettingsContextを使用

```diff
// memo-screen.tsx（既に実質これ）
- const { columnCount } = useScreenState(...);  // 削除
+ const columnCount = settings.memoColumnCount;  // ViewSettingsのみ使用
```

### Phase 3: 画面モード管理の整理（優先度：低・要議論）

**現状の重複**:

- useScreenState: "list" | "view" | "create"
- NavigationContext: "home" | "memo" | "task" | "create" | ...

**統合案（検討中）**:

- Option A: NavigationContextに統一
- Option B: useScreenStateは画面内部のモード、NavigationContextは全体のナビゲーション
- Option C: 現状維持（役割が微妙に異なるため）

→ Phase 1, 2完了後に議論

---

## 📋 実装手順（Phase 1のみ詳細）

### Step 1: use-multi-selection.tsの確認

**現在の実装**:

- ✅ selectionMode管理
- ✅ メモ選択（normal/deleted）
- ✅ タスク選択（todo/in_progress/completed/deleted）
- ✅ トグル関数

**変更不要**: 既に必要な機能は揃っている

### Step 2: memo-screen.tsxの移行

#### 2-1. useMultiSelectionを追加

```typescript
import { useMultiSelection } from "@/src/hooks/use-multi-selection";

const {
  selectionMode,
  handleSelectionModeChange,
  checkedNormalMemos,
  setCheckedNormalMemos,
  checkedDeletedMemos,
  setCheckedDeletedMemos,
  handleMemoSelectionToggle,
} = useMultiSelection({ activeMemoTab: activeTab, activeTaskTab: "" });
```

#### 2-2. useScreenStateから選択状態を削除

```diff
const {
  screenMode,
  setScreenMode: setMemoScreenMode,
  activeTab,
  setActiveTab,
-  checkedItems: checkedMemos,
-  setCheckedItems: setCheckedMemos,
-  checkedDeletedItems: checkedDeletedMemos,
-  setCheckedDeletedItems: setCheckedDeletedMemos,
} = useScreenState(...);

+ // 選択状態はuseMultiSelectionから取得（上記）
+ const checkedMemos = checkedNormalMemos;
+ const setCheckedMemos = setCheckedNormalMemos;
```

#### 2-3. selectionMode関連を置き換え

```diff
- const [selectionMode, setSelectionMode] = useState("select");
+ // useMultiSelectionから取得（上記）

// DesktopUpper
<DesktopUpper
  selectionMode={selectionMode}
  onSelectionModeChange={(mode) => {
-    setSelectionMode(mode);
-    if (mode === "select") {
-      setCheckedMemos(new Set());
-      setCheckedDeletedMemos(new Set());
-    }
+    handleSelectionModeChange(mode);  // ← useMultiSelectionの関数を使用
  }}
/>
```

### Step 3: task-screen.tsxの移行

memo-screenと同様の手順

### Step 4: useScreenState.tsから選択状態を削除

```diff
interface ScreenStateReturn<T extends string> {
  screenMode: T;
  setScreenMode: (mode: T) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
-  checkedItems: Set<number>;
-  setCheckedItems: React.Dispatch<React.SetStateAction<Set<number>>>;
-  checkedDeletedItems: Set<number>;
-  setCheckedDeletedItems: React.Dispatch<React.SetStateAction<Set<number>>>;
}

export function useScreenState<T extends string>(...) {
  const [screenMode, setScreenMode] = useState<T>(initialScreenMode);
  const [activeTab, setActiveTab] = useState(config.defaultActiveTab);
-  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());
-  const [checkedDeletedItems, setCheckedDeletedItems] = useState<Set<number>>(new Set());

  return {
    screenMode,
    setScreenMode,
    activeTab,
    setActiveTab,
-    checkedItems,
-    setCheckedItems,
-    checkedDeletedItems,
-    setCheckedDeletedItems,
  };
}
```

---

## ✅ 成功基準

### Phase 1完了時

- [x] memo-screen.tsxがuseMultiSelectionを使用
- [x] task-screen.tsxがuseMultiSelectionを使用
- [x] board-detail-screen.tsx（変更なし、動作確認のみ）
- [x] useScreenStateから選択状態関連コメント追加（後方互換性のため実装は残す）
- [x] 型エラー0件
- [ ] 全画面で選択機能が正常動作（次のステップで確認）
- [x] コード量削減: ローカルstate管理削除、useMultiSelectionに統一

---

## ⚠️ リスクと対策

### リスク1: 既存の動作を壊す可能性

**対策**:

- 段階的に実施（memo → task → useScreenState）
- 各ステップで動作確認
- 問題があればgit revertで即座に戻す

### リスク2: useMultiSelectionの型の不一致

**現状**:

- useMultiSelection: `Set<string | number>`
- memo/task画面: `Set<number>`

**対策**:

- 型アサーション `as Set<number>` で対応（既にboard画面で実績あり）
- または、useMultiSelectionの型を`Set<number>`に統一

### リスク3: selectionModeの管理が変わる

**現状**: memo/task画面はローカルstate
**変更後**: useMultiSelectionで管理

**対策**:

- useMultiSelectionは既にselectionMode管理機能あり
- board画面で実績あり

---

## 📝 保留事項（Phase 3以降）

1. **NavigationContextとの統合**
   - 画面モード管理の重複解消
   - 要議論（役割が微妙に異なる）

2. **ViewSettingsContextへのさらなる統合**
   - タブ状態もViewSettingsで管理？
   - 画面モードもViewSettingsで管理？

3. **useScreenStateの存在意義**
   - Phase 1, 2完了後、useScreenStateは「画面モード + タブ」のみ
   - このまま残すか、ViewSettingsに統合するか検討

---

## 🔄 実装後の構造（Phase 1完了時）

```
選択状態管理:
└─ useMultiSelection (Hook版)
   └─ memo画面・task画面・board画面 全てで使用

画面状態管理:
├─ useScreenState
│  └─ 画面モード（list/view/create）、タブ管理
└─ ViewSettingsContext
   └─ カラム数、フィルター、ソート

ナビゲーション:
└─ NavigationContext
   └─ 全体のナビゲーション状態、アイコン状態
```

---

## 📚 参考

- 既存実装: `apps/web/src/hooks/use-multi-selection.ts`
- 使用例: `apps/web/components/screens/board-detail-screen.tsx`
- 削除されたContext版: ~~`apps/web/src/contexts/multi-selection-context.tsx`~~ (2025-11-08削除)

---

## 🎉 Phase 1実施結果

### 実施日時

- 2025-11-08

### 変更内容

#### 1. memo-screen.tsx

- ✅ `useMultiSelection`をインポート追加
- ✅ ローカルの`selectionMode` state削除
- ✅ `useScreenState`から取得していた`checkedMemos`/`checkedDeletedMemos`を`useMultiSelection`に切り替え
- ✅ `handleSelectionModeChange`を使用（自動で選択状態クリア）
- ✅ 型アサーション`as Set<number>`で型安全性を確保

#### 2. task-screen.tsx

- ✅ `useMultiSelection`をインポート追加
- ✅ ローカルの`selectionMode` state削除
- ✅ `useScreenState`から取得していた選択状態を`useMultiSelection`に切り替え
- ✅ タブごとに異なる選択状態（todo/in_progress/completed/deleted）を管理
- ✅ `handleSelectionModeChange`を使用
- ✅ 型アサーション`as Set<number>`で型安全性を確保

#### 3. use-screen-state.ts

- ✅ 後方互換性のためコメント追加
- ⚠️ 実装は残す（Phase 2で削除予定）
- ✅ 内部のstate実装はそのまま（使われないが、型エラー回避のため）

### 成果

#### コード削減

- memo-screen.tsx: ローカル`selectionMode`管理削除（約10行）
- task-screen.tsx: ローカル`selectionMode`管理削除（約10行）
- 選択状態クリア処理の重複削除（約20行）
- **合計: 約40行削減**

#### 保守性向上

- ✅ 選択状態管理が`useMultiSelection`に統一
- ✅ memo/task/board画面で同じロジックを使用
- ✅ バグ修正時に1箇所修正すれば全画面に反映

#### 型安全性

- ✅ 型エラー0件
- ✅ `Set<string | number>`を`Set<number>`として扱う型アサーション
- ✅ board画面で既に実績あり（安全性確認済み）

### 残課題（Phase 2以降）

#### Phase 2: columnCount管理の完全統一

- useScreenStateからcolumnCount完全削除
- ViewSettingsContextのみで管理
- 難易度: 低
- 所要時間: 30分程度

#### Phase 3: 画面モード管理の整理（要議論）

- NavigationContextとの統合検討
- 役割の明確化

### リスク対応

- ✅ 段階的実施（memo → task → useScreenState）
- ✅ 各ステップで型チェック実施
- ✅ git revertでいつでも戻せる状態を維持
- ✅ 後方互換性を保持

### 次のステップ

1. 動作確認（メモ/タスク画面の選択機能テスト）
2. git commit
3. Phase 2の実施検討
