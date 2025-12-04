# PETABOO-33: 個人側ボード詳細のURL形式をクエリパラメータ方式に統一

> ⚠️ Codexに実装依頼する際は、以下を厳守すること：
>
> - **既存ファイルを丸ごと再生成させないこと** → Codexへの依頼は必ず **差分（patch形式）** で行う
> - **日本語コメント・文字列を扱う場合はUTF-8前提で依頼すること** → 文字化け防止のため明記する
> - **Codexに git add / git commit を実行させないこと**
> - **完了した場合ファイルを`.claude/fixed-plans` に移動する**

## 目的

個人側のURL管理をチーム側と統一し、以下を実現する：

1. ボード詳細: `/?SLUG` 形式に変更（ページ遷移なし）
2. メモ/タスク詳細: `/?memo=N` / `/?task=N` 形式に変更（URL共有・ブラウザバック対応）
3. ヘッダー切り替え問題（PETABOO-6）の解消

## 現状と目標

### URL形式の比較

| 画面           | 個人側（現在）       | チーム側               | 個人側（目標）              |
| -------------- | -------------------- | ---------------------- | --------------------------- |
| メモ一覧       | `/?mode=memo`        | `/team/xxx?tab=memos`  | `/?mode=memo` （変更なし）  |
| タスク一覧     | `/?mode=task`        | `/team/xxx?tab=tasks`  | `/?mode=task` （変更なし）  |
| ボード一覧     | `/?mode=board`       | `/team/xxx?tab=boards` | `/?mode=board` （変更なし） |
| メモ詳細       | `/` (パラメータなし) | `/?memo=N`             | `/?memo=N`                  |
| タスク詳細     | `/` (パラメータなし) | `/?task=N`             | `/?task=N`                  |
| ボード詳細     | `/boards/[slug]`     | `/?SLUG`               | `/?SLUG`                    |
| ボード内メモ   | `/boards/[slug]`     | `/?SLUG&memo=N`        | `/?SLUG&memo=N`             |
| ボード内タスク | `/boards/[slug]`     | `/?SLUG&task=N`        | `/?SLUG&task=N`             |

## 変更内容

### Phase 1: ボード詳細をクエリパラメータ形式に変更

#### 1.1 client-home.tsx の修正

**ファイル**: `apps/web/app/client-home.tsx`

URLクエリパラメータからボードslugを取得し、Main に渡す。

```typescript
// 追加するロジック（チーム側と同じ形式）
const getBoardSlugFromURL = (): string | null => {
  for (const [key, value] of searchParams.entries()) {
    // 値が空のキーをボードslugとして扱う（?TEST 形式）
    if (value === "" && !["mode", "search", "memo", "task", "settings"].includes(key)) {
      return key.toUpperCase();
    }
  }
  return null;
};

const boardSlug = getBoardSlugFromURL();

<Main
  boardSlug={boardSlug || undefined}
  forceShowBoardDetail={!!boardSlug}
  initialCurrentMode={boardSlug ? "board" : (mode || undefined)}
  initialScreenMode={boardSlug ? "board" : (mode || undefined)}
/>
```

#### 1.2 main.tsx / main-client.tsx の修正

- `boardSlug` props を追加
- クエリパラメータからボード詳細表示を判定

#### 1.3 board-screen.tsx の修正

**ファイル**: `apps/web/components/screens/board-screen.tsx`

遷移先URLを変更し、遷移前にヘッダーを更新。

```typescript
const handleBoardSelect = (board: {
  id: number;
  slug: string;
  name: string;
  description?: string | null;
}) => {
  // ヘッダーを即座に更新
  window.dispatchEvent(
    new CustomEvent("team-board-name-change", {
      detail: {
        boardName: board.name,
        boardDescription: board.description || "",
      },
    }),
  );
  // クエリパラメータ形式で遷移（ページ遷移なし）
  router.push(`/?${board.slug.toUpperCase()}`);
};
```

#### 1.4 header.tsx の修正

- `isPersonalBoardDetailPage` の判定をクエリパラメータ形式に対応

#### 1.5 /boards/[slug]/page.tsx のリダイレクト化

- 既存のブックマーク対応: `/boards/TEST` → `/?TEST` にリダイレクト

### Phase 2: メモ/タスク詳細をURL対応

#### 2.1 main-client.tsx の修正

メモ/タスク選択時にURLパラメータを更新。

```typescript
// メモ選択時
const handleSelectMemo = (memo: Memo | null) => {
  setSelectedMemo(memo);
  if (memo) {
    router.replace(`/?memo=${memo.id}`, { scroll: false });
  } else {
    router.replace("/", { scroll: false });
  }
};

// タスク選択時
const handleSelectTask = (task: Task | null) => {
  setSelectedTask(task);
  if (task) {
    router.replace(`/?task=${task.id}`, { scroll: false });
  } else {
    router.replace("/", { scroll: false });
  }
};
```

#### 2.2 URLからメモ/タスクを復元

ページ読み込み時にURLパラメータからメモ/タスクを選択状態に復元。

```typescript
// URLパラメータから復元
useEffect(() => {
  const memoId = searchParams.get("memo");
  const taskId = searchParams.get("task");

  if (memoId && memos) {
    const memo = memos.find((m) => m.id === Number(memoId));
    if (memo) setSelectedMemo(memo);
  }
  if (taskId && tasks) {
    const task = tasks.find((t) => t.id === Number(taskId));
    if (task) setSelectedTask(task);
  }
}, [searchParams, memos, tasks]);
```

### Phase 3: ボード詳細内のメモ/タスクURL対応

#### 3.1 board-detail-wrapper.tsx の修正

チーム側と同様に、ボード内のメモ/タスク選択時にURLを更新。

```typescript
// ボード詳細内でメモ選択時
// URL: /?SLUG&memo=N
router.replace(`/?${boardSlug}&memo=${memo.boardIndex}`, { scroll: false });

// ボード詳細内でタスク選択時
// URL: /?SLUG&task=N
router.replace(`/?${boardSlug}&task=${task.boardIndex}`, { scroll: false });
```

### Phase 4: navigation-context の調整

#### 4.1 判定ロジックの更新

`isPersonalBoardPage` をクエリパラメータ形式に対応。

## 変更ファイル一覧

| Phase | ファイル                                              | 変更内容                   |
| ----- | ----------------------------------------------------- | -------------------------- |
| 1.1   | `apps/web/app/client-home.tsx`                        | ボードslug取得ロジック追加 |
| 1.2   | `apps/web/app/main.tsx`                               | boardSlug props追加        |
| 1.2   | `apps/web/components/client/main-client.tsx`          | boardSlug対応              |
| 1.3   | `apps/web/components/screens/board-screen.tsx`        | 遷移先URL変更              |
| 1.3   | `apps/web/components/features/board/board-list.tsx`   | 型修正（name追加）         |
| 1.4   | `apps/web/components/layout/header.tsx`               | 判定ロジック変更           |
| 1.5   | `apps/web/app/boards/[slug]/page.tsx`                 | リダイレクト実装           |
| 2.1   | `apps/web/components/client/main-client.tsx`          | メモ/タスク選択時URL更新   |
| 2.2   | `apps/web/components/client/main-client.tsx`          | URL復元ロジック            |
| 3.1   | `apps/web/components/client/board-detail-wrapper.tsx` | ボード内メモ/タスクURL対応 |
| 4.1   | `apps/web/src/contexts/navigation-context.tsx`        | 判定ロジック更新           |

## メリット

1. **ヘッダー問題解消**: ページ遷移なしで表示切り替え
2. **URL共有**: メモ/タスクを直接URLで共有可能
3. **ブラウザバック対応**: 戻る/進むが正しく動作
4. **設計統一**: チーム側と同じパターンでメンテナンス性向上

## テスト観点

- [ ] ボード一覧 → ボード詳細: ヘッダーが即座に切り替わる
- [ ] メモ選択時: URLが `/?memo=N` に更新される
- [ ] タスク選択時: URLが `/?task=N` に更新される
- [ ] ボード詳細内メモ選択: URLが `/?SLUG&memo=N` に更新される
- [ ] URL直接アクセス: 正しい状態が復元される
- [ ] ブラウザバック: 前の状態に戻る
- [ ] `/boards/TEST` → `/?TEST` にリダイレクトされる

## 実装順序（Codex用ToDoリスト）

### Phase 1: ボード詳細

- [ ] 1.1: client-home.tsx にボードslug取得ロジック追加
- [ ] 1.2: main.tsx / main-client.tsx に boardSlug props追加
- [ ] 1.3: board-screen.tsx の遷移先URL変更 + board-list.tsx 型修正
- [ ] 1.4: header.tsx の判定ロジック変更
- [ ] 1.5: /boards/[slug]/page.tsx をリダイレクト専用に変更
- [ ] 型チェック & 動作確認

### Phase 2: メモ/タスク詳細

- [ ] 2.1: main-client.tsx でメモ/タスク選択時URL更新
- [ ] 2.2: main-client.tsx でURL復元ロジック追加
- [ ] 型チェック & 動作確認

### Phase 3: ボード詳細内

- [ ] 3.1: board-detail-wrapper.tsx でボード内メモ/タスクURL対応
- [ ] 型チェック & 動作確認

### Phase 4: 整理

- [ ] 4.1: navigation-context.tsx の判定ロジック更新
- [ ] 全体動作確認
