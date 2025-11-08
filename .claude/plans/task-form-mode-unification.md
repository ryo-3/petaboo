# task-form.tsx の3モード統合計画

> ⚠️ Codexに実装依頼する際は、以下を厳守すること：
>
> - **既存ファイルを丸ごと再生成させないこと**
>   → Codexへの依頼は必ず **差分（patch形式）** で行う
> - **日本語コメント・文字列を扱う場合はUTF-8前提で依頼すること**
>   → 文字化け防止のため明記する
> - **Codexに git add / git commit を実行させないこと**
> - **完了した場合ファイルを`.claude/fixed-plans` に移動する**

---

## 📋 目的

task-form.tsx に存在する3つのレンダリングモード（statusOnly, headerOnly, 通常表示）を統合し、レスポンシブ対応のCSSクラスで1つのコードに統一する。

## 🎯 期待成果

- ✅ コードの重複を削減（約150行削減見込み）
- ✅ 修正箇所が1箇所で済む（hideChevronのような修正が3箇所→1箇所に）
- ✅ メンテナンス性向上
- ✅ レスポンシブ対応の統一

## 📊 現状分析

### 3つのモードの違い

| 項目                       | statusOnly                   | headerOnly                             | 通常表示          |
| -------------------------- | ---------------------------- | -------------------------------------- | ----------------- |
| **用途**                   | デスクトップ・スクロール領域 | タブレット                             | モバイル          |
| **タイトル入力**           | なし                         | あり（text-[15px] md:text-lg）         | あり（text-lg）   |
| **ステータス**             | label表示                    | hideLabel={true}                       | label表示         |
| **優先度**                 | label表示                    | hideLabel={true}                       | label表示         |
| **compactMode**            | DatePicker: true             | CustomSelector: true, DatePicker: true | DatePicker: false |
| **AssigneeSelector width** | 160px                        | 140px + compact                        | 180px             |
| **ボードカテゴリー width** | w-80                         | flex-1                                 | w-80              |
| **外側div**                | `flex gap-2 pl-2`            | `flex gap-2 mt-1`                      | `flex gap-2`      |

### 共通点

- hideChevron={true} - 全部同じ ✅
- CustomSelector の基本構造 - 全部同じ ✅
- 順序: ステータス → 優先度 → 担当者 → ボードカテゴリー → 期限 - 全部同じ ✅

## 🔧 統合方針

### 1. ラベル表示の統一

**現状**: statusOnlyと通常表示でラベル表示、headerOnlyで非表示

**統合案**: **全てラベル非表示に統一**

- 理由: 現在のUIではラベルなしでも十分理解可能
- hideLabel は全て削除（デフォルトfalseのまま使用）

### 2. compactMode の統一

**現状**: headerOnlyでCustomSelector compactMode使用

**統合案**: CSSレスポンシブクラスで対応

```tsx
// 統合前
<CustomSelector compactMode={true} />;

// 統合後（CustomSelectorコンポーネント側で対応）
className = "h-7 md:h-8"; // タブレット以下で小さく
```

### 3. width の統一

**現状**: モードによって異なる

**統合案**: レスポンシブクラスで対応

```tsx
// AssigneeSelector
width = "140px md:160px lg:180px";

// 実際のクラス
className = "w-[140px] md:w-[160px] lg:w-[180px]";
```

### 4. 外側divクラスの統一

**現状**:

- statusOnly: `flex gap-2 pl-2`
- headerOnly: `flex gap-2 mt-1`
- 通常: `flex gap-2`

**統合案**: 条件クラスで対応

```tsx
className={`flex gap-2 ${statusOnly ? 'pl-2' : ''} ${headerOnly ? 'mt-1' : ''}`}
```

**または単純に**: `flex gap-2` に統一（pl-2, mt-1 は不要かも）

## 📝 実装手順

### Step 1: ステータスバー部分のコンポーネント化

まず、ステータスバー部分（ステータス、優先度、担当者、ボードカテゴリー、期限）を別コンポーネントに切り出す。

**新規ファイル**: `task-status-bar.tsx`

```tsx
interface TaskStatusBarProps {
  status: string;
  onStatusChange: (value: "todo" | "in_progress" | "completed") => void;
  priority: string;
  onPriorityChange: (value: "low" | "medium" | "high") => void;
  assigneeId?: string | null;
  onAssigneeChange?: (value: string | null) => void;
  teamMembers?: TeamMember[];
  showAssigneeSelector: boolean;
  boardCategoryId: number | null;
  onBoardCategoryChange: (value: number | null) => void;
  boardCategories: BoardCategory[];
  showBoardCategory: boolean;
  initialBoardId?: number;
  dueDate: number | null;
  onDueDateChange: (value: number | null) => void;
  isDeleted: boolean;
  // モード判定用（削除予定）
  mode?: "statusOnly" | "headerOnly" | "normal";
}

export function TaskStatusBar({
  status,
  onStatusChange,
  priority,
  onPriorityChange,
  assigneeId,
  onAssigneeChange,
  teamMembers = [],
  showAssigneeSelector,
  boardCategoryId,
  onBoardCategoryChange,
  boardCategories,
  showBoardCategory,
  initialBoardId,
  dueDate,
  onDueDateChange,
  isDeleted,
}: TaskStatusBarProps) {
  return (
    <div className="flex gap-2">
      <CustomSelector
        label="ステータス"
        options={statusOptions}
        value={status}
        onChange={(value) =>
          onStatusChange(value as "todo" | "in_progress" | "completed")
        }
        width="96px"
        disabled={isDeleted}
        hideChevron={true}
        hideLabel={true}
      />

      <CustomSelector
        label="優先度"
        options={priorityOptions}
        value={priority}
        onChange={(value) =>
          onPriorityChange(value as "low" | "medium" | "high")
        }
        fullWidth
        disabled={isDeleted}
        hideChevron={true}
        hideLabel={true}
      />

      {showAssigneeSelector && onAssigneeChange && (
        <AssigneeSelector
          members={teamMembers}
          value={assigneeId}
          onChange={onAssigneeChange}
          disabled={isDeleted}
          width="160px"
          hideLabel
          className="flex-shrink-0"
        />
      )}

      <div className="flex-1 flex gap-2.5 items-center">
        {showBoardCategory && (
          <div className="flex-1 md:w-80">
            <BoardCategorySelector
              value={boardCategoryId}
              onChange={onBoardCategoryChange}
              categories={boardCategories}
              boardId={initialBoardId!}
              disabled={isDeleted}
              allowCreate={true}
            />
          </div>
        )}

        <div className="w-28">
          <DatePickerSimple
            value={dueDate}
            onChange={onDueDateChange}
            disabled={isDeleted}
            compactMode={true}
            placeholder="期限"
          />
        </div>
      </div>
    </div>
  );
}
```

### Step 2: task-form.tsx で統合版を使用

3つの分岐を削除し、1つのレンダリングに統合。

```tsx
// 統合前（3つの分岐）
if (statusOnly) { return ... }
if (headerOnly) { return ... }
return ... // 通常表示

// 統合後（1つに統合）
return (
  <div className="flex flex-col flex-1 min-h-0">
    {!statusOnly && (
      <div className="flex items-center gap-1">
        <input
          ref={titleInputRef}
          type="text"
          placeholder={titlePlaceholder}
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
            }
          }}
          className="flex-1 mb-1 mt-1 text-[15px] md:text-lg font-medium border-b border-DeepBlue/80 outline-none focus:border-DeepBlue"
        />
      </div>
    )}

    <TaskStatusBar
      status={status}
      onStatusChange={onStatusChange}
      priority={priority}
      onPriorityChange={onPriorityChange}
      assigneeId={resolvedAssigneeId}
      onAssigneeChange={onAssigneeChange}
      teamMembers={teamMembers}
      showAssigneeSelector={showAssigneeSelector}
      boardCategoryId={boardCategoryId}
      onBoardCategoryChange={onBoardCategoryChange}
      boardCategories={boardCategories}
      showBoardCategory={showBoardCategory}
      initialBoardId={initialBoardId}
      dueDate={dueDate}
      onDueDateChange={onDueDateChange}
      isDeleted={isDeleted}
    />

    {/* 作成者・日付表示 */}
    {task && task.id !== 0 && !toolbarVisible && !editorOnly && (
      <div className="flex justify-end items-center gap-2 mr-2 mt-1 mb-1">
        <CreatorAvatar ... />
      </div>
    )}

    {/* エディター部分 */}
    {!headerOnly && !statusOnly && !titleAndDateOnly && (
      <TaskEditor ... />
    )}
  </div>
);
```

### Step 3: 不要なpropsの削除検討

統合後、以下のpropsが不要になる可能性：

- `statusOnly` - 代わりに `!showTitle` など
- `headerOnly` - 代わりに `!showEditor` など

ただし、既存の呼び出し側との互換性を保つため、当面は残す。

## ⚠️ 影響範囲・懸念点

### 影響範囲

**task-form.tsx を使用している箇所**:

- task-editor.tsx（メイン）
- その他のタスク編集画面

### 懸念点

1. **レスポンシブ動作の検証**
   - デスクトップ、タブレット、モバイルで正しく表示されるか
   - compactMode の削除影響

2. **既存の呼び出し側との互換性**
   - statusOnly, headerOnly propsは当面残す
   - 段階的に削除していく

3. **DatePickerSimple の compactMode**
   - 現在: headerOnlyとstatusOnlyでtrue、通常でfalse
   - 統合後: 常にtrue？それともレスポンシブ対応？

## 🧪 テスト計画

### 動作確認項目

1. **デスクトップ表示**
   - ステータスバーが正しく表示される
   - タイトル入力が正しく表示される

2. **タブレット表示**
   - compactMode が効いている
   - ボードカテゴリーが flex-1 で伸びる

3. **モバイル表示**
   - 全要素が正しく表示される
   - DatePicker が通常サイズ

4. **既存機能**
   - セレクター選択が正常動作
   - 担当者選択が正常動作
   - ボードカテゴリー選択が正常動作

## 📚 関連ファイル

- `apps/web/components/features/task/task-form.tsx` - メインファイル
- `apps/web/components/features/task/task-editor.tsx` - 呼び出し側
- `apps/web/components/ui/selectors/custom-selector.tsx` - CustomSelector

## ✅ Codex用 ToDoリスト

### フェーズ1: コンポーネント切り出し

- [ ] **task-status-bar.tsx 作成**: ステータスバー部分を新規コンポーネント化
- [ ] **hideLabel={true} を全セレクターに追加**: ラベル非表示に統一
- [ ] **レスポンシブクラス追加**: ボードカテゴリーを `flex-1 md:w-80` に

### フェーズ2: task-form.tsx 統合

- [ ] **TaskStatusBar import**: 新規コンポーネントをimport
- [ ] **statusOnly分岐を削除**: TaskStatusBar使用に置き換え
- [ ] **headerOnly分岐を削除**: TaskStatusBar使用に置き換え
- [ ] **通常表示を統合版に変更**: TaskStatusBar使用

### フェーズ3: 動作確認

- [ ] **デスクトップ表示確認**: ステータスバーが正しく表示
- [ ] **タブレット表示確認**: compactModeが効いている
- [ ] **モバイル表示確認**: 全要素が正しく表示

---

## 🤔 代替案: コンポーネント化せずに統合

TaskStatusBar を切り出さず、task-form.tsx 内で直接統合する方が簡単かもしれません。

**メリット**:

- ファイル数が増えない
- props の受け渡しが不要

**デメリット**:

- task-form.tsx が長いまま

どちらが良いか検討してください。

---

**作成日**: 2025-11-08
**ステータス**: 承認待ち
