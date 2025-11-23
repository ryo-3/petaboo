# Phase 4: フロントエンド displayId 移行実装プラン

**作成日**: 2025-01-23
**最終更新日**: 2025-11-23
**ステータス**: Phase 4.5 追加済み
**優先度**: 高

---

## ⚠️ Codex実装依頼時の厳守事項

> **以下を必ず守ること：**
>
> - **既存ファイルを丸ごと再生成させないこと（差分で依頼）**
> - **日本語コメント・文字列を扱う場合はUTF-8前提で依頼すること**
> - **Codexに git add / git commit を実行させないこと**
> - **完了した場合ファイルを`.claude/fixed-plans` に移動する**

---

## 🎯 目的

Phase 3で完了したバックエンドAPIの変更に合わせて、フロントエンド（apps/web）を修正し、`originalId` から `displayId` への移行を完了する。

---

## 📋 変更方針

### 基本原則

1. **後方互換性は不要**: API側で `targetOriginalId` パラメータを削除済み
2. **displayId のみ使用**: すべての箇所で `targetDisplayId` または `displayId` に統一
3. **完全統一**: 個人・チーム両方で内部的に `displayId` を使用（Phase 4.5で対応）
4. **型安全性の維持**: TypeScript型定義を正しく更新

### displayId の値

- **チーム機能**: 連番（"1", "2", "3"...）
- **個人機能**: `display_id = original_id`（コピー）

---

## 🔧 Phase 4-1: 型定義の修正

### ファイル: `apps/web/src/types/tag.ts`

**修正内容**:

```typescript
export interface Tagging {
  id: number;
  tagId: number;
  targetType: "memo" | "task" | "board";
  targetOriginalId: string; // ← 削除予定（Phase 6）
  targetDisplayId: string; // ← 追加
  userId: string;
  createdAt: Date;
  tag?: Tag;
}

export interface CreateTaggingData {
  tagId: number;
  targetType: "memo" | "task" | "board";
  targetDisplayId: string; // ← targetOriginalId から変更
}
```

---

### ファイル: `apps/web/lib/api/comments.ts`

**修正内容**:

```typescript
export interface TeamComment {
  id: number;
  teamId: number;
  userId: string;
  displayName: string | null;
  avatarColor: string | null;
  targetType: "memo" | "task" | "board";
  targetOriginalId: string; // ← 削除予定（Phase 6）
  targetDisplayId: string; // ← 追加
  content: string;
  mentions: string | null;
  createdAt: number;
  updatedAt: number | null;
}

export interface CreateCommentInput {
  targetType: "memo" | "task" | "board";
  targetDisplayId: string; // ← targetOriginalId から変更
  boardId?: number;
  content: string;
}
```

**関数修正**:

```typescript
// Before
export async function getTeamComments(
  teamId: number,
  targetType: "memo" | "task" | "board",
  targetOriginalId: string,
  token?: string,
): Promise<TeamComment[]>;

// After
export async function getTeamComments(
  teamId: number,
  targetType: "memo" | "task" | "board",
  targetDisplayId: string,
  token?: string,
): Promise<TeamComment[]>;
```

URL変更:

```typescript
// Before
`${API_BASE_URL}/comments?teamId=${teamId}&targetType=${targetType}&targetOriginalId=${targetOriginalId}`
// After
`${API_BASE_URL}/comments?teamId=${teamId}&targetType=${targetType}&targetDisplayId=${targetDisplayId}`;
```

---

### ファイル: `apps/web/lib/api/notifications.ts`

**修正内容**:

```typescript
export interface Notification {
  id: number;
  teamId: number;
  userId: string;
  type: string;
  sourceType: string | null;
  sourceId: number | null;
  targetType: string | null;
  targetOriginalId: string | null; // ← 削除予定（Phase 6）
  targetDisplayId: string | null; // ← 追加
  boardOriginalId: string | null; // ← 削除予定（Phase 6）
  boardDisplayId: string | null; // ← 追加
  actorUserId: string | null;
  actorDisplayName: string | null;
  message: string | null;
  isRead: number;
  createdAt: number;
  readAt: number | null;
}
```

---

## 🔧 Phase 4-2: APIクライアントの修正

### ファイル: `apps/web/src/lib/api-client.ts`

#### taggingsApi.getTaggings

**修正箇所**: L602-622

```typescript
// Before
getTaggings: async (
  token?: string,
  targetType?: string,
  targetOriginalId?: string,
  tagId?: number,
) => {
  const params = new URLSearchParams();
  if (targetType) params.append("targetType", targetType);
  if (targetOriginalId) params.append("targetOriginalId", targetOriginalId);
  if (tagId) params.append("tagId", tagId.toString());
  params.append("includeTag", "true");

  const url = `${API_BASE_URL}/taggings${params.toString() ? `?${params.toString()}` : ""}`;
  // ...
};

// After
getTaggings: async (
  token?: string,
  targetType?: string,
  targetDisplayId?: string,
  tagId?: number,
) => {
  const params = new URLSearchParams();
  if (targetType) params.append("targetType", targetType);
  if (targetDisplayId) params.append("targetDisplayId", targetDisplayId);
  if (tagId) params.append("tagId", tagId.toString());
  params.append("includeTag", "true");

  const url = `${API_BASE_URL}/taggings${params.toString() ? `?${params.toString()}` : ""}`;
  // ...
};
```

#### taggingsApi.deleteTaggingsByTag

**修正箇所**: L673-696

```typescript
// Before
deleteTaggingsByTag: async (
  tagId: number,
  targetType?: string,
  targetOriginalId?: string,
  token?: string,
) => {
  const requestBody = {
    tagId,
    targetType,
    targetOriginalId,
  };
  // ...
};

// After
deleteTaggingsByTag: async (
  tagId: number,
  targetType?: string,
  targetDisplayId?: string,
  token?: string,
) => {
  const requestBody = {
    tagId,
    targetType,
    targetDisplayId,
  };
  // ...
};
```

**注意**: チーム側とチェックするロジックを追加:

```typescript
// チーム用APIとして呼び出す場合は teamId も渡す
// 使用箇所で teamId の有無で判別
```

---

### ファイル: `apps/web/lib/api/comments.ts`

すでに前述の型定義変更で対応済み。追加修正なし。

---

## 🔧 Phase 4-3: ユーティリティの修正

### ファイル: `apps/web/src/utils/notificationUtils.ts`

**修正内容**:

```typescript
// Before
export function getNotificationUrl(
  notification: Notification,
  teamName: string | null | undefined,
): string | null {
  if (!teamName) return null;

  const { targetType, targetOriginalId, boardOriginalId } = notification;

  if (!targetType || !targetOriginalId) {
    return `/team/${teamName}`;
  }

  if (!boardOriginalId) {
    return `/team/${teamName}`;
  }

  const baseUrl = new URL(`/team/${teamName}`, "http://example.com");
  baseUrl.searchParams.set("tab", "board");

  if (boardOriginalId) {
    baseUrl.searchParams.set("slug", boardOriginalId);
    if (/^\d+$/.test(boardOriginalId)) {
      baseUrl.searchParams.set("boardId", boardOriginalId);
    }
  }

  if (targetType === "memo" && targetOriginalId) {
    baseUrl.searchParams.set("memo", targetOriginalId);
  } else if (targetType === "task" && targetOriginalId) {
    baseUrl.searchParams.set("task", targetOriginalId);
  }

  return `${baseUrl.pathname}${baseUrl.search}`;
}

// After
export function getNotificationUrl(
  notification: Notification,
  teamName: string | null | undefined,
): string | null {
  if (!teamName) return null;

  const { targetType, targetDisplayId, boardDisplayId } = notification;

  if (!targetType || !targetDisplayId) {
    return `/team/${teamName}`;
  }

  if (!boardDisplayId) {
    return `/team/${teamName}`;
  }

  const baseUrl = new URL(`/team/${teamName}`, "http://example.com");
  baseUrl.searchParams.set("tab", "board");

  if (boardDisplayId) {
    baseUrl.searchParams.set("slug", boardDisplayId);
    if (/^\d+$/.test(boardDisplayId)) {
      baseUrl.searchParams.set("boardId", boardDisplayId);
    }
  }

  // displayId を使用
  if (targetType === "memo" && targetDisplayId) {
    baseUrl.searchParams.set("memo", targetDisplayId);
  } else if (targetType === "task" && targetDisplayId) {
    baseUrl.searchParams.set("task", targetDisplayId);
  }

  return `${baseUrl.pathname}${baseUrl.search}`;
}
```

---

## 🔧 Phase 4-4: コンポーネントの修正（36箇所）

### 対象ファイル一覧

以下のファイルで `targetOriginalId` の使用箇所を修正:

1. `apps/web/components/features/memo/memo-status-display.tsx` (3箇所)
2. `apps/web/components/features/memo/memo-editor.tsx` (11箇所)
3. `apps/web/components/features/memo/memo-tag-filter-wrapper.tsx` (1箇所)
4. `apps/web/components/screens/board-detail-screen-3panel.tsx` (6箇所)
5. `apps/web/components/screens/task-screen.tsx` (2箇所)
6. `apps/web/components/screens/memo-screen.tsx` (2箇所)
7. `apps/web/components/features/task/task-editor.tsx` (8箇所)
8. `apps/web/components/features/task/task-status-display.tsx` (2箇所)
9. `apps/web/components/ui/tag-management/tag-management-modal.tsx` (1箇所)

### 修正パターン

#### パターン1: Props の変更

```typescript
// Before
interface ComponentProps {
  targetOriginalId?: string;
}

// After
interface ComponentProps {
  targetDisplayId?: string;
}
```

#### パターン2: コンポーネント使用時の変更

```typescript
// Before
<CommentSection
  targetOriginalId={memo.originalId}
  // ...
/>

// After
<CommentSection
  targetDisplayId={memo.displayId}
  // ...
/>
```

#### パターン3: API呼び出し時の変更

```typescript
// Before
const { data: comments } = useTeamComments(teamId, "memo", memo.originalId);

// After
const { data: comments } = useTeamComments(teamId, "memo", memo.displayId);
```

#### パターン4: チーム/個人判定の追加

```typescript
// チーム機能の場合のみ displayId を使用
const itemId = teamId ? memo.displayId : memo.originalId;

// または
const itemId = teamMode ? task.displayId : task.originalId;
```

---

### 主要コンポーネントの詳細修正

#### ファイル: `apps/web/components/features/comments/comment-section.tsx`

**修正箇所**: L202, L214, L489, L551

```typescript
// Before
interface CommentSectionProps {
  // ...
  targetOriginalId?: string;
  onItemClick?: (itemType: "memo" | "task", originalId: string) => void;
}

export default function CommentSection({
  // ...
  targetOriginalId,
  // ...
}: CommentSectionProps) {
  // ...
  const { data: boardComments = [], isLoading: isLoadingBoard } =
    useTeamComments(teamId, targetType, targetOriginalId);
  // ...
}

// After
interface CommentSectionProps {
  // ...
  targetDisplayId?: string;
  onItemClick?: (itemType: "memo" | "task", displayId: string) => void;
}

export default function CommentSection({
  // ...
  targetDisplayId,
  // ...
}: CommentSectionProps) {
  // ...
  const { data: boardComments = [], isLoading: isLoadingBoard } =
    useTeamComments(teamId, targetType, targetDisplayId);
  // ...
}
```

**その他の箇所**:

- L489: `if ((!newComment.trim() && pendingImages.length === 0) || !targetDisplayId)` (変数名変更)
- L489: `targetOriginalId` → `targetDisplayId`
- L551: `if (!teamId || !targetDisplayId) {`
- L640: `comment.targetOriginalId` → `comment.targetDisplayId` (表示時)

---

#### ファイル: `apps/web/components/features/memo/memo-editor.tsx`

**主な修正箇所**:

- タグ付けAPI呼び出し時に `displayId` 使用
- コメント表示時に `displayId` 使用
- チーム/個人判定を追加

**例**:

```typescript
// Before
const { data: taggings = [] } = useTaggings("memo", memo?.originalId);

// After
const itemId = teamId ? memo?.displayId : memo?.originalId;
const { data: taggings = [] } = useTaggings("memo", itemId);
```

---

#### ファイル: `apps/web/components/screens/board-detail-screen-3panel.tsx`

**主な修正箇所**: L206, L483, L640, etc.

- `onItemClick` のコールバックで `displayId` を渡す
- コメントセクションに `targetDisplayId` を渡す

```typescript
// Before
<CommentSection
  targetOriginalId={selectedMemo?.originalId}
  // ...
/>

// After
<CommentSection
  targetDisplayId={selectedMemo?.displayId}
  // ...
/>
```

---

## 🔧 Phase 4-5: URLパラメータの修正

### 対象ファイル

1. `apps/web/components/features/team/team-board-detail-wrapper.tsx`
2. `apps/web/components/features/team/team-detail.tsx`

### 修正内容

#### URLパラメータ取得時

```typescript
// Before
const memoIdParam = searchParams.get("memoId");
const taskIdParam = searchParams.get("taskId");

// After
const memoDisplayIdParam = searchParams.get("memo");
const taskDisplayIdParam = searchParams.get("task");
```

#### URLパラメータ設定時

```typescript
// Before
router.push(
  `/team/${teamSlug}?tab=board&slug=${boardSlug}&memoId=${memo.originalId}`,
);

// After
router.push(
  `/team/${teamSlug}?tab=board&slug=${boardSlug}&memo=${memo.displayId}`,
);
```

---

## 🔧 Phase 4-6: チーム/個人判定の実装パターン

**注意**: Phase 4.5完了後は、displayId が常に存在するため、フォールバックコード不要。

### Phase 4.5完了前（暫定）

```typescript
// チーム/個人でフォールバック
const itemId = teamId ? item.displayId : item.originalId;
```

### Phase 4.5完了後（推奨）

```typescript
// 常に displayId を使用（必ず存在）
const displayId = item.displayId;

// APIクライアント層で teamId の有無で送信先を判定
if (teamMode && teamId) {
  await api.permanentDeleteTeamMemo(teamId, displayId);
} else {
  await api.permanentDeleteNote(displayId); // 個人側も displayId で呼び出す
}
```

---

## 🔧 Phase 4.5: 個人用DB対応（displayId完全統一）

### 🎯 目的

個人用のメモ・タスクにも `display_id` カラムを追加し、フロントエンド内部で完全に `displayId` に統一する。

### 📊 メリット

1. **フォールバックコード不要**: `const displayId = item.displayId || item.originalId` が不要
2. **型安全性向上**: `displayId?: string` → `displayId: string` (必須化)
3. **コードのシンプル化**: チーム/個人の条件分岐が大幅に減少
4. **保守性向上**: 新規開発者にも理解しやすい設計

### 📋 作業内容

#### 1. スキーマ変更（個人用テーブル）

**対象テーブル**: 4テーブル

```sql
-- notes テーブル
ALTER TABLE notes ADD COLUMN display_id TEXT;
UPDATE notes SET display_id = original_id WHERE display_id IS NULL;

-- tasks テーブル
ALTER TABLE tasks ADD COLUMN display_id TEXT;
UPDATE tasks SET display_id = original_id WHERE display_id IS NULL;

-- deleted_notes テーブル
ALTER TABLE deleted_notes ADD COLUMN display_id TEXT;
UPDATE deleted_notes SET display_id = original_id WHERE display_id IS NULL;

-- deleted_tasks テーブル
ALTER TABLE deleted_tasks ADD COLUMN display_id TEXT;
UPDATE deleted_tasks SET display_id = original_id WHERE display_id IS NULL;
```

**実行方法**:

```bash
# ローカル環境
npm run db:migration:local

# 本番環境（Phase 4.5完了後）
npm run db:migration:prod
```

#### 2. スキーマファイル更新

**ファイル**: `apps/api/db/schema.ts`

```typescript
// notes テーブル
export const notes = sqliteTable("notes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  originalId: text("original_id").notNull().unique(),
  displayId: text("display_id").notNull(), // ← 追加
  // ...
});

// tasks テーブル
export const tasks = sqliteTable("tasks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  originalId: text("original_id").notNull().unique(),
  displayId: text("display_id").notNull(), // ← 追加
  // ...
});

// deleted_notes テーブル
export const deletedNotes = sqliteTable("deleted_notes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  originalId: text("original_id").notNull(),
  displayId: text("display_id").notNull(), // ← 追加
  // ...
});

// deleted_tasks テーブル
export const deletedTasks = sqliteTable("deleted_tasks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  originalId: text("original_id").notNull(),
  displayId: text("display_id").notNull(), // ← 追加
  // ...
});
```

#### 3. API修正（個人用エンドポイント）

**修正対象**: 個人用メモ・タスクの取得・作成・更新API

```typescript
// 例: GET /notes
{
  id: 1,
  originalId: "123",
  displayId: "123", // ← 追加（original_id と同じ値）
  title: "個人メモ",
  // ...
}

// 例: GET /notes/deleted
{
  id: 1,
  originalId: "123",
  displayId: "123", // ← 追加
  title: "削除済み個人メモ",
  // ...
}
```

**修正ファイル**:

- `apps/api/src/routes/notes/api.ts` - 全エンドポイント
- `apps/api/src/routes/tasks/api.ts` - 全エンドポイント

#### 4. フロントエンド型定義修正

**ファイル**: `apps/web/src/types/common.ts`

```typescript
// Before
export interface BaseItemFields {
  id: number;
  originalId?: OriginalId;
  displayId?: string; // ← Optional
  // ...
}

// After
export interface BaseItemFields {
  id: number;
  originalId?: OriginalId;
  displayId: string; // ← 必須化
  // ...
}
```

**ファイル**: `apps/web/src/types/memo.ts`

```typescript
// Before
export interface DeletedMemo extends BaseItemFields {
  originalId: OriginalId;
  displayId?: string; // ← Optional
  // ...
}

// After
export interface DeletedMemo extends BaseItemFields {
  originalId: OriginalId;
  displayId: string; // ← 必須化
  // ...
}
```

**ファイル**: `apps/web/src/types/task.ts`（同様の修正）

#### 5. フォールバックコードの削除

**修正箇所**: hooks、コンポーネント全般

```typescript
// Before
const displayId = memo.displayId || memo.originalId; // ← 削除
const displayId = teamMode ? task.displayId : task.originalId; // ← 削除

// After
const displayId = memo.displayId; // ← シンプルに
```

**主な修正ファイル**:

- `apps/web/src/hooks/use-memos.ts`
- `apps/web/src/hooks/use-tasks.ts`
- `apps/web/src/hooks/use-unified-restoration.ts`
- すべてのコンポーネント（フォールバック削除）

#### 6. チーム/個人判定ロジックの簡素化

**Before**:

```typescript
const itemId = teamMode && item.displayId ? item.displayId : item.originalId;
if (teamMode && teamId) {
  await api.permanentDeleteTeamMemo(teamId, itemId);
} else {
  await api.permanentDeleteNote(itemId);
}
```

**After**:

```typescript
const displayId = item.displayId; // 常に存在
if (teamMode && teamId) {
  await api.permanentDeleteTeamMemo(teamId, displayId);
} else {
  await api.permanentDeleteNote(displayId); // displayId を渡す（内部は original_id として処理）
}
```

### ✅ Phase 4.5 完了チェックリスト

#### DB・スキーマ

- [ ] 個人用4テーブルに `display_id` カラム追加
- [ ] 既存データに `display_id = original_id` を設定
- [ ] スキーマファイル更新（schema.ts）

#### API

- [ ] GET /notes が displayId を返す
- [ ] GET /tasks が displayId を返す
- [ ] GET /notes/deleted が displayId を返す
- [ ] GET /tasks/deleted が displayId を返す

#### フロントエンド

- [ ] BaseItemFields の displayId を必須化
- [ ] DeletedMemo の displayId を必須化
- [ ] DeletedTask の displayId を必須化
- [ ] フォールバックコード削除（hooks）
- [ ] フォールバックコード削除（コンポーネント）
- [ ] TypeScriptエラー0件

#### 動作確認

- [ ] 個人メモ一覧が表示される
- [ ] 個人タスク一覧が表示される
- [ ] 個人メモの削除・復元が動作する
- [ ] 個人タスクの削除・復元が動作する
- [ ] チーム機能も正常動作（影響なし）

---

## ✅ 動作確認チェックリスト

Phase 4完了後、以下を確認:

### コメント機能

- [ ] チームメモにコメント投稿できる
- [ ] チームタスクにコメント投稿できる
- [ ] ボードにコメント投稿できる
- [ ] コメント一覧が正しく表示される
- [ ] アイテムコメントがクリック可能（board-detail-screen）

### タグ機能

- [ ] チームメモにタグ付けできる
- [ ] チームタスクにタグ付けできる
- [ ] タグ削除ができる
- [ ] タグフィルタが機能する

### 通知機能

- [ ] 通知一覧が正しく表示される
- [ ] 通知クリックで正しいURLに遷移する（`?memo=1` `?task=1` 形式）
- [ ] boardDisplayId も正しく反映される

### URLパラメータ

- [ ] `/team/xxx?tab=board&slug=yyy&memo=1` で正しくメモが開く
- [ ] `/team/xxx?tab=board&slug=yyy&task=1` で正しくタスクが開く
- [ ] 個人側（`/memos`, `/tasks`）は従来通り動作する

### API呼び出し

- [ ] `GET /comments?teamId=1&targetType=memo&targetDisplayId=1` が成功
- [ ] `POST /comments` に `targetDisplayId` が送信される
- [ ] `GET /taggings?targetDisplayId=1` が成功
- [ ] `DELETE /taggings/by-tag` に `targetDisplayId` が送信される

---

## 📝 注意事項

1. **Phase 4.5で完全統一**: 個人・チーム両方で `displayId` を使用（フォールバック不要）
2. **Phase 6 まで両方保持**: `original_id` カラムは Phase 6 まで並存（削除予定）
3. **型エラーの修正**: TypeScript の型エラーがすべて解消されるまで確認
4. **console.error のチェック**: 開発者ツールでエラーが出ていないか確認

---

## 🎯 次のステップ

Phase 4完了後:

- **Phase 4.5**: 個人用DB対応（displayId完全統一） ← 追加
- **Phase 5**: 既存データの連番付与（マイグレーションスクリプト実行）
- **Phase 6**: `original_id` カラム完全削除

---

**最終更新**: 2025-11-23
