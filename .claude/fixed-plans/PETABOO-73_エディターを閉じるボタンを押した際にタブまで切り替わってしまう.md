> ⚠️ Codexに実装依頼する際は、以下を厳守すること：

- **既存ファイルを丸ごと再生成させないこと**
  → Codexへの依頼は必ず **差分（patch形式）** で行う
- **日本語コメント・文字列を扱う場合はUTF-8前提で依頼すること**
  → 文字化け防止のため明記する
- **Codexに git add / git commit を実行させないこと**
- **完了した場合ファイルを`.claude/fixed-plans` に移動する**

---

# PETABOO-73: エディターを閉じるボタンを押した際にタブまで切り替わってしまう

## 問題の概要

ボード詳細画面でタスクエディター（またはメモエディター）を閉じるボタンを押した際に、現在表示中のタブが意図せず切り替わってしまう。

**ユーザーの期待**: 閉じるボタンを押したら、現在のタブにとどまりたい

## 原因分析

### 問題のコード箇所

**ファイル**: `apps/web/components/screens/board-detail-screen.tsx` (231-250行)

```typescript
useEffect(() => {
  if (selectedTask) {
    // 削除済みタスクの場合
    if ("deletedAt" in selectedTask && selectedTask.deletedAt) {
      setActiveTaskTab("deleted");
    } else {
      // 通常タスクの場合、ステータスに応じてタブを切り替え
      const taskStatus = selectedTask.status as
        | "todo"
        | "in_progress"
        | "checking"
        | "completed";
      if (taskStatus) {
        setActiveTaskTab(taskStatus); // ← ここでタブが自動切り替え
      }
    }
  }
}, [selectedTask, setActiveTaskTab]);
```

### 問題発生フロー

1. ユーザーがタスクを選択してエディターを開く
2. タスクのステータスを変更（例: "todo" → "in_progress"）して保存
3. **閉じるボタンを押す**
4. `selectedTask`の参照が更新される（ステータスが変わっている）
5. 上記のuseEffectが発火
6. タスクの現在のステータス（"in_progress"）に応じてタブが自動切り替え
7. **結果**: ユーザーが見ていた"todo"タブから"in_progress"タブに切り替わってしまう

### この機能の本来の目的

このuseEffectは「リスト一覧からタスクを選択した際に、そのタスクのステータスに合ったタブに自動切り替え」するための機能。

しかし、以下のケースで意図しない動作を引き起こす：

- エディターで編集後に閉じた場合
- キャッシュの更新によりselectedTaskの参照が変わった場合

## 修正方針

### 案1: 閉じるボタン押下時はタブ切り替えをスキップする（推奨）

「エディターを閉じる」操作と「新たにタスクを選択する」操作を区別する。

**実装方法**:

- `useRef`でフラグを管理し、「閉じる操作中」かどうかを追跡
- 閉じる操作中の場合はuseEffectでのタブ切り替えをスキップ

### 案2: タスク選択の明示的な操作でのみタブ切り替えを行う

選択ハンドラー（`handleSelectTask`等）内でタブ切り替えを行い、useEffectは削除する。

**メリット**: ロジックが明確になる
**デメリット**: 複数箇所に同じロジックが必要

### 採用案: 案1（閉じる操作のフラグ管理）

## 実装計画

### Step 1: フラグ管理用のrefを追加

**ファイル**: `apps/web/components/screens/board-detail-screen.tsx`

```typescript
// エディターを閉じる操作中かどうかを追跡するref
const isClosingEditorRef = useRef(false);
```

### Step 2: 閉じるハンドラーでフラグを設定

**ファイル**: `apps/web/components/screens/board-detail-screen.tsx`

`stableOnClose`を修正：

```typescript
const stableOnClose = useCallback(() => {
  // 閉じる操作開始フラグを設定
  isClosingEditorRef.current = true;

  if (rightPanelMode) {
    handleCloseRightPanel(onClearSelection);
  } else {
    handleCloseDetail();
  }

  // 次のレンダリングサイクル後にフラグをリセット
  requestAnimationFrame(() => {
    isClosingEditorRef.current = false;
  });
}, [
  rightPanelMode,
  handleCloseRightPanel,
  onClearSelection,
  handleCloseDetail,
]);
```

### Step 3: useEffectでフラグをチェック

**ファイル**: `apps/web/components/screens/board-detail-screen.tsx`

```typescript
useEffect(() => {
  // 閉じる操作中の場合はタブ切り替えをスキップ
  if (isClosingEditorRef.current) {
    return;
  }

  if (selectedTask) {
    // 削除済みタスクの場合
    if ("deletedAt" in selectedTask && selectedTask.deletedAt) {
      setActiveTaskTab("deleted");
    } else {
      // 通常タスクの場合、ステータスに応じてタブを切り替え
      const taskStatus = selectedTask.status as
        | "todo"
        | "in_progress"
        | "checking"
        | "completed";
      if (taskStatus) {
        setActiveTaskTab(taskStatus);
      }
    }
  }
}, [selectedTask, setActiveTaskTab]);
```

### Step 4: メモも同様に対応（任意）

メモ側でも同じ問題が発生している場合は、同様の修正を適用。

ただし、メモのuseEffect（217-229行）を確認：

```typescript
useEffect(() => {
  if (selectedMemo) {
    // 削除済みメモの場合
    if ("deletedAt" in selectedMemo && selectedMemo.deletedAt) {
      if (activeMemoTab !== "deleted") {
        setActiveMemoTab("deleted");
      }
    }
  }
}, [selectedMemo, activeMemoTab, setActiveMemoTab]);
```

メモの場合は「削除済みかどうか」でのみタブ切り替えを行っているため、ステータス変更による問題は発生しにくい。ただし、一貫性のために同じフラグでガードすることを推奨。

## 影響範囲

- `apps/web/components/screens/board-detail-screen.tsx`のみ
- チームモード・個人モード両方に適用される（共通コンポーネント）

## テスト観点

1. **基本動作**: タスクエディターを閉じた後、現在のタブが維持されること
2. **ステータス変更後**: タスクのステータスを変更して閉じた場合も、元のタブに留まること
3. **タスク選択時**: リストからタスクを選択した場合は、従来通りタブが自動切り替えされること
4. **メモ**: メモエディターを閉じた場合も同様に動作すること

## Codex用ToDoリスト

1. [ ] `board-detail-screen.tsx`に`isClosingEditorRef`を追加（useRefをインポート済みか確認）
2. [ ] `stableOnClose`を修正してフラグを設定・リセットする処理を追加
3. [ ] タスクのuseEffect（231行目付近）にフラグチェックを追加
4. [ ] メモのuseEffect（217行目付近）にも同様のフラグチェックを追加（任意）
5. [ ] TypeScriptの型チェック通過を確認（`npm run check:wsl`）
