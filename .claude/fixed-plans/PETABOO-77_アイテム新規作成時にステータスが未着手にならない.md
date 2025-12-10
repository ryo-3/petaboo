# PETABOO-77: アイテム新規作成時にステータスが未着手にならない

> ⚠️ Codexに実装依頼する際は、以下を厳守すること：

- **既存ファイルを丸ごと再生成させないこと**
  → Codexへの依頼は必ず **差分（patch形式）** で行う
- **日本語コメント・文字列を扱う場合はUTF-8前提で依頼すること**
  → 文字化け防止のため明記する
- **Codexに git add / git commit を実行させないこと**
- **完了した場合ファイルを`.claude/fixed-plans` に移動する**

---

## 目的

ボード詳細画面で他のステータスタブ（進行中、確認中、完了、削除済み）を表示中に新規タスクを作成した際、ステータスが「未着手」ではなく現在表示中のタブのステータスになってしまう問題を修正する。

## 問題の原因

### 該当ファイル

`apps/web/src/hooks/use-board-state.ts` - 356-380行目

### 問題のコード

```typescript
const createNewTaskHandler = useCallback(
  (onSelectTask?: (task: Task | null) => void) => {
    setRightPanelMode(null);

    const newTask: Task = {
      id: 0,
      title: "",
      description: null,
      displayId: "new",
      status:
        activeTaskTabRef.current === "deleted"
          ? "todo"
          : activeTaskTabRef.current, // ← ここが問題
      // ...
    };

    onSelectTask?.(newTask);
  },
  [],
);
```

### 問題点

- `deleted`タブの場合のみ`"todo"`に設定
- それ以外のタブでは、そのタブのステータス（`in_progress`, `checking`, `completed`）がそのまま設定される
- 例：「進行中」タブを開いている状態で新規作成すると、`status: "in_progress"` になる

## 修正方針

新規タスク作成時は**常に `"todo"`（未着手）**にする。

タブのステータスに関わらず、新しいタスクは未着手から始まるのが自然な挙動。

## 変更範囲

### 1. 修正対象ファイル

- `apps/web/src/hooks/use-board-state.ts`

### 2. 変更内容

**Before (365-368行目)**:

```typescript
      status:
        activeTaskTabRef.current === "deleted"
          ? "todo"
          : activeTaskTabRef.current,
```

**After**:

```typescript
      status: "todo", // 新規作成時は常に未着手
```

## 影響範囲

- ボード詳細画面での新規タスク作成のみ
- 個人モード・チームモード両方に影響

## Codex用ToDoリスト

1. `apps/web/src/hooks/use-board-state.ts` を開く
2. 365-368行目の `status` プロパティを以下のように変更:
   ```typescript
   status: "todo", // 新規作成時は常に未着手
   ```
3. 型チェック実行: `npm run check:wsl`
4. 動作確認:
   - ボード詳細画面で「進行中」タブを選択
   - 新規タスクを作成
   - ステータスが「未着手」になっていることを確認
