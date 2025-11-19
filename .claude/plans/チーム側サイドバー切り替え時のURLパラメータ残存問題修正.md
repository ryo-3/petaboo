# チーム側サイドバー切り替え時のURLパラメータ残存問題修正

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

チーム詳細ページでサイドバーからメモ一覧・タスク一覧を切り替えた際に、以前開いていたアイテムのURLパラメータ（`memo=749`など）が復活してしまう問題を修正する。

### 現象

1. メモ一覧でメモを開く → URL: `?tab=memos&memo=749`
2. メモを閉じる → URL: `?tab=memos`（正常）
3. サイドバーでタスク一覧に切り替え → URL: `?tab=tasks`（正常）
4. サイドバーでメモ一覧に戻る → URL: `?tab=memos&memo=749`（❌ 問題発生）

### 期待動作

サイドバーでタブを切り替えた際は、常にリスト表示（アイテムパラメータなし）に戻るべき。

---

## 🔍 原因分析

### 1. 現在の処理フロー

#### サイドバーでメモ一覧をクリック（layout.tsx:233-242）

```typescript
const handleShowMemoList = () => {
  setFallbackMode("memo");
  if (isTeamDetailPage) {
    window.dispatchEvent(
      new CustomEvent("team-back-to-memo-list", {
        detail: { pathname },
      }),
    );
  }
};
```

#### team-detail.tsx で受信（504-511行目）

```typescript
const handleBackToMemoList = (_event: CustomEvent) => {
  // メモの選択を解除してメモ一覧に戻る
  setSelectedMemo(null);
  setSelectedDeletedMemo(null);
  setIsCreatingMemo(false);
  // handleTabChangeを使って即座にタブ切り替え
  handleTabChange("memos");
};
```

#### handleTabChange の処理（385-449行目）

```typescript
const handleTabChange = useCallback(
  (tab, options?) => {
    // ... 省略 ...

    // URLを更新
    const params = new URLSearchParams(searchParams.toString()); // ← 🔥 ここが原因！

    // タブ切り替え時に不要なパラメータを削除
    if (tab !== "memos") {
      params.delete("memo");
      setSelectedMemo(null);
      setSelectedDeletedMemo(null);
    }
    if (tab !== "tasks") {
      params.delete("task");
      setSelectedTask(null);
      setSelectedDeletedTask(null);
    }

    // ... URL更新処理 ...
  },
  [router, customUrl, searchParams, setActiveTabContext],
);
```

### 2. 問題の根本原因

**`searchParams.toString()`が古いURLパラメータをそのまま引き継ぐ**

- `handleTabChange("memos")`が呼ばれた時点で、`searchParams`はまだ古いURLの状態（`?tab=tasks`）を保持
- しかし、**ブラウザの履歴には以前の`?tab=memos&memo=749`が残っている**
- `new URLSearchParams(searchParams.toString())`で現在のパラメータをコピーするが、これには`memo`パラメータが含まれていない
- しかし、`tab !== "memos"`の条件により`memo`パラメータの削除処理が**スキップ**される
- 結果として、ブラウザの履歴から復元された`memo=749`がそのまま残る

### 3. 詳細な問題箇所

`team-detail.tsx`の`handleTabChange`関数内で：

```typescript
// タブ切り替え時に不要なパラメータを削除
if (tab !== "memos") {
  params.delete("memo"); // memosタブの場合は削除されない！
  setSelectedMemo(null);
  setSelectedDeletedMemo(null);
}
if (tab !== "tasks") {
  params.delete("task"); // tasksタブの場合は削除されない！
  setSelectedTask(null);
  setSelectedDeletedTask(null);
}
```

**問題点**：

- サイドバーから「メモ一覧」をクリックした場合、`tab === "memos"`なので`params.delete("memo")`が実行されない
- サイドバーから「タスク一覧」をクリックした場合、`tab === "tasks"`なので`params.delete("task")`が実行されない
- これにより、サイドバー経由でタブに戻った際に、アイテムパラメータが残存してしまう

---

## 💡 解決策

### アプローチ：サイドバー経由の場合は強制的にアイテムパラメータをクリア

`handleTabChange`関数に、**「サイドバーからの切り替えかどうか」**を判定するオプションパラメータを追加し、サイドバー経由の場合は常にアイテムパラメータ（`memo`/`task`）を削除する。

---

## 📝 変更範囲

### 修正対象ファイル

1. **`apps/web/components/features/team/team-detail.tsx`**
   - `handleTabChange`関数のシグネチャ変更
   - サイドバー経由の場合のパラメータクリア処理追加
   - `handleBackToMemoList`から`handleTabChange`を呼ぶ際にフラグを渡す
   - サイドバーイベントハンドラー（`handleTeamModeChange`）から`handleTabChange`を呼ぶ際にフラグを渡す

---

## 🛠️ 実装手順

### ステップ1：`handleTabChange`のシグネチャ変更

**場所**：`apps/web/components/features/team/team-detail.tsx:385-449`

**変更内容**：

```typescript
// 修正前
const handleTabChange = useCallback(
  (
    tab:
      | "overview"
      | "memos"
      | "tasks"
      | "boards"
      | "board"
      | "team-list"
      | "team-settings"
      | "search",
    options?: { slug?: string },
  ) => {
    // ... 既存処理 ...
  },
  [router, customUrl, searchParams, setActiveTabContext],
);

// 修正後
const handleTabChange = useCallback(
  (
    tab:
      | "overview"
      | "memos"
      | "tasks"
      | "boards"
      | "board"
      | "team-list"
      | "team-settings"
      | "search",
    options?: {
      slug?: string;
      fromSidebar?: boolean; // 🆕 サイドバー経由フラグ
    },
  ) => {
    // ... 既存処理 ...
  },
  [router, customUrl, searchParams, setActiveTabContext, setOptimisticMode], // 依存配列も更新
);
```

### ステップ2：パラメータクリア処理の改善

**場所**：`apps/web/components/features/team/team-detail.tsx:432-442`

**変更内容**：

```typescript
// 修正前
// タブ切り替え時に不要なパラメータを削除
if (tab !== "memos") {
  params.delete("memo");
  setSelectedMemo(null);
  setSelectedDeletedMemo(null);
}
if (tab !== "tasks") {
  params.delete("task");
  setSelectedTask(null);
  setSelectedDeletedTask(null);
}

// 修正後
// タブ切り替え時に不要なパラメータを削除
// サイドバー経由の場合は、同じタブでもアイテムパラメータを強制削除
if (tab !== "memos" || options?.fromSidebar) {
  params.delete("memo");
  setSelectedMemo(null);
  setSelectedDeletedMemo(null);
}
if (tab !== "tasks" || options?.fromSidebar) {
  params.delete("task");
  setSelectedTask(null);
  setSelectedDeletedTask(null);
}
```

### ステップ3：サイドバーイベントハンドラーの修正

**場所**：`apps/web/components/features/team/team-detail.tsx:461-480`

**変更内容**：

```typescript
// 修正前
const handleTeamModeChange = (event: CustomEvent) => {
  const { mode } = event.detail;

  if (mode === "overview") {
    handleTabChange("overview");
  } else if (mode === "memo") {
    handleTabChange("memos");
  } else if (mode === "task") {
    handleTabChange("tasks");
  } else if (mode === "board") {
    handleTabChange("boards");
  } else if (mode === "team-list") {
    handleTabChange("team-list");
  } else if (mode === "team-settings") {
    handleTabChange("team-settings");
  } else if (mode === "search") {
    handleTabChange("search");
  }
};

// 修正後
const handleTeamModeChange = (event: CustomEvent) => {
  const { mode } = event.detail;

  if (mode === "overview") {
    handleTabChange("overview", { fromSidebar: true });
  } else if (mode === "memo") {
    handleTabChange("memos", { fromSidebar: true });
  } else if (mode === "task") {
    handleTabChange("tasks", { fromSidebar: true });
  } else if (mode === "board") {
    handleTabChange("boards", { fromSidebar: true });
  } else if (mode === "team-list") {
    handleTabChange("team-list", { fromSidebar: true });
  } else if (mode === "team-settings") {
    handleTabChange("team-settings", { fromSidebar: true });
  } else if (mode === "search") {
    handleTabChange("search", { fromSidebar: true });
  }
};
```

### ステップ4：`handleBackToMemoList`の修正

**場所**：`apps/web/components/features/team/team-detail.tsx:504-511`

**変更内容**：

```typescript
// 修正前
const handleBackToMemoList = (_event: CustomEvent) => {
  // メモの選択を解除してメモ一覧に戻る
  setSelectedMemo(null);
  setSelectedDeletedMemo(null);
  setIsCreatingMemo(false);
  // handleTabChangeを使って即座にタブ切り替え
  handleTabChange("memos");
};

// 修正後
const handleBackToMemoList = (_event: CustomEvent) => {
  // メモの選択を解除してメモ一覧に戻る
  setSelectedMemo(null);
  setSelectedDeletedMemo(null);
  setIsCreatingMemo(false);
  // handleTabChangeを使って即座にタブ切り替え（サイドバー経由フラグを付与）
  handleTabChange("memos", { fromSidebar: true });
};
```

### ステップ5：`handleBackToTaskList`の修正

**場所**：`apps/web/components/features/team/team-detail.tsx:513-530`

**変更内容**：

```typescript
// 修正前（529行目）
handleTabChange("tasks");

// 修正後
handleTabChange("tasks", { fromSidebar: true });
```

---

## 🧪 テストシナリオ

### テストケース1：メモ一覧 → タスク一覧 → メモ一覧

1. メモ一覧でメモを開く（例：memo=749）
2. メモを閉じる → URL: `?tab=memos`
3. サイドバーでタスク一覧をクリック → URL: `?tab=tasks`
4. サイドバーでメモ一覧をクリック → URL: `?tab=memos`（❌ `memo=749`が付かないこと）

### テストケース2：タスク一覧 → メモ一覧 → タスク一覧

1. タスク一覧でタスクを開く（例：task=123）
2. タスクを閉じる → URL: `?tab=tasks`
3. サイドバーでメモ一覧をクリック → URL: `?tab=memos`
4. サイドバーでタスク一覧をクリック → URL: `?tab=tasks`（❌ `task=123`が付かないこと）

### テストケース3：メモ詳細 → サイドバーでタスク一覧

1. メモ一覧でメモを開く（例：memo=749）
2. サイドバーでタスク一覧をクリック → URL: `?tab=tasks`（メモパラメータが削除される）

### テストケース4：ブラウザの戻るボタン

1. メモ一覧でメモを開く（例：memo=749） → URL: `?tab=memos&memo=749`
2. サイドバーでタスク一覧をクリック → URL: `?tab=tasks`
3. ブラウザの戻るボタンをクリック → URL: `?tab=memos&memo=749`（正常に復元される）

---

## 🎯 影響範囲

### 変更対象

- `apps/web/components/features/team/team-detail.tsx`

### 影響を受ける機能

- チーム詳細ページのサイドバー切り替え
- メモ一覧・タスク一覧間の遷移
- URLパラメータの管理

### 既存機能への影響

- ✅ メモ・タスクの直接選択：影響なし（`options`パラメータを渡さない場合は既存動作）
- ✅ ブラウザの戻る/進む：影響なし
- ✅ 他のタブ切り替え：影響なし

---

## 🚀 Codex用実装チェックリスト

- [ ] `handleTabChange`関数のシグネチャに`fromSidebar`オプションを追加
- [ ] パラメータクリア処理に`options?.fromSidebar`条件を追加
- [ ] `handleTeamModeChange`から`handleTabChange`を呼ぶ際に`{ fromSidebar: true }`を渡す
- [ ] `handleBackToMemoList`から`handleTabChange`を呼ぶ際に`{ fromSidebar: true }`を渡す
- [ ] `handleBackToTaskList`から`handleTabChange`を呼ぶ際に`{ fromSidebar: true }`を渡す
- [ ] useCallbackの依存配列を確認（必要に応じて更新）
- [ ] テストシナリオを実行して動作確認

---

## 📌 補足事項

### なぜこの実装か？

1. **最小限の変更**：既存のロジックを大きく変更せず、オプショナルなフラグで対応
2. **後方互換性**：`fromSidebar`を指定しない場合は既存の動作を維持
3. **明示的な意図**：サイドバー経由かどうかがコードから明確に分かる

### 代替案との比較

#### 代替案A：常にアイテムパラメータを削除

```typescript
// タブ切り替え時は常にアイテムパラメータを削除
params.delete("memo");
params.delete("task");
setSelectedMemo(null);
setSelectedTask(null);
```

**却下理由**：メモ詳細からメモ一覧に戻る場合など、URLパラメータを保持したい場合もあるため

#### 代替案B：イベント名を分ける

- `team-mode-change-from-sidebar`
- `team-mode-change-from-other`

**却下理由**：イベント名が増えてコードが複雑化する

---

## 🔄 関連する問題

- 個人モード側でも同様の問題がないか確認が必要
- ボード詳細ページでも同様の問題がないか確認が必要

---

## 📅 作成日

2025-11-19

## 📝 最終更新日

2025-11-19
