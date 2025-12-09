# PETABOO-75: フィルター機能がチームでうまく作動していない

> ⚠️ Codexに実装依頼する際は、以下を厳守すること：

- **既存ファイルを丸ごと再生成させないこと**
  → Codexへの依頼は必ず **差分（patch形式）** で行う
- **日本語コメント・文字列を扱う場合はUTF-8前提で依頼すること**
  → 文字化け防止のため明記する
- **Codexに git add / git commit を実行させないこと**
- **完了した場合ファイルを`.claude/fixed-plans` に移動する**

---

## 問題の概要

チームモードでボードカテゴリーフィルターが正しく動作していない。

## 調査結果

### 原因

`board-category-filter-toggle.tsx` の **filterOptions** に「全て」と「未分類」オプションが含まれていない。

**該当箇所:** [board-category-filter-toggle.tsx:33-51](apps/web/components/features/board-categories/board-category-filter-toggle.tsx#L33-L51)

```typescript
// フィルターオプション作成
const filterOptions = useMemo(() => {
  const options: { value: string; label: string; color: string }[] = [];

  // カテゴリーをsortOrderでソート
  const sortedCategories = [...categories].sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );

  sortedCategories.forEach((category) => {
    options.push({
      value: category.id.toString(),
      label: category.name,
      color: "bg-gray-100",
    });
  });

  return options; // ← 「全て」「未分類」がない！
}, [categories]);
```

### 影響

1. フィルターUIに「全て」「未分類」オプションが表示されない
2. カテゴリーのみがフィルターオプションとして表示される
3. フィルター解除（「全て」に戻す）ができない

### API/フック側

- API側（`board-categories/api.ts`）: 正常に動作（チームモード対応済み）
- フック側（`use-board-categories.ts`）: 正常に動作（teamIdパラメータ対応済み）
- フィルターロジック（`use-board-category-filter.ts`）: 正常に動作

---

## 実装計画

### 変更ファイル

1. `apps/web/components/features/board-categories/board-category-filter-toggle.tsx`

### 修正内容

#### Step 1: filterOptionsに「全て」と「未分類」を追加

**修正箇所:** 33-51行目

```typescript
// フィルターオプション作成
const filterOptions = useMemo(() => {
  const options: { value: string; label: string; color: string }[] = [
    { value: "all", label: "全て", color: "bg-gray-100" },
    { value: "uncategorized", label: "未分類", color: "bg-gray-100" },
  ];

  // カテゴリーをsortOrderでソート
  const sortedCategories = [...categories].sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );

  sortedCategories.forEach((category) => {
    options.push({
      value: category.id.toString(),
      label: category.name,
      color: "bg-gray-100",
    });
  });

  return options;
}, [categories]);
```

---

## Codex用ToDoリスト

- [ ] `apps/web/components/features/board-categories/board-category-filter-toggle.tsx` の filterOptions に「全て」と「未分類」オプションを追加
  - 34行目の空配列初期化を、「全て」「未分類」を含む配列に変更

---

## 確認事項

- [ ] チームモードでフィルターボタンをクリックすると「全て」「未分類」が表示される
- [ ] 「全て」を選択するとすべてのタスクが表示される
- [ ] 「未分類」を選択するとカテゴリー未設定のタスクのみが表示される
- [ ] 特定のカテゴリーを選択するとそのカテゴリーのタスクのみが表示される
- [ ] 個人モードでも同様に動作する
