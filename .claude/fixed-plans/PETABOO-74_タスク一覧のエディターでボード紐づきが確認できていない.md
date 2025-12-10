# PETABOO-74: タスク一覧のエディターでボード紐づきが確認できていない

> ⚠️ Codexに実装依頼する際は、以下を厳守すること：
>
> - **既存ファイルを丸ごと再生成させないこと** → 差分（patch形式）で行う
> - **日本語コメント・文字列を扱う場合はUTF-8前提で依頼すること**
> - **Codexに git add / git commit を実行させないこと**
> - **完了した場合ファイルを`.claude/fixed-plans` に移動する**

## 目的

タスク一覧画面で、一覧ではボード紐づきが正しく表示されているのに、エディター（右側パネル）ではボード紐づきが表示されない問題を修正する。

## 問題の原因

### 現状のデータフロー

1. **一覧表示** (`task-status-display.tsx`):
   - `allBoardItems`（全ボードアイテム一括取得）からフィルタリング
   - `displayId`でマッチングしてボード情報を表示
   - ✅ 正しく動作

2. **エディター** (`task-editor.tsx`):
   - `preloadedItemBoards`を親から受け取る
   - 親（`task-screen.tsx`）は`useTeamItemBoards`フックでAPIを個別に呼び出し
   - ❌ 正しく動作しない

### 問題点

`task-screen.tsx`では2つの異なるデータソースを使用している：

- 一覧: `allBoardItems`（`useAllBoardItems`）
- エディター: `itemBoards`（`useTeamItemBoards` / `useItemBoards`）

これにより、データの不整合が発生する可能性がある：

- キャッシュのタイミング差
- APIエンドポイントの実装差
- `displayId`の取得タイミング

## 実装計画

### 変更ファイル

| ファイル                                      | 変更内容                                            |
| --------------------------------------------- | --------------------------------------------------- |
| `apps/web/components/screens/task-screen.tsx` | `allBoardItems`から`itemBoards`を計算するように変更 |

### 詳細手順

#### 1. task-screen.tsx の修正

**現在のコード (L250-263):**

```typescript
// 選択中のタスクに紐づくボード情報を取得（フェーズ1対応）
const selectedTaskId = selectedTask?.displayId;
const { data: personalTaskItemBoards = [] } = useItemBoards(
  "task",
  teamMode ? undefined : selectedTaskId,
);

const { data: teamTaskItemBoards = [] } = useTeamItemBoards(
  teamMode ? teamId || 0 : 0,
  "task",
  teamMode ? selectedTaskId : undefined,
);

const itemBoards = teamMode ? teamTaskItemBoards : personalTaskItemBoards;
```

**修正後のコード:**

```typescript
// 選択中のタスクに紐づくボード情報を取得
// 一覧と同じデータソース（allBoardItems）から計算して整合性を確保
const itemBoards = useMemo(() => {
  if (!selectedTask || !allBoardItems || !boards) return [];

  const displayId = selectedTask.displayId || "";

  // allBoardItemsからこのタスクに紐づくボードをフィルタリング
  const taskBoardItems = allBoardItems.filter(
    (item) => item.itemType === "task" && item.displayId === displayId,
  );

  // ボード情報を取得
  return taskBoardItems
    .map((item) => boards.find((board) => board.id === item.boardId))
    .filter((board): board is NonNullable<typeof board> => board !== undefined);
}, [selectedTask, allBoardItems, boards]);
```

### 利点

1. **データソースの一元化**: 一覧とエディターが同じデータソース(`allBoardItems`)を使用
2. **キャッシュの整合性**: 両方が同じキャッシュを参照
3. **不要なAPIコール削減**: `useTeamItemBoards` / `useItemBoards`の個別APIコールが不要に
4. **即時反映**: ボード紐づけ変更時に両方が同時に更新される

### 影響範囲

- `task-screen.tsx`のみ
- 既存のフック（`useTeamItemBoards` / `useItemBoards`）は他の箇所で使用されている可能性があるため残す
- `memo-screen.tsx`も同様の問題がある可能性があるが、今回はタスクのみ修正

## Codex用ToDoリスト

- [ ] `task-screen.tsx` のL250-263を修正
  - `useItemBoards` / `useTeamItemBoards`の呼び出しを削除
  - `useMemo`で`allBoardItems`から`itemBoards`を計算するコードを追加
  - 必要なimport（`useMemo`）を確認

## テスト手順

1. チームモードでタスク一覧画面を開く
2. ボードに紐づいているタスクを選択
3. エディター（右側パネル）でボード紐づきアイコンが正しく表示されることを確認
4. 一覧とエディターの表示が一致することを確認
