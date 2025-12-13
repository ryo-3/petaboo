# PETABOO-89: チームボード詳細でアイテム選択時にちらつく

> ⚠️ Codexに実装依頼する際は、以下を厳守すること：
>
> - **既存ファイルを丸ごと再生成させないこと** → 必ず **差分（patch形式）** で行う
> - **日本語コメント・文字列を扱う場合はUTF-8前提で依頼すること**
> - **Codexに git add / git commit を実行させないこと**
> - **完了した場合ファイルを`.claude/fixed-plans` に移動する**

## 問題概要

チームボードでアイテム（メモ/タスク）を選択した際に、「一度読み込まれてから、選択前のアイテムが表示され、その後すぐに選択後のアイテムが表示される」という**ちらつき**が発生している。

## 原因分析

### 主原因: `board-detail-screen-3panel.tsx` の860-876行目

```typescript
// 選択中のタスクをboardWithItemsの最新データで同期（一括更新後の反映用）
useEffect(() => {
  if (!selectedTask || !allTaskItems.length || !onSelectTask) return;

  const updatedTaskItem = allTaskItems.find(
    (item) => (item.content as Task).id === selectedTask.id,
  );

  if (updatedTaskItem) {
    const updatedTask = updatedTaskItem.content as Task;
    if (updatedTask.assigneeId !== selectedTask.assigneeId) {
      onSelectTask(updatedTask); // ← ここで予期しない再選択が発生
    }
  }
}, [allTaskItems, selectedTask, onSelectTask]);
```

**問題点:**

- `allTaskItems` は `useBoardItems` フックから取得
- アイテム選択時に `boardWithItems` が更新されると `allTaskItems` も変更
- その結果、このuseEffectが実行され、**選択直後に別のアイテムを選択する可能性**がある
- `assigneeId` 条件だけでは不十分で、**アイテム選択操作中に `onSelectTask` が呼ばれてしまう**

### ちらつきの発生フロー

1. ユーザーがタスクBを選択 → `handleSelectTask(taskB)` 実行
2. 状態更新: `selectedTask = taskB`
3. React Queryがデータ再取得 → `boardWithItems` 更新
4. `useBoardItems` の useMemo 再計算 → `allTaskItems` 変更
5. **860行目のuseEffect発火** → 条件により `onSelectTask(古いタスクのデータ)` 実行
6. 結果: 画面が「古いタスク」→「新しいタスク」の順で表示（ちらつき）

## 修正方針

### 方針1: useEffectの発火条件を厳密化（推奨）

選択操作中のuseEffect発火を防ぐため、**ユーザー選択直後は同期処理をスキップする**フラグを追加。

```typescript
// 選択操作中フラグをrefで管理
const isSelectingRef = useRef(false);

// 選択ハンドラー側でフラグを設定
const handleSelectTask = useCallback(
  (task: Task | DeletedTask | null) => {
    isSelectingRef.current = true;
    onSelectTask?.(task);
    // 次のレンダリングサイクル後にフラグをリセット
    requestAnimationFrame(() => {
      isSelectingRef.current = false;
    });
  },
  [onSelectTask],
);

// useEffect側でフラグをチェック
useEffect(() => {
  // 選択操作中はスキップ
  if (isSelectingRef.current) return;

  if (!selectedTask || !allTaskItems.length || !onSelectTask) return;
  // ... 残りのロジック
}, [allTaskItems, selectedTask, onSelectTask]);
```

### 方針2: データ更新検知の精緻化

`allTaskItems` の変更ではなく、**実際に担当者が変更されたかどうか**を厳密にチェック。

```typescript
// 前回の担当者IDをrefで保持
const prevAssigneeIdRef = useRef<number | null>(null);

useEffect(() => {
  if (!selectedTask || !allTaskItems.length || !onSelectTask) return;

  const updatedTaskItem = allTaskItems.find(
    (item) => (item.content as Task).id === selectedTask.id,
  );

  if (updatedTaskItem) {
    const updatedTask = updatedTaskItem.content as Task;
    const currentAssigneeId = updatedTask.assigneeId ?? null;

    // 初回 or 実際に担当者IDが変わった場合のみ更新
    if (
      prevAssigneeIdRef.current !== null &&
      currentAssigneeId !== prevAssigneeIdRef.current &&
      currentAssigneeId !== selectedTask.assigneeId
    ) {
      onSelectTask(updatedTask);
    }

    prevAssigneeIdRef.current = currentAssigneeId;
  }
}, [allTaskItems, selectedTask, onSelectTask]);
```

### 方針3: useEffectの完全削除（検討必要）

このuseEffectの目的は「一括更新後の担当者反映」だが、これが本当に必要か検討。

- React Queryのキャッシュ更新で自動反映されるべき
- 削除することでちらつき問題は完全解消
- ただし、一括担当者変更の動作確認が必要

## 推奨する修正

**方針1と方針2の組み合わせ**を推奨:

1. 選択操作中フラグ（isSelectingRef）を追加
2. 担当者変更の厳密チェック（prevAssigneeIdRef）を追加
3. selectedTaskのid変更時にprevAssigneeIdRefをリセット

## 実装手順（Codex用）

### 手順1: `board-detail-screen-3panel.tsx` の修正

**ファイル:** `apps/web/components/screens/board-detail-screen-3panel.tsx`

**変更箇所:** 860-876行目のuseEffectを以下に置換

```typescript
// 選択操作中フラグ（ちらつき防止）
const isSelectingTaskRef = useRef(false);
// 前回の担当者ID（実際の変更検知用）
const prevSelectedTaskAssigneeRef = useRef<number | null | undefined>(
  undefined,
);

// selectedTaskのid変更時に担当者refをリセット
useEffect(() => {
  if (selectedTask) {
    prevSelectedTaskAssigneeRef.current = selectedTask.assigneeId;
  } else {
    prevSelectedTaskAssigneeRef.current = undefined;
  }
}, [selectedTask?.id]); // idの変更時のみ

// 選択中のタスクをboardWithItemsの最新データで同期（一括更新後の反映用）
useEffect(() => {
  // 選択操作中はスキップ（ちらつき防止）
  if (isSelectingTaskRef.current) return;
  if (!selectedTask || !allTaskItems.length || !onSelectTask) return;

  const updatedTaskItem = allTaskItems.find(
    (item) => (item.content as Task).id === selectedTask.id,
  );

  if (updatedTaskItem) {
    const updatedTask = updatedTaskItem.content as Task;
    // 担当者IDが実際に変わった場合のみ更新
    // かつ、前回値と現在値の両方が存在し、異なる場合のみ
    if (
      prevSelectedTaskAssigneeRef.current !== undefined &&
      updatedTask.assigneeId !== prevSelectedTaskAssigneeRef.current
    ) {
      prevSelectedTaskAssigneeRef.current = updatedTask.assigneeId;
      onSelectTask(updatedTask);
    }
  }
}, [allTaskItems, selectedTask, onSelectTask]);
```

### 手順2: 選択ハンドラーにフラグ設定を追加

**同ファイル内の `handleSelectTask` 相当の処理を探し、選択時にフラグを設定**

既存コードで `onSelectTask` を呼び出している箇所を特定し、その前後でフラグを設定:

```typescript
// 例: BoardRightPanelに渡すonSelectTask をラップ
const handleSelectTaskWithFlag = useCallback(
  (task: Task | DeletedTask | null) => {
    isSelectingTaskRef.current = true;
    onSelectTask?.(task);
    // 次フレームでフラグをリセット
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        isSelectingTaskRef.current = false;
      });
    });
  },
  [onSelectTask],
);
```

※ ただし、`onSelectTask` は親コンポーネント（team-board-detail-wrapper）から渡されるpropsなので、このコンポーネント内でラップする形で対応。

### 手順3: 型チェック実行

```bash
npm run check:wsl
```

## 影響範囲

- `apps/web/components/screens/board-detail-screen-3panel.tsx`
- チームボード詳細のタスク選択操作
- 個人ボード詳細にも同じロジックがあれば同様に修正が必要

## テスト項目

1. チームボードでタスクを選択 → ちらつきが発生しないこと
2. チームボードでメモを選択 → ちらつきが発生しないこと
3. 一括担当者変更 → 選択中のタスクの担当者が正しく反映されること
4. 個人ボードでも同様の動作確認
