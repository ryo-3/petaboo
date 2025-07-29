# UI連携とAPI設計

## 現状：スキーマ実装完了

### 実装済みデータベース構造
```typescript
// タグシステム
tags: { id, name, color, userId, createdAt, updatedAt }
taggings: { id, tagId, targetType, targetOriginalId, userId, createdAt }

// ボードカテゴリーシステム
board_categories: { id, name, description, color, icon, sortOrder, userId, createdAt, updatedAt }
boards: { ..., boardCategoryId, ... } // 拡張済み
```

## 次のステップ：UIとの連携

### 1. API実装が必要なエンドポイント

#### タグ管理API
```typescript
// apps/api/src/routes/tags.ts
GET    /api/tags                    // タグ一覧取得
POST   /api/tags                    // タグ作成
PUT    /api/tags/{id}               // タグ更新
DELETE /api/tags/{id}               // タグ削除

// クエリパラメータ
GET /api/tags?q=keyword             // 検索
GET /api/tags?sort=usage            // 使用頻度順
GET /api/tags?recent=true           // 最近使用
```

#### タグ付けAPI
```typescript
// apps/api/src/routes/taggings.ts
GET    /api/taggings                // タグ付け一覧
POST   /api/taggings                // タグ付け追加
DELETE /api/taggings/{id}           // タグ付け削除

// 特定アイテムのタグ取得
GET /api/taggings?targetType=memo&targetOriginalId=123
```

#### ボードカテゴリーAPI
```typescript
// apps/api/src/routes/board-categories.ts
GET    /api/board-categories        // カテゴリー一覧取得
POST   /api/board-categories        // カテゴリー作成
PUT    /api/board-categories/{id}   // カテゴリー更新
DELETE /api/board-categories/{id}   // カテゴリー削除
PUT    /api/board-categories/reorder // 並び順変更
```

#### 既存API拡張
```typescript
// 既存APIにタグ・カテゴリー対応を追加
GET /api/memos?tags=tag1,tag2       // タグでフィルタリング
GET /api/tasks?tags=tag1,tag2       // タグでフィルタリング
GET /api/boards?tags=tag1,tag2      // タグでフィルタリング
GET /api/boards?boardCategoryId=123 // カテゴリーでフィルタリング
```

### 2. フロントエンド型定義

#### 共通型定義ファイル
```typescript
// apps/web/src/types/tags.ts
export interface Tag {
  id: number;
  name: string;
  color?: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Tagging {
  id: number;
  tagId: number;
  targetType: 'memo' | 'task' | 'board';
  targetOriginalId: string;
  userId: string;
  createdAt: Date;
  tag?: Tag; // JOIN時の関連データ
}

// apps/web/src/types/board-categories.ts
export interface BoardCategory {
  id: number;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  sortOrder: number;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

// 既存のBoard型に追加
export interface BoardWithCategory extends Board {
  boardCategory?: BoardCategory;
}
```

### 3. React Hooks実装

#### タグ関連フック
```typescript
// apps/web/src/hooks/use-tags.ts
export function useTags(options?: {
  search?: string;
  sort?: 'name' | 'usage' | 'recent';
  limit?: number;
}) {
  // タグ一覧取得、作成、更新、削除
  return {
    tags: Tag[],
    createTag: (data: CreateTagData) => Promise<Tag>,
    updateTag: (id: number, data: UpdateTagData) => Promise<Tag>,
    deleteTag: (id: number) => Promise<void>,
    isLoading: boolean,
    error: Error | null,
  };
}

// apps/web/src/hooks/use-taggings.ts
export function useTaggings(targetType: string, targetOriginalId: string) {
  // 特定アイテムのタグ付け管理
  return {
    taggings: Tagging[],
    addTag: (tagId: number) => Promise<Tagging>,
    removeTag: (taggingId: number) => Promise<void>,
    isLoading: boolean,
    error: Error | null,
  };
}

// apps/web/src/hooks/use-item-tags.ts
export function useItemTags(targetType: string, targetOriginalId: string) {
  // アイテムに付けられたタグの一覧を取得
  return {
    tags: Tag[],
    addTag: (tagId: number) => Promise<void>,
    removeTag: (tagId: number) => Promise<void>,
    isLoading: boolean,
  };
}
```

#### ボードカテゴリー関連フック
```typescript
// apps/web/src/hooks/use-board-categories.ts
export function useBoardCategories() {
  return {
    categories: BoardCategory[],
    createCategory: (data: CreateCategoryData) => Promise<BoardCategory>,
    updateCategory: (id: number, data: UpdateCategoryData) => Promise<BoardCategory>,
    deleteCategory: (id: number) => Promise<void>,
    reorderCategories: (categoryIds: number[]) => Promise<void>,
    isLoading: boolean,
    error: Error | null,
  };
}

// 既存のuseBoards.tsに拡張
export function useBoards(options?: {
  categoryId?: number;
  tags?: string[];
}) {
  // カテゴリー・タグによるフィルタリング対応
}
```

### 4. UIコンポーネント設計

#### タグ関連コンポーネント
```typescript
// apps/web/src/components/features/tags/
TagSelector.tsx      // タグ選択・追加コンポーネント
TagInput.tsx         // 新規タグ入力（オートコンプリート付き）
TagChip.tsx          // タグチップ表示
TagFilter.tsx        // タグによるフィルタリング
TagManager.tsx       // タグ管理画面
```

#### ボードカテゴリー関連コンポーネント
```typescript
// apps/web/src/components/features/board-categories/
BoardCategorySelector.tsx  // カテゴリー選択
BoardCategoryManager.tsx   // カテゴリー管理画面
BoardCategoryChip.tsx      // カテゴリー表示チップ
BoardCategoryFilter.tsx    // カテゴリーフィルター
```

### 5. 具体的なUI統合ポイント

#### メモ・タスク画面での統合
```typescript
// メモ編集画面に追加
<TagSelector 
  targetType="memo" 
  targetOriginalId={memo.originalId}
  onTagsChange={handleTagsChange}
/>

// タスク編集画面に追加
<TagSelector 
  targetType="task" 
  targetOriginalId={task.originalId}
  onTagsChange={handleTagsChange}
/>
```

#### ボード画面での統合
```typescript
// ボード作成・編集フォームに追加
<BoardCategorySelector
  value={board.boardCategoryId}
  onChange={handleCategoryChange}
/>

<TagSelector 
  targetType="board" 
  targetOriginalId={board.id.toString()}
  onTagsChange={handleTagsChange}
/>
```

#### 一覧画面でのフィルタリング
```typescript
// メモ・タスク一覧画面に追加
<TagFilter 
  selectedTags={selectedTags}
  onTagsChange={setSelectedTags}
/>

// ボード一覧画面に追加
<BoardCategoryFilter
  selectedCategory={selectedCategory}
  onCategoryChange={setSelectedCategory}
/>
```

### 6. 検索機能の統合

#### 横断検索コンポーネント
```typescript
// apps/web/src/components/features/search/
CrossSearch.tsx      // メモ・タスク・ボード横断検索
TagSearch.tsx        // タグによる検索
CategorySearch.tsx   // カテゴリーによる検索
```

#### 検索API
```typescript
// 横断検索エンドポイント
GET /api/search?q=keyword&tags=tag1,tag2&types=memo,task,board
```

### 7. 実装優先順位

#### Phase 1: 基本機能
1. タグ管理API実装
2. タグ関連React Hooks実装
3. 基本的なTagSelectorコンポーネント

#### Phase 2: ボードカテゴリー
1. ボードカテゴリーAPI実装
2. ボードカテゴリー関連フック実装
3. ボード画面への統合

#### Phase 3: UI統合
1. メモ・タスク画面にタグ機能追加
2. 一覧画面にフィルタリング機能追加
3. 検索機能の拡張

#### Phase 4: 高度な機能
1. オートコンプリート機能
2. タグ・カテゴリー管理画面
3. 統計・分析機能

### 8. UIとの連携で注意すべき点

#### 既存UIコンポーネントとの統一
- 既存の`CustomSelector`パターンに準拠
- `SaveButton`の変更検知機能と連携
- 既存のタブ高さ(`h-7`)・フォーム高さ(`h-8`)に統一

#### パフォーマンス考慮
- タグ検索時のデバウンス処理
- 無限スクロール対応
- キャッシュ戦略（React Query活用）

#### ユーザビリティ
- タグ数制限時の適切な警告表示
- 削除時の確認ダイアログ
- 操作フィードバック（成功・エラー表示）

## 次のアクション
1. APIエンドポイントの実装
2. React Hooks の実装
3. 基本UIコンポーネントの実装
4. 既存画面への段階的統合