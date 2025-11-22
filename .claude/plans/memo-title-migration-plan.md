# メモのtitleフィールド完全削除・移行プラン

## 📌 背景・目的

### 現状の問題

- tiptapエディタで入力した内容の1行目を`title`に保存している
- HTMLマークアップ込みで保存されるため、文字数制限（200文字）を簡単に超過する
- `title`と`content`に同じ内容が重複して保存される
- **メモの性質上、タイトルを別管理する必要性がない**

### 目標

- **メモは`content`のみで管理**し、表示時に1行目を抽出する
- **`title`フィールドを完全に削除**する
- 既存データとの互換性を保ちながら段階的に移行する
- **個人メモとチームメモの両方に対応**する

---

## 🔍 影響範囲調査結果

### 1. データベース（4テーブル）

#### 個人メモ

- **`memos`**: `title text NOT NULL` → **削除**
- **`deleted_memos`**: `title text NOT NULL` → **削除**

#### チームメモ

- **`team_memos`**: `title text NOT NULL` → **削除**
- **`team_deleted_memos`**: `title text NOT NULL` → **削除**

### 2. API（個人・チーム共通構造）

#### 個人メモAPI: `/apps/api/src/routes/memos/route.ts`

- スキーマ定義: `title: z.string()`
- バリデーション: `title: z.string().min(1).max(200)`
- CRUD処理で使用
- CSVインポート: titleカラム必須

#### チームメモAPI: `/apps/api/src/routes/teams/memos.ts`

- スキーマ定義: `title: z.string()`
- バリデーション: `title: z.string().min(1).max(200)`
- CRUD処理で使用
- アクティビティログに`targetTitle`として記録

#### その他（個人・チーム共通）

- `/apps/api/src/routes/comments/api.ts`: コメント関連
- `/apps/api/src/routes/teams/share.ts`: 共有機能
- `/apps/api/src/routes/teams/boards.ts`: ボード機能
- `/apps/api/src/utils/activity-logger.ts`: アクティビティログ

### 3. フロントエンド（個人・チーム共通）

#### 型定義

- `/apps/web/src/types/memo.ts`: `Memo`型, `DeletedMemo`型
  - **個人メモもチームメモも同じ型を使用**

#### 表示系

- `/apps/web/components/ui/layout/item-card.tsx`: 一覧表示（共通）
- `/apps/web/components/features/memo/deleted-memo-list.tsx`: 削除済み一覧
- `/apps/web/components/screens/search-screen.tsx`: 検索結果表示
- `/apps/web/components/shared/search-results.tsx`: 検索結果

#### 機能系

- `/apps/web/src/hooks/use-global-search.ts`: **検索機能（title検索）**
- `/apps/web/src/hooks/use-memos.ts`: CRUD操作
- `/apps/web/src/hooks/use-simple-item-save.ts`: **保存処理**
- `/apps/web/src/hooks/use-export.ts`: エクスポート

#### データ入力系

- `/apps/web/components/features/memo/memo-csv-import.tsx`: CSVインポート
- `/apps/web/components/features/board/csv-import-modal.tsx`: ボードCSVインポート

---

## 🎯 移行戦略

### ストラテジー: **段階的移行（Gradual Migration）**

理由:

- 既存データへの影響を最小化
- 各段階でテスト・検証が可能
- 問題発生時にロールバック可能
- **個人メモとチームメモを同時に対応**

---

## 📦 フェーズ分け

### 🏗️ フェーズ1: DBスキーマ変更（1-2日）

**目的**: DBから`title`カラムを完全削除

#### 作業内容

##### 1.1 マイグレーションスクリプト作成

**重要**: SQLiteは`ALTER TABLE DROP COLUMN`に対応していないため、テーブル再作成が必要

```sql
-- ============================================
-- 個人メモ: memosテーブル
-- ============================================

-- 1. 新テーブル作成（title無し）
CREATE TABLE memos_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  original_id TEXT NOT NULL,
  uuid TEXT,
  content TEXT,
  category_id INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER
);

-- 2. データ移行（titleを除く）
INSERT INTO memos_new (
  id, user_id, original_id, uuid, content,
  category_id, created_at, updated_at
)
SELECT
  id, user_id, original_id, uuid, content,
  category_id, created_at, updated_at
FROM memos;

-- 3. 旧テーブル削除
DROP TABLE memos;

-- 4. テーブル名変更
ALTER TABLE memos_new RENAME TO memos;

-- ============================================
-- 個人・削除済みメモ: deleted_memosテーブル
-- ============================================

CREATE TABLE deleted_memos_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  original_id TEXT NOT NULL,
  uuid TEXT,
  content TEXT,
  category_id INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER,
  deleted_at INTEGER NOT NULL
);

INSERT INTO deleted_memos_new (
  id, user_id, original_id, uuid, content,
  category_id, created_at, updated_at, deleted_at
)
SELECT
  id, user_id, original_id, uuid, content,
  category_id, created_at, updated_at, deleted_at
FROM deleted_memos;

DROP TABLE deleted_memos;
ALTER TABLE deleted_memos_new RENAME TO deleted_memos;

-- ============================================
-- チームメモ: team_memosテーブル
-- ============================================

CREATE TABLE team_memos_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  team_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  original_id TEXT NOT NULL,
  uuid TEXT,
  content TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER
);

INSERT INTO team_memos_new (
  id, team_id, user_id, original_id, uuid, content,
  created_at, updated_at
)
SELECT
  id, team_id, user_id, original_id, uuid, content,
  created_at, updated_at
FROM team_memos;

DROP TABLE team_memos;
ALTER TABLE team_memos_new RENAME TO team_memos;

-- ============================================
-- チーム・削除済みメモ: team_deleted_memosテーブル
-- ============================================

CREATE TABLE team_deleted_memos_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  team_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  original_id TEXT NOT NULL,
  uuid TEXT,
  content TEXT,
  category_id INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER,
  deleted_at INTEGER NOT NULL
);

INSERT INTO team_deleted_memos_new (
  id, team_id, user_id, original_id, uuid, content,
  category_id, created_at, updated_at, deleted_at
)
SELECT
  id, team_id, user_id, original_id, uuid, content,
  category_id, created_at, updated_at, deleted_at
FROM team_deleted_memos;

DROP TABLE team_deleted_memos;
ALTER TABLE team_deleted_memos_new RENAME TO team_deleted_memos;
```

##### 1.2 DBスキーマ定義変更

**個人メモ**: `apps/api/src/db/schema/memos.ts`

```typescript
export const memos = sqliteTable("memos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull(),
  originalId: text("original_id").notNull(),
  uuid: text("uuid"),
  // title: text("title").notNull(), // ← 削除
  content: text("content"),
  categoryId: integer("category_id"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at"),
});

export const deletedMemos = sqliteTable("deleted_memos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull(),
  originalId: text("original_id").notNull(),
  uuid: text("uuid"),
  // title: text("title").notNull(), // ← 削除
  content: text("content"),
  categoryId: integer("category_id"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at"),
  deletedAt: integer("deleted_at").notNull(),
});
```

**チームメモ**: `apps/api/src/db/schema/team/memos.ts`

```typescript
export const teamMemos = sqliteTable("team_memos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  teamId: integer("team_id").notNull(),
  userId: text("user_id").notNull(),
  originalId: text("original_id").notNull(),
  uuid: text("uuid"),
  // title: text("title").notNull(), // ← 削除
  content: text("content"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at"),
});

export const teamDeletedMemos = sqliteTable("team_deleted_memos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  teamId: integer("team_id").notNull(),
  userId: text("user_id").notNull(),
  originalId: text("original_id").notNull(),
  uuid: text("uuid"),
  // title: text("title").notNull(), // ← 削除
  content: text("content"),
  categoryId: integer("category_id"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at"),
  deletedAt: integer("deleted_at").notNull(),
});
```

#### 影響範囲

- 🔴 影響: 大（DB構造変更）
- 🟡 リスク: 中（テーブル再作成）
- 🟡 時間: 3-4時間（慎重に）
- 🟡 テスト: 重要

#### 完了条件

- [ ] マイグレーションスクリプト作成・ローカルテスト
- [ ] スキーマ定義更新（4テーブル）
- [ ] ローカル環境で動作確認
- [ ] 既存データが正常に移行された

---

### 🔧 フェーズ2: API修正（2-3日）

**目的**: APIから`title`フィールドを削除し、contentから抽出

#### 作業内容

##### 2.1 ユーティリティ関数追加

`apps/api/src/utils/content-utils.ts` (新規作成)

```typescript
/**
 * HTMLコンテンツから最初の行をプレーンテキストで抽出
 */
export function extractFirstLine(html: string | null | undefined): string {
  if (!html) return "無題";

  // HTMLタグを除去
  const plainText = html.replace(/<[^>]*>/g, "");

  // 最初の行を取得
  const firstLine = plainText.split("\n")[0] || "";

  // 空白を除去して最大200文字に制限
  const trimmed = firstLine.trim();
  return trimmed.slice(0, 200) || "無題";
}
```

##### 2.2 個人メモAPI修正: `/apps/api/src/routes/memos/route.ts`

```typescript
// スキーマ定義（titleを削除）
const MemoSchema = z.object({
  id: z.number(),
  originalId: z.string(),
  // title: z.string(), // ← 削除
  content: z.string().nullable(),
  createdAt: z.number(),
  updatedAt: z.number().nullable(),
});

// 入力スキーマ（titleを削除）
const MemoInputSchema = z.object({
  // title: z.string().min(1).max(200), // ← 削除
  content: z.string().max(10000, "内容は10,000文字以内で入力してください").optional(),
});

// 作成処理
app.openapi(createRoute({...}), async (c) => {
  // ...
  const { content } = parsed.data; // titleを削除

  const result = await db.insert(memos).values({
    userId: auth.userId,
    originalId: "",
    uuid: generateUuid(),
    // title, // ← 削除
    content,
    createdAt,
  });
  // ...
});

// 更新処理
app.openapi(createRoute({...}), async (c) => {
  // ...
  const { content } = parsed.data; // titleを削除

  await db.update(memos).set({
    // title, // ← 削除
    content,
    updatedAt: Math.floor(Date.now() / 1000),
  });
  // ...
});

// CSVインポート修正
function parseCSV(csvText: string): { content: string }[] {
  // titleカラムを使わず、contentのみ
  // または: titleカラムがある場合はcontentの先頭に追加
}
```

##### 2.3 チームメモAPI修正: `/apps/api/src/routes/teams/memos.ts`

```typescript
import { extractFirstLine } from "../../utils/content-utils";

// スキーマ定義（titleを削除）
const TeamMemoSchema = z.object({
  id: z.number(),
  teamId: z.number(),
  userId: z.string(),
  originalId: z.string(),
  uuid: z.string().nullable(),
  // title: z.string(), // ← 削除
  content: z.string().nullable(),
  createdAt: z.number(),
  updatedAt: z.number().nullable(),
  createdBy: z.string().nullable(),
  avatarColor: z.string().nullable(),
  commentCount: z.number().optional(),
});

// 入力スキーマ（titleを削除）
const TeamMemoInputSchema = z.object({
  // title: z.string().min(1).max(200), // ← 削除
  content: z.string().max(10000, "内容は10,000文字以内で入力してください").optional(),
});

// 作成処理
app.openapi(createRoute({...}), async (c) => {
  // ...
  const { content } = parsed.data; // titleを削除

  const result = await db.insert(teamMemos).values({
    teamId,
    userId: auth.userId,
    originalId: "",
    uuid: generateUuid(),
    // title, // ← 削除
    content,
    createdAt,
  });

  // アクティビティログ: contentから1行目を抽出
  await logActivity({
    db,
    teamId,
    userId: auth.userId,
    actionType: "memo_created",
    targetType: "memo",
    targetId: originalId,
    targetTitle: extractFirstLine(content), // ← contentから抽出
  });
  // ...
});

// 更新処理
app.openapi(createRoute({...}), async (c) => {
  // ...
  const { content } = parsed.data; // titleを削除

  await db.update(teamMemos).set({
    // title, // ← 削除
    content,
    updatedAt: Math.floor(Date.now() / 1000),
  });
  // ...
});
```

#### 影響範囲

- 🔴 影響: 大（API全体）
- 🟡 リスク: 中
- 🔴 時間: 4-5時間
- 🔴 テスト: 重要

#### 完了条件

- [ ] ユーティリティ関数作成・テスト
- [ ] 個人メモAPI修正（CRUD、CSV）
- [ ] チームメモAPI修正（CRUD、アクティビティログ）
- [ ] バリデーション正常動作
- [ ] API型チェック成功

---

### 🎨 フェーズ3: フロントエンド修正（2-3日）

**目的**: フロントエンドから`title`を削除し、contentから抽出

#### 作業内容

##### 3.1 ユーティリティ関数追加

`apps/web/src/utils/html.ts` に追加:

```typescript
/**
 * HTMLコンテンツから最初の行をプレーンテキストで抽出
 * @param html - HTMLコンテンツ
 * @param maxLength - 最大文字数（デフォルト200）
 * @returns プレーンテキストの1行目
 */
export function extractFirstLine(
  html: string | null | undefined,
  maxLength: number = 200,
): string {
  if (!html) return "無題";

  // HTMLタグを除去
  const plainText = stripHtmlTags(html);

  // 最初の行を取得
  const firstLine = plainText.split("\n")[0] || "";

  // 空白を除去して指定文字数に制限
  const trimmed = firstLine.trim();
  return trimmed.slice(0, maxLength) || "無題";
}
```

##### 3.2 型定義修正

`apps/web/src/types/memo.ts`:

```typescript
export interface Memo {
  id: number;
  userId: string;
  originalId: OriginalId;
  uuid?: string;
  // title: string; // ← 削除
  content: string | null;
  categoryId?: number | null;
  createdAt: number;
  updatedAt?: number | null;
  commentCount?: number;
  // チームメモ用
  teamId?: number;
  createdBy?: string | null;
  avatarColor?: string | null;
}

export interface DeletedMemo {
  id: number;
  userId?: string;
  originalId: OriginalId;
  uuid?: string;
  // title: string; // ← 削除
  content: string | null;
  categoryId?: number | null;
  createdAt: number;
  updatedAt?: number | null;
  deletedAt: number;
  commentCount?: number;
  // チームメモ用
  teamId?: number;
}
```

##### 3.3 保存処理修正

`apps/web/src/hooks/use-simple-item-save.ts`:

```typescript
// title stateを削除
// const [title, setTitle] = useState(() => item?.title || "");

// 保存時はcontentのみ
const updateData = itemType === "memo"
  ? {
      // title: title.trim() || "無題", // ← 削除
      content: content.trim() || "",
    }
  : // ...

const createData = itemType === "memo"
  ? {
      // title: title.trim() || "無題", // ← 削除
      content: content.trim() || undefined,
    }
  : // ...
```

`apps/web/components/features/memo/memo-editor.tsx`:

```typescript
// titleの更新処理を削除
onChange={(newContent) => {
  // const firstLine = newContent.split("\n")[0] || "";
  // handleTitleChange(firstLine); // ← 削除
  handleContentChange(newContent);
}}
```

##### 3.4 表示処理修正

`apps/web/components/ui/layout/item-card.tsx`:

```typescript
import { extractFirstLine } from "@/src/utils/html";

// メモのタイトルをcontentから抽出
const displayTitle = memo ? extractFirstLine(memo.content) : "";

// 表示
<div
  className="..."
  dangerouslySetInnerHTML={{
    __html: isTask ? taskTitle : displayTitle,
  }}
/>
```

`apps/web/components/features/memo/deleted-memo-list.tsx`:

```typescript
import { extractFirstLine } from "@/src/utils/html";

// タイトル表示
<span>{extractFirstLine(memo.content)}</span>
```

##### 3.5 検索機能修正

`apps/web/src/hooks/use-global-search.ts`:

```typescript
import { extractFirstLine } from "@/src/utils/html";

// メモ検索
memos?.forEach((memo: Memo) => {
  let matched = false;
  let matchedField: "title" | "content" = "content";
  let snippet = "";

  // タイトル検索: contentから1行目を抽出
  const searchableTitle = extractFirstLine(memo.content);

  if (
    (searchScope === "all" || searchScope === "title") &&
    searchInText(searchableTitle)
  ) {
    matched = true;
    matchedField = "title";
    snippet = createSnippet(searchableTitle, searchTerm);
  } else if (
    (searchScope === "all" || searchScope === "content") &&
    memo.content &&
    searchInText(memo.content)
  ) {
    matched = true;
    matchedField = "content";
    snippet = createSnippet(memo.content, searchTerm);
  }
  // ...
});
```

##### 3.6 エクスポート機能修正

`apps/web/src/hooks/use-export.ts`:

```typescript
import { extractFirstLine } from "@/src/utils/html";

// CSVエクスポート時
const title = extractFirstLine(memo.content);
const csvRow = `"${title}","${memo.content || ""}"`;
```

#### 影響範囲

- 🔴 影響: 大（フロントエンド全体）
- 🟡 リスク: 中
- 🔴 時間: 5-6時間
- 🔴 テスト: 重要

#### 完了条件

- [ ] ユーティリティ関数作成・テスト
- [ ] 型定義修正（Memo, DeletedMemo）
- [ ] 保存処理修正（title state削除）
- [ ] 表示処理修正（contentから抽出）
- [ ] 検索機能修正
- [ ] エクスポート機能修正
- [ ] 型チェック成功
- [ ] Lint成功

---

### 🧪 フェーズ4: 統合テスト（1-2日）

**目的**: 個人メモ・チームメモの全機能を検証

#### テストケース

##### 4.1 個人メモ - 基本CRUD

- [ ] 新規メモ作成（content のみ）
- [ ] メモ更新（content のみ）
- [ ] メモ取得（表示時にtitle抽出）
- [ ] メモ削除
- [ ] 削除済みメモ復元

##### 4.2 チームメモ - 基本CRUD

- [ ] 新規チームメモ作成
- [ ] チームメモ更新
- [ ] チームメモ取得
- [ ] チームメモ削除
- [ ] 削除済みチームメモ復元

##### 4.3 表示機能（個人・チーム共通）

- [ ] 一覧表示（contentから1行目抽出）
- [ ] 詳細表示
- [ ] 削除済み一覧
- [ ] 空メモの表示（"無題"と表示）
- [ ] 長いメモの表示（200文字制限）

##### 4.4 検索機能（個人・チーム共通）

- [ ] タイトル検索（contentから抽出）
- [ ] 内容検索
- [ ] 複合検索
- [ ] 削除済みメモ検索

##### 4.5 その他機能

- [ ] CSV Import/Export
- [ ] ボード機能
- [ ] 共有機能（チームのみ）
- [ ] アクティビティログ（チームのみ）
- [ ] コメント機能

##### 4.6 互換性確認

- [ ] マイグレーション前のデータが正常に表示される
- [ ] 空contentのメモが「無題」と表示される
- [ ] HTMLマークアップを含むcontentが正常に処理される

#### パフォーマンステスト

- [ ] 大量メモ（1000件以上）での表示速度
- [ ] 検索速度（extractFirstLine の実行回数を最小化）

#### 完了条件

- [ ] 全テストケース合格
- [ ] パフォーマンス問題なし
- [ ] エラーログなし
- [ ] 個人メモ・チームメモ両方で正常動作

---

### 🚀 フェーズ5: デプロイ・監視（1日+継続）

**目的**: 本番環境への展開と監視

#### 作業内容

##### 5.1 デプロイ準備

1. **バックアップ作成**

   ```bash
   # DBバックアップ（本番環境）
   npx wrangler d1 export DB --output backup-before-migration.sql
   ```

2. **ステージング環境でテスト**
   - DBマイグレーション実行
   - 全機能動作確認

##### 5.2 本番デプロイ

**デプロイ手順**:

1. メンテナンスモード ON（オプション）
2. DBマイグレーション実行
3. API デプロイ
4. フロントエンド デプロイ
5. 動作確認
6. メンテナンスモード OFF

```bash
# マイグレーション実行（本番）
npx wrangler d1 migrations apply DB --remote

# デプロイ
npm run deploy:api
npm run deploy:web
```

##### 5.3 監視

- エラーログ監視（1週間）
- パフォーマンス監視
- ユーザーフィードバック収集

#### ロールバック手順（問題発生時）

```bash
# 1. バックアップから復元
npx wrangler d1 execute DB --remote --file backup-before-migration.sql

# 2. 旧バージョンをデプロイ
git revert <commit-hash>
npm run deploy:api
npm run deploy:web
```

#### 完了条件

- [ ] 本番環境でDBマイグレーション成功
- [ ] API・フロントエンドデプロイ成功
- [ ] 全機能正常動作
- [ ] エラー発生なし
- [ ] パフォーマンス問題なし

---

## ⚠️ リスクと対策

### リスク1: DBマイグレーション失敗

**対策**:

- 事前にローカル・ステージングで十分テスト
- 本番実行前に必ずバックアップ
- ロールバック手順を事前準備

### リスク2: データ損失

**対策**:

- マイグレーション前にバックアップ必須
- titleデータは削除するが、移行スクリプトでログ保存（オプション）

### リスク3: 検索機能の性能低下

**対策**:

- `extractFirstLine`をメモ化
- 一覧表示時に都度抽出するのではなく、キャッシュを活用

### リスク4: CSVインポートの互換性

**対策**:

- titleカラムがあるCSVを読み込む際、contentの先頭に追加
- エクスポート時もtitle列を生成（contentから抽出）

---

## 🔄 ロールバック計画

各フェーズでロールバック可能：

### フェーズ1（DBマイグレーション後）

- バックアップから復元
- スキーマ定義を元に戻す

### フェーズ2-3（コード変更後）

- 前のコミットをrevert
- 再デプロイ

### フェーズ5（本番デプロイ後）

- バックアップから復元
- 旧バージョンをデプロイ

---

## 📊 進捗管理

| フェーズ  | 状態      | 担当 | 期限 | 備考                        |
| --------- | --------- | ---- | ---- | --------------------------- |
| フェーズ1 | 🔴 未着手 | -    | -    | DBスキーマ変更（4テーブル） |
| フェーズ2 | 🔴 未着手 | -    | -    | API修正（個人・チーム）     |
| フェーズ3 | 🔴 未着手 | -    | -    | フロント修正                |
| フェーズ4 | 🔴 未着手 | -    | -    | 統合テスト                  |
| フェーズ5 | 🔴 未着手 | -    | -    | デプロイ・監視              |

---

## 📝 実装チェックリスト

### DBスキーマ（4テーブル）

- [ ] `memos` - titleカラム削除
- [ ] `deleted_memos` - titleカラム削除
- [ ] `team_memos` - titleカラム削除
- [ ] `team_deleted_memos` - titleカラム削除

### API（2ルート）

- [ ] `/routes/memos/route.ts` - 個人メモAPI
- [ ] `/routes/teams/memos.ts` - チームメモAPI

### フロントエンド

- [ ] 型定義修正
- [ ] 保存処理修正
- [ ] 表示処理修正
- [ ] 検索機能修正
- [ ] エクスポート機能修正

---

## 📝 次のアクション

1. **このプランをレビュー**
2. **承認後、フェーズ1から順次実施**
3. **各フェーズ完了後、次フェーズ開始前に確認**

---

最終更新: 2025-11-22
作成者: Claude Code
