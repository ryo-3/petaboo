# URL簡略化: `tab`パラメータ削除

**作成日**: 2025-11-27
**目的**: チームページのURLから冗長な`tab`パラメータを削除し、URLを簡潔にする

---

## ⚠️ Codexに実装依頼する際の注意事項

- **既存ファイルを丸ごと再生成させないこと**
  → Codexへの依頼は必ず **差分（patch形式）** で行う
- **日本語コメント・文字列を扱う場合はUTF-8前提で依頼すること**
  → 文字化け防止のため明記する
- **Codexに git add / git commit を実行させないこと**
- **完了した場合ファイルを`.claude/fixed-plans` に移動する**

---

## 📋 目的・背景

### 現在のURL

```
/team/test?tab=tasks
/team/test?tab=memos
/team/test?tab=board&slug=aaa
/team/test?tab=tasks&task=2
/team/test?tab=board&slug=aaa&task=2
```

### 問題点

- `tab=` パラメータが冗長
- URLが長い
- 他のパラメータから自動判定可能

### 新しいURL

```
/team/test                    → タスク一覧（デフォルト）
/team/test?memos             → メモ一覧
/team/test?task=2            → タスク詳細
/team/test?board=aaa         → ボード
/team/test?board=aaa&task=2  → ボード内のタスク
```

---

## 🎯 実装方針

### タブ判定ロジック（新）

```typescript
const getActiveTab = () => {
  // パラメータの存在から自動判定
  if (searchParams.has("board")) return "board";
  if (searchParams.has("memos")) return "memos";
  if (searchParams.has("boards")) return "boards";

  // 旧形式の互換性対応
  const tab = searchParams.get("tab");
  if (tab) return tab;

  // デフォルトはタスク
  return "tasks";
};
```

### URL生成ロジック（新）

```typescript
const handleTabChange = (tab: string, options?: { slug?: string }) => {
  const params = new URLSearchParams(searchParams.toString());

  // tabパラメータは削除
  params.delete("tab");

  // タブに応じた新しいパラメータを設定
  if (tab === "memos") {
    params.set("memos", "true");
    // 不要なパラメータ削除
    params.delete("board");
    params.delete("boards");
  } else if (tab === "boards") {
    params.set("boards", "true");
    params.delete("memos");
    params.delete("board");
  } else if (tab === "board" && options?.slug) {
    params.set("board", options.slug);
    params.delete("memos");
    params.delete("boards");
    params.delete("slug"); // slugも削除（boardに統合）
  } else if (tab === "tasks") {
    // tasksはデフォルトなのでパラメータ不要
    params.delete("memos");
    params.delete("board");
    params.delete("boards");
  }

  router.replace(`${pathname}?${params.toString()}`);
};
```

---

## 📂 変更対象ファイル

### 1. **team-detail.tsx** (主要)

- **場所**: `components/features/team/team-detail.tsx`
- **変更箇所**:
  - `getTabFromURL()` 関数（277行目付近）
  - `handleTabChange()` 関数（386行目付近）
  - 後方互換性のリダイレクト処理（335行目付近）

### 2. **team-detail-context.tsx**

- **場所**: `src/contexts/team-detail-context.tsx`
- **変更箇所**:
  - `getInitialTab()` 関数（68行目付近）

### 3. **urlUtils.ts**

- **場所**: `src/utils/urlUtils.ts`
- **変更箇所**:
  - URL生成関数（37行目付近）

### 4. **その他の参照箇所**

- `team-board-detail-wrapper.tsx` (324行目)
- `notification-list.tsx` (72行目)

---

## 🔄 後方互換性の保証

### リダイレクト処理

```typescript
// 旧形式のURLを新形式に自動変換
useEffect(() => {
  const tab = searchParams.get("tab");
  const slug = searchParams.get("slug");

  if (tab) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("tab");

    // 新形式に変換
    if (tab === "board" && slug) {
      params.set("board", slug);
      params.delete("slug");
    } else if (tab === "memos") {
      params.set("memos", "true");
    } else if (tab === "boards") {
      params.set("boards", "true");
    }
    // tasksはデフォルトなので何もしない

    router.replace(`${pathname}?${params.toString()}`);
  }
}, [searchParams]);
```

---

## ✅ テストケース

### URL変換テスト

| 旧URL                        | 新URL               | 期待動作                 |
| ---------------------------- | ------------------- | ------------------------ |
| `?tab=tasks`                 | `/team/test`        | タスク一覧表示           |
| `?tab=memos`                 | `?memos=true`       | メモ一覧表示             |
| `?tab=board&slug=aaa`        | `?board=aaa`        | ボードaaa表示            |
| `?tab=tasks&task=2`          | `?task=2`           | タスク2の詳細表示        |
| `?tab=board&slug=aaa&task=2` | `?board=aaa&task=2` | ボードaaa内のタスク2表示 |

### 後方互換性テスト

| 入力URL                         | リダイレクト先          |
| ------------------------------- | ----------------------- |
| `/team/test?tab=memos`          | `/team/test?memos=true` |
| `/team/test?tab=board&slug=aaa` | `/team/test?board=aaa`  |

---

## 📝 実装手順

1. **`team-detail.tsx` の `getTabFromURL` 関数を修正**
   - 新しい判定ロジックに変更
   - 後方互換性のため旧形式も対応

2. **`team-detail.tsx` の `handleTabChange` 関数を修正**
   - `tab` パラメータの代わりに適切なパラメータを設定
   - `slug` を `board` に統合

3. **後方互換性のリダイレクト処理を追加**
   - 旧URLを新URLに自動変換

4. **その他の参照箇所を修正**
   - `urlUtils.ts`
   - `team-board-detail-wrapper.tsx`
   - `notification-list.tsx`

5. **動作確認**
   - 各タブ切り替えが正常に動作するか
   - URLが正しく生成されるか
   - 旧URLからのリダイレクトが動作するか

---

## ⚠️ 注意事項

- **既存のブックマーク・共有リンクは後方互換性処理で対応**
- **通知からのリンクも修正が必要**
- **モバイル・デスクトップ両方でテスト**

---

## 🎉 期待される効果

- URLが平均10文字以上短縮
- 意味が明確になる（`board=aaa` は `tab=board&slug=aaa` より直感的）
- 可読性・共有性の向上

---

**最終更新**: 2025-11-27
