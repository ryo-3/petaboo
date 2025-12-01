# チーム側ボードURL短縮化 Plan

> ⚠️ Codexに実装依頼する際は、以下を厳守すること：

- **既存ファイルを丸ごと再生成させないこと**
  → Codexへの依頼は必ず **差分（patch形式）** で行う
- **日本語コメント・文字列を扱う場合はUTF-8前提で依頼すること**
  → 文字化け防止のため明記する
- **Codexに git add / git commit を実行させないこと**
- **完了した場合ファイルを`.claude/fixed-plans` に移動する**

---

## 目的

チーム側のボード詳細URLから `board=` を省略し、短くシンプルなURLを実現する。

### Before

```
/team/moricrew?board=PETABOO&task=22
```

### After

```
/team/moricrew?PETABOO&task=22
```

---

## 変更範囲

### フロント側（apps/web）

- `components/features/team/team-detail.tsx` - URLパース処理
- `components/features/team/team-board-detail-wrapper.tsx` - ボードslug取得処理
- URL生成している箇所（ボードリンク作成部分）

---

## 実装手順

### Step 1: URLパース処理の修正

**対象ファイル**: `apps/web/components/features/team/team-detail.tsx`

ボードslug取得ロジックを追加：

```typescript
// ボードslugを取得
const getBoardSlugFromURL = () => {
  // 従来形式の互換性
  const boardParam = searchParams.get("board");
  if (boardParam) return boardParam;

  // 新形式: 値が空のキーをボードslugとして扱う
  for (const [key, value] of searchParams) {
    if (value === "" && key !== "boards" && key !== "memo" && key !== "task") {
      return key;
    }
  }
  return null;
};
```

### Step 2: タブ判定ロジックの修正

**対象ファイル**: `apps/web/components/features/team/team-detail.tsx`

`getTabFromURL` 関数でボード判定を追加：

```typescript
const getTabFromURL = () => {
  // 新形式: 値が空のキーがあればボード詳細
  for (const [key, value] of searchParams) {
    if (
      value === "" &&
      ![
        "boards",
        "memo",
        "task",
        "search",
        "team-list",
        "team-settings",
      ].includes(key)
    ) {
      return "board";
    }
  }

  // 既存のロジック...
  if (searchParams.has("board")) return "board";
  // ...
};
```

### Step 3: team-board-detail-wrapper.tsx の修正

**対象ファイル**: `apps/web/components/features/team/team-board-detail-wrapper.tsx`

ボードslug取得を新形式に対応させる。

### Step 4: URL生成箇所の修正

ボードへのリンクを生成している箇所を検索し、新形式でURLを生成するよう修正：

```typescript
// Before
`/team/${teamSlug}?board=${boardSlug}`
// After
`/team/${teamSlug}?${boardSlug}`;
```

### Step 5: 互換性の確保

従来形式 `?board=PETABOO` も引き続き動作するようにする（上記Step 1で対応済み）。

---

## 影響範囲・懸念点

1. **ボードslugの制約**: `boards`, `memo`, `task`, `search` などの予約語と被らないようにする必要あり
2. **テスト**: URL遷移のテストを十分に行う

---

## Codex用ToDoリスト

- [ ] `team-detail.tsx` の `getBoardSlugFromURL` 関数追加
- [ ] `team-detail.tsx` の `getTabFromURL` 関数修正
- [ ] `team-board-detail-wrapper.tsx` のボードslug取得処理修正
- [ ] ボードリンク生成箇所の検索と修正
