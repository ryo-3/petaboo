# PETABOO-44: ?SLUG → ?board=SLUG への切り戻しPlan

> ⚠️ Codexに実装依頼する際は、以下を厳守すること：

- **既存ファイルを丸ごと再生成させないこと**
  → Codexへの依頼は必ず **差分（patch形式）** で行う
- **日本語コメント・文字列を扱う場合はUTF-8前提で依頼すること**
  → 文字化け防止のため明記する
- **Codexに git add / git commit を実行させないこと**
- **完了した場合ファイルを`.claude/fixed-plans` に移動する**

---

## 目的

Next.js の `URLSearchParams` および `router.replace` が値なしパラメータ（`?SLUG`）を `?SLUG=` に変換してしまう問題を回避するため、ボード詳細のURL形式を `?board=SLUG` に戻す。

### 背景

- 現在の形式: `?FFFF&task=1`（値なしパラメータ）
- 問題: Next.js内部で `?FFFF=&task=1` に変換される
- 解決策: `?board=FFFF&task=1` 形式に戻す

---

## 変更範囲

### 1. URL生成箇所（4ファイル）

| ファイル                        | 行                           | 変更内容                      |
| ------------------------------- | ---------------------------- | ----------------------------- |
| `team-detail.tsx`               | 642-644                      | `?${slug}` → `?board=${slug}` |
| `team-board-detail-wrapper.tsx` | 309, 331, 333, 373, 377, 392 | `?${slug}` → `?board=${slug}` |

### 2. URL解析箇所（3ファイル）

| ファイル                 | 変更内容                                                                  |
| ------------------------ | ------------------------------------------------------------------------- |
| `teamUrlUtils.ts`        | `getBoardSlugFromParams()`: 値なしパラメータ判定を削除、`board=`のみ対応  |
| `layout.tsx`             | `getBoardSlugFromParams()` ローカル実装を削除し、共通ユーティリティを使用 |
| `navigation-context.tsx` | 既に `teamUrlUtils.ts` の関数を使用しているため、変更不要                 |

---

## 実装手順

### Step 1: teamUrlUtils.ts の修正

**ファイル**: `apps/web/src/utils/teamUrlUtils.ts`

**変更前（33-47行）**:

```typescript
export function getBoardSlugFromParams(
  searchParams: URLSearchParams,
): string | null {
  // 新形式: 値が空のキー（予約語以外）をボードslugとして扱う
  for (const [key, value] of searchParams.entries()) {
    if (
      value === "" &&
      !RESERVED_KEYS.includes(key as (typeof RESERVED_KEYS)[number])
    ) {
      return key.toUpperCase();
    }
  }
  // 旧形式
  return searchParams.get("board") || searchParams.get("slug");
}
```

**変更後**:

```typescript
export function getBoardSlugFromParams(
  searchParams: URLSearchParams,
): string | null {
  // board= パラメータから取得（slug= は旧形式互換）
  const boardParam = searchParams.get("board") || searchParams.get("slug");
  return boardParam ? boardParam.toUpperCase() : null;
}
```

---

### Step 2: team-detail.tsx の修正

**ファイル**: `apps/web/components/features/team/team-detail.tsx`

**変更前（640-644行）**:

```typescript
} else if (tab === "board" && options?.slug) {
  // 新形式: ?SLUG（board= を省略）
  newUrl = baseParams
    ? `?${options.slug.toUpperCase()}&${baseParams}`
    : `?${options.slug.toUpperCase()}`;
```

**変更後**:

```typescript
} else if (tab === "board" && options?.slug) {
  // ボード詳細: ?board=SLUG
  newUrl = baseParams
    ? `?board=${options.slug.toUpperCase()}&${baseParams}`
    : `?board=${options.slug.toUpperCase()}`;
```

**追加変更（664行）**: `router.replace` に戻す（値なしパラメータがなくなるため安全）

```typescript
// 変更前
window.history.replaceState(null, "", finalUrl);

// 変更後
router.replace(finalUrl, { scroll: false });
```

---

### Step 3: team-board-detail-wrapper.tsx の修正

**ファイル**: `apps/web/components/features/team/team-board-detail-wrapper.tsx`

#### 3-1. handleClearSelection (309行)

```typescript
// 変更前
window.history.replaceState(null, "", `/team/${customUrl}?${slug}`);

// 変更後
router.replace(`/team/${customUrl}?board=${slug}`, { scroll: false });
```

#### 3-2. handleSelectMemo (331, 333行)

```typescript
// 変更前
window.history.replaceState(
  null,
  "",
  `/team/${customUrl}?${slug}&memo=${memo.boardIndex}`,
);
// ...
window.history.replaceState(null, "", `/team/${customUrl}?${slug}`);

// 変更後
router.replace(`/team/${customUrl}?board=${slug}&memo=${memo.boardIndex}`, {
  scroll: false,
});
// ...
router.replace(`/team/${customUrl}?board=${slug}`, { scroll: false });
```

#### 3-3. handleSelectTask (373, 377行)

```typescript
// 変更前
const newUrl = `/team/${customUrl}?${slug}&task=${task.boardIndex}`;
// ...
const newUrl = `/team/${customUrl}?${slug}`;

// 変更後
const newUrl = `/team/${customUrl}?board=${slug}&task=${task.boardIndex}`;
// ...
const newUrl = `/team/${customUrl}?board=${slug}`;
```

**注意**: `router.replace` に戻す

#### 3-4. handleSettings (392行)

```typescript
// 変更前
router.push(`/team/${customUrl}?${slug.toUpperCase()}&settings=true`);

// 変更後
router.push(`/team/${customUrl}?board=${slug.toUpperCase()}&settings=true`);
```

#### 3-5. getCurrentBoardSlugFromUrl 関数の修正

現在の実装を確認して、`board=` パラメータを読み取るように変更:

```typescript
const getCurrentBoardSlugFromUrl = (): string | null => {
  const params = new URLSearchParams(window.location.search);
  return params.get("board")?.toUpperCase() || null;
};
```

---

### Step 4: layout.tsx の修正

**ファイル**: `apps/web/app/team/[customUrl]/layout.tsx`

`getBoardSlugFromParams` ローカル実装（101-122行）を削除し、`teamUrlUtils.ts` からインポート:

```typescript
// 追加インポート
import { getBoardSlugFromParams } from "@/src/utils/teamUrlUtils";

// 削除: ローカルの getBoardSlugFromParams 関数（101-122行）
```

---

### Step 5: navigation-context.tsx の確認

既に `teamUrlUtils.ts` の関数を使用しているため、変更不要。
`getBoardSlugFromParams(searchParams)` の呼び出しは、Step 1の修正で自動的に新形式に対応。

---

## 影響範囲

### 変更が必要なファイル

1. `apps/web/src/utils/teamUrlUtils.ts` - URL解析ロジック
2. `apps/web/components/features/team/team-detail.tsx` - タブ切り替え時のURL生成
3. `apps/web/components/features/team/team-board-detail-wrapper.tsx` - ボード詳細内のURL更新
4. `apps/web/app/team/[customUrl]/layout.tsx` - ローカル関数削除

### 変更不要なファイル（自動対応）

- `navigation-context.tsx` - `teamUrlUtils.ts` を使用済み
- `header.tsx` - 直接URLを生成していない

---

## 副作用・懸念点

1. **既存のブックマーク**: `?SLUG` 形式のURLは動作しなくなる → 旧形式互換として `slug=` パラメータは残す
2. **ブラウザ履歴**: 既存の履歴エントリは `?SLUG=` 形式で保存されている可能性 → 影響軽微
3. **共有リンク**: 既に共有されたリンクが壊れる可能性 → 旧形式互換で対応

---

## テスト項目

- [ ] ボード一覧からボード詳細への遷移: `?boards` → `?board=SLUG`
- [ ] ボード詳細でタスク選択: `?board=SLUG` → `?board=SLUG&task=1`
- [ ] ボード詳細からタスク一覧への遷移: `?board=SLUG&task=1` → `?task`
- [ ] タスク一覧からボード詳細への戻り: `?task` → `?board=SLUG`
- [ ] サイドバーのボード詳細アイコンからの遷移
- [ ] URL直接入力でのアクセス: `/team/test?board=FFFF`
- [ ] ブラウザの戻る/進むボタン

---

## Codex用ToDoリスト

1. [ ] `teamUrlUtils.ts` の `getBoardSlugFromParams()` を修正（値なしパラメータ判定を削除）
2. [ ] `team-detail.tsx` の `handleTabChange` 内のURL生成を修正（`?board=SLUG` 形式に）
3. [ ] `team-detail.tsx` の `router.replace` に戻す
4. [ ] `team-board-detail-wrapper.tsx` の全URL生成箇所を修正（6箇所）
5. [ ] `team-board-detail-wrapper.tsx` の `getCurrentBoardSlugFromUrl` を修正
6. [ ] `team-board-detail-wrapper.tsx` の `window.history.replaceState` を `router.replace` に戻す
7. [ ] `layout.tsx` のローカル `getBoardSlugFromParams` 関数を削除し、インポートに置き換え
8. [ ] 型チェック: `npm run check:wsl`
9. [ ] 動作確認（上記テスト項目）
