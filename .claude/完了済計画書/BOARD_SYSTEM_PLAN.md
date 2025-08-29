# ボード機能設計計画

## 概要

メモとタスクをプロジェクトやワークフロー単位で組織化するボード機能を実装する。カテゴリーシステムとは独立したプロジェクト管理システムとして設計。

## 基本コンセプト

### 役割分担

- **カテゴリー**: 内容による分類（「仕事」「個人」「勉強」など）
- **ボード**: プロジェクト/ワークフローによる組織化（「ECサイト開発」「プレゼン準備」など）

### 利用シーン

- プロジェクトに関連するメモ・タスクをまとめて管理
- ワークフローの可視化
- 進捗の追跡
- チーム作業の整理（将来拡張）

## 機能要件

### 1. ボード管理

- ボードの作成・編集・削除
- ボード名・説明の設定
- ボードの並び替え
- ボードのアーカイブ機能

### 2. アイテム管理

- 既存のメモ・タスクをボードに紐づけ
- ボードから紐づけを解除
- ボード内でのアイテム表示
- アイテムの並び替え

### 3. 表示機能

- ボード一覧表示
- ボード詳細表示（カンバン風）
- アイテムの種類別表示（メモ・タスク）
- 進捗状況の表示

## データベース設計

### Boards テーブル

```sql
CREATE TABLE boards (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  position INTEGER NOT NULL DEFAULT 0,
  archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Board_Items テーブル（多対多の中間テーブル）

```sql
CREATE TABLE board_items (
  id SERIAL PRIMARY KEY,
  board_id INTEGER NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  item_type VARCHAR(10) NOT NULL CHECK (item_type IN ('memo', 'task')),
  item_id INTEGER NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- 複合ユニーク制約：同じアイテムは同じボードに重複登録できない
  UNIQUE(board_id, item_type, item_id)
);

-- インデックス
CREATE INDEX idx_board_items_board_id ON board_items(board_id);
CREATE INDEX idx_board_items_item ON board_items(item_type, item_id);
```

### 既存テーブルの変更

```sql
-- 既存テーブルには変更なし
-- board_itemsテーブルで紐づけを管理するため
```

## API設計

### ボード管理API

```typescript
// ボード管理
GET    /api/boards             // ボード一覧取得
POST   /api/boards             // ボード作成
PUT    /api/boards/:id         // ボード更新
DELETE /api/boards/:id         // ボード削除
PUT    /api/boards/:id/archive // ボードアーカイブ
PUT    /api/boards/reorder     // ボード並び替え
```

### アイテム管理API

```typescript
// アイテム管理
GET    /api/boards/:id/items              // ボード内アイテム取得
POST   /api/boards/:id/items              // アイテムをボードに追加
DELETE /api/boards/:id/items/:item_id     // アイテムをボードから削除
PUT    /api/boards/:id/items/reorder      // ボード内アイテム並び替え

// アイテムのボード情報取得
GET    /api/memos/:id/boards              // メモが属するボード一覧
GET    /api/tasks/:id/boards              // タスクが属するボード一覧
```

## 型定義

### 基本型

```typescript
// ボード型
interface Board {
  id: number;
  name: string;
  description: string;
  userId: number;
  position: number;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

// ボードアイテム型
interface BoardItem {
  id: number;
  boardId: number;
  itemType: "memo" | "task";
  itemId: number;
  position: number;
  createdAt: string;
}

// ボード作成データ
interface CreateBoardData {
  name: string;
  description?: string;
}

// ボード更新データ
interface UpdateBoardData {
  name?: string;
  description?: string;
}

// アイテム追加データ
interface AddItemToBoardData {
  itemType: "memo" | "task";
  itemId: number;
}
```

### 拡張型

```typescript
// ボード詳細（アイテム情報付き）
interface BoardWithItems extends Board {
  items: BoardItemWithContent[];
}

// アイテム内容付きボードアイテム
interface BoardItemWithContent extends BoardItem {
  content: Memo | Task; // 実際のメモ・タスク情報
}

// アイテムのボード情報
interface ItemBoardInfo {
  itemType: "memo" | "task";
  itemId: number;
  boards: Board[];
}
```

## UI設計

### 1. ボード一覧画面

```
┌─────────────────────────────────────┐
│ ボード一覧                           │
├─────────────────────────────────────┤
│ [+ 新しいボード]                     │
│                                     │
│ ┌─────────────┐ ┌─────────────┐    │
│ │ ECサイト開発 │ │ プレゼン準備 │    │
│ │ 12アイテム   │ │ 5アイテム    │    │
│ └─────────────┘ └─────────────┘    │
└─────────────────────────────────────┘
```

### 2. ボード詳細画面（カンバン風）

```
┌─────────────────────────────────────┐
│ ECサイト開発                         │
├─────────────────────────────────────┤
│ メモ               │ タスク         │
│ ┌─────────────┐    │ ┌─────────────┐ │
│ │ API設計      │    │ │ DB設計      │ │
│ │ について     │    │ │ 優先度:高   │ │
│ └─────────────┘    │ └─────────────┘ │
│                    │                │
│ ┌─────────────┐    │ ┌─────────────┐ │
│ │ UI要件      │    │ │ テスト作成   │ │
│ │ まとめ       │    │ │ 期限:明日   │ │
│ └─────────────┘    │ └─────────────┘ │
└─────────────────────────────────────┘
```

### 3. アイテム選択画面

```
┌─────────────────────────────────────┐
│ ボードに追加                         │
├─────────────────────────────────────┤
│ [メモ] [タスク]                     │
│                                     │
│ ☐ API設計について                   │
│ ☐ DB設計メモ                       │
│ ☑ UI要件まとめ                     │
│                                     │
│ [キャンセル] [追加]                 │
└─────────────────────────────────────┘
```

## コンポーネント設計

### 1. ボード関連コンポーネント

```
components/
├── features/
│   └── board/
│       ├── board-list.tsx           // ボード一覧
│       ├── board-card.tsx           // ボード カード
│       ├── board-detail.tsx         // ボード詳細
│       ├── board-form.tsx           // ボード作成/編集
│       ├── board-item-list.tsx      // ボード内アイテム一覧
│       ├── board-item-card.tsx      // ボードアイテム カード
│       ├── add-item-modal.tsx       // アイテム追加モーダル
│       └── board-selector.tsx       // ボード選択（メモ・タスク用）
```

### 2. 共通コンポーネント

```
components/
├── ui/
│   ├── drag-drop/
│   │   ├── sortable-list.tsx        // ドラッグ&ドロップ一覧
│   │   └── sortable-item.tsx        // ドラッグ&ドロップアイテム
│   └── layout/
│       └── kanban-layout.tsx        // カンバン風レイアウト
```

## フック設計

### 1. ボード管理フック

```typescript
// ボード管理
export function useBoards() {
  // ボードの取得・作成・更新・削除・並び替え
}

export function useBoard(boardId: number) {
  // 特定ボードの取得
}

export function useBoardItems(boardId: number) {
  // ボード内アイテムの取得・並び替え
}
```

### 2. アイテム管理フック

```typescript
// アイテムのボード情報
export function useItemBoards(itemType: "memo" | "task", itemId: number) {
  // アイテムが属するボード一覧の取得
}

// ボードへのアイテム追加・削除
export function useBoardItemActions(boardId: number) {
  // アイテムの追加・削除
}
```

## 実装手順

### Phase 1: データベース・API層

1. **データベース設計**
   - boards テーブルの作成
   - board_items テーブルの作成
   - インデックス・制約の設定

2. **API実装**
   - ボード管理API
   - アイテム管理API
   - 並び替えAPI

### Phase 2: 基本UI

1. **ボード一覧**
   - ボード一覧表示
   - ボード作成・編集
   - ボード削除

2. **ボード詳細**
   - カンバン風レイアウト
   - アイテム表示
   - 並び替え機能

### Phase 3: 統合機能

1. **メモ・タスクとの連携**
   - ボード選択機能
   - アイテム追加機能
   - アイテム削除機能

2. **ドラッグ&ドロップ**
   - アイテム並び替え
   - ボード間移動

### Phase 4: 拡張機能

1. **検索・フィルタリング**
   - ボード内検索
   - アイテム種別フィルター
   - 進捗フィルター

2. **統計・レポート**
   - 進捗状況表示
   - 完了率表示
   - 活動履歴

## 技術的考慮事項

### 1. パフォーマンス

- ボード・アイテムの効率的な取得
- 大量アイテムへの対応
- リアルタイム更新の検討

### 2. UX配慮

- 直感的なドラッグ&ドロップ
- 分かりやすい視覚的フィードバック
- レスポンシブデザイン

### 3. 拡張性

- チーム機能への対応準備
- 権限管理の考慮
- 外部連携の準備

## 完了条件

### 機能面

- [ ] ボードの作成・編集・削除
- [ ] メモ・タスクのボード紐づけ
- [ ] カンバン風表示
- [ ] アイテム並び替え

### 技術面

- [ ] データベース設計完了
- [ ] API実装完了
- [ ] 共通コンポーネント実装完了
- [ ] パフォーマンステスト完了

### 品質面

- [ ] ドラッグ&ドロップ動作確認
- [ ] レスポンシブ対応確認
- [ ] 大量データでの動作確認

---

この計画書に基づいて、カテゴリーシステムとは独立したボード機能を実装します。両システムを組み合わせることで、より柔軟なプロジェクト管理が可能になります。
