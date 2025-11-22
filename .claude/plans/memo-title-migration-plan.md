# メモのtitle自動生成プラン【改訂版：フロント側のみ修正】

## 📌 背景・目的

### 現状の問題

- tiptapエディタで入力した内容の1行目を`title`に保存している
- HTMLマークアップ込みで保存されるため、文字数制限（200文字）を簡単に超過する
- `title`と`content`に同じ内容が重複して保存される
- **メモの性質上、タイトルを別管理する必要性がない**

### 新しい目標（方針変更）

- **DB・APIは一切変更しない**（本番環境への影響ゼロ）
- **フロント側のみ**で、表示時に`content`から1行目を抽出してタイトルとして使う
- **保存時は自動生成**したtitleをAPIに送信（API側は従来通り受け取る）
- **既存データもそのまま使える**

---

## 🎯 新しい移行戦略

### ストラテジー: **フロントエンド表示・入力層のみ修正**

**メリット:**

1. **本番DBへの影響ゼロ**（最重要！）
2. **本番APIへの影響ゼロ**（既存の動作を維持）
3. **既存データがそのまま使える**
4. **ロールバックが容易**（フロント側だけ戻せばOK）
5. **コードがシンプル**（複雑な分岐が不要）

**デメリット:**

- titleフィールドは残り続ける（ただし将来的に削除可能）

---

## 📦 実装内容

### ✅ フェーズ1: ユーティリティ関数作成（完了）

**新規作成:** `apps/web/src/utils/html.ts` に追加

```typescript
export function extractFirstLine(
  content: string | null | undefined,
  maxLength: number = 200,
): string {
  if (!content || content.trim() === "") {
    return "無題";
  }
  const plainText = stripHtmlTags(content);
  const firstLine = plainText.split("\n")[0] || "";
  const trimmed = firstLine.trim();
  return trimmed.slice(0, maxLength) || "無題";
}
```

---

### 🔧 フェーズ2: 表示コンポーネント修正

#### 2.1 一覧カード表示

**ファイル:** `apps/web/components/ui/layout/item-card.tsx`

**変更内容:**

```typescript
// 修正前
const title = item.title;

// 修正後
const title =
  itemType === "memo" ? extractFirstLine(memo?.content) : item.title;
```

#### 2.2 削除済みメモ一覧

**ファイル:** `apps/web/components/features/memo/deleted-memo-list.tsx`

**変更内容:**

```typescript
// 修正前
<span>{memo.title}</span>

// 修正後
<span>{extractFirstLine(memo.content)}</span>
```

#### 2.3 検索結果表示

**ファイル:** `apps/web/components/shared/search-results.tsx`

**変更内容:**

```typescript
// 修正前
const title = result.item.title;

// 修正後
const title =
  result.type === "memo"
    ? extractFirstLine(result.item.content || "")
    : result.item.title || result.item.description;
```

#### 2.4 共有メモページ

**ファイル:** `apps/web/app/share/[teamId]/memo/[uuid]/page.tsx`

**変更内容:**

```typescript
// 修正前
<h1>{memo.title}</h1>

// 修正後
<h1>{extractFirstLine(memo.content)}</h1>
```

---

### 💾 フェーズ3: 保存処理修正

#### 3.1 メインの保存処理

**ファイル:** `apps/web/src/hooks/use-simple-item-save.ts`

**変更内容:**

保存時に、メモの場合は `content` から1行目を抽出して `title` に設定

```typescript
// メモの更新データ作成時
const updateData =
  itemType === "memo"
    ? {
        title: extractFirstLine(content) || "無題", // 追加
        content: content.trim() || "",
      }
    : {
        /* タスクの処理 */
      };

// メモの作成データ作成時
const createData =
  itemType === "memo"
    ? {
        title: extractFirstLine(content) || "無題", // 追加
        content: content.trim() || undefined,
      }
    : {
        /* タスクの処理 */
      };
```

#### 3.2 その他の保存処理

同様の修正を以下にも適用：

- `apps/web/src/hooks/use-simple-memo-save.ts`
- `apps/web/src/hooks/use-memo-form.ts`
- `apps/web/src/hooks/use-memos.ts`（キャッシュ更新部分）

---

### 🔍 フェーズ4: 検索・エクスポート修正

#### 4.1 検索機能

**ファイル:** `apps/web/src/hooks/use-global-search.ts`

**変更内容:**

タイトル検索時に `content` から1行目を抽出して検索

```typescript
// メモのタイトル検索
const searchableTitle = extractFirstLine(memo.content);

if (
  (searchScope === "all" || searchScope === "title") &&
  searchInText(searchableTitle)
) {
  matched = true;
  matchedField = "title";
  snippet = createSnippet(searchableTitle, searchTerm);
}
```

#### 4.2 エクスポート機能

**ファイル:** `apps/web/src/hooks/use-export.ts`

**変更内容:**

```typescript
// CSVエクスポート時
const title = extractFirstLine(memo.content);
const csvRow = `"${title}","${memo.content || ""}"`;
```

---

### 📥 フェーズ5: CSVインポート修正

#### 5.1 メモCSVインポート

**ファイル:** `apps/web/components/features/memo/memo-csv-import.tsx`

**変更内容:**

CSV 1列目（タイトル）を `content` の先頭に追加し、`title` にも設定

```typescript
// インポート時
const title = values[0];
const content = values[1] || "";
const fullContent = title ? `${title}\n${content}` : content;

// API送信データ
{
  title: title || "無題",
  content: fullContent,
}
```

#### 5.2 ボードCSVインポート

**ファイル:** `apps/web/components/features/board/csv-import-modal.tsx`

**変更内容:**

バリデーション・エラーメッセージで `item.title` を使用している箇所を修正

```typescript
// 修正前
`${item.title} にエラーがあります`
// 修正後
`${item.itemType === "memo" ? extractFirstLine(item.content) : item.title} にエラーがあります`;
```

---

## 📝 実装チェックリスト

### ✅ フェーズ1: ユーティリティ（完了）

- [x] `extractFirstLine` 関数作成

### フェーズ2: 表示コンポーネント

- [ ] `item-card.tsx` - 一覧カード表示
- [ ] `deleted-memo-list.tsx` - 削除済み一覧
- [ ] `search-results.tsx` - 検索結果表示
- [ ] `share/[teamId]/memo/[uuid]/page.tsx` - 共有ページ

### フェーズ3: 保存処理

- [ ] `use-simple-item-save.ts` - メイン保存処理
- [ ] `use-simple-memo-save.ts` - メモ専用保存処理
- [ ] `use-memo-form.ts` - メモフォーム
- [ ] `use-memos.ts` - キャッシュ更新

### フェーズ4: 検索・エクスポート

- [ ] `use-global-search.ts` - 検索機能
- [ ] `use-export.ts` - エクスポート機能

### フェーズ5: CSVインポート

- [ ] `memo-csv-import.tsx` - メモインポート
- [ ] `csv-import-modal.tsx` - ボードインポート

### 最終確認

- [ ] 型チェック成功 (`npm run check:wsl`)
- [ ] 動作確認（新規作成・編集・削除・検索）
- [ ] CSV Import/Export 動作確認

---

## 🧪 テストケース

### 基本動作

- [ ] メモ新規作成 → contentから1行目が自動でtitleになる
- [ ] メモ編集 → 保存時にtitleが自動更新される
- [ ] メモ一覧 → contentの1行目が表示される
- [ ] 空メモ → "無題"と表示される
- [ ] 長いメモ → 200文字に制限される
- [ ] HTMLタグ含むメモ → タグが除去されて表示される

### 検索機能

- [ ] タイトル検索 → contentの1行目で検索
- [ ] 内容検索 → content全体で検索
- [ ] 削除済みメモ検索

### インポート・エクスポート

- [ ] CSVエクスポート → contentから1行目を抽出
- [ ] CSVインポート → タイトル列をcontentの先頭に追加

---

## ⚠️ リスク・注意事項

### リスク1: API側でtitleが空の場合の処理

**対策:**

- フロント側で必ず `title` を生成してから送信
- 空の場合は "無題" を設定

### リスク2: 既存のtitleデータとの不整合

**対策:**

- 表示は常に `extractFirstLine(content)` を使用
- 既存の `title` は無視（ただしDBには残る）

### リスク3: 検索パフォーマンス

**対策:**

- `extractFirstLine` は軽量な処理
- 必要に応じてメモ化を検討

---

## 🔄 ロールバック計画

各フェーズでロールバック可能：

### フェーズ2-5（表示・保存修正後）

```bash
# 前のコミットをrevert
git revert <commit-hash>
```

### メリット

- DB・APIは無変更なので、フロント側を戻すだけでOK
- データ損失リスクなし

---

## 📊 進捗管理

| フェーズ  | 状態      | 備考                     |
| --------- | --------- | ------------------------ |
| フェーズ1 | ✅ 完了   | extractFirstLine関数作成 |
| フェーズ2 | 🟡 進行中 | 表示コンポーネント修正   |
| フェーズ3 | 🔴 未着手 | 保存処理修正             |
| フェーズ4 | 🔴 未着手 | 検索・エクスポート修正   |
| フェーズ5 | 🔴 未着手 | CSVインポート修正        |

---

## 📝 次のアクション

1. **フェーズ2から順次実施**
2. **各フェーズ完了後、動作確認**
3. **全フェーズ完了後、統合テスト**

---

## 🌟 将来的な発展

このアプローチの利点は、将来的にDB・APIから `title` を削除する際も、フロント側は既に対応済みなので影響が少ないこと。

必要に応じて、後から以下の作業を追加可能：

1. API側を `title` オプショナルに変更
2. DB から `title` カラムを削除

ただし、現時点では**不要**（フロント側だけで十分）

---

最終更新: 2025-11-22
作成者: Claude Code
方針: DB/API変更なし、フロント側のみ修正
