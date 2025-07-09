# カテゴリーシステム全面改修計画

## 概要
固定カテゴリーから自由なカテゴリー管理システムへの全面移行。メモ・タスク・ボード（将来実装）で共通利用可能な汎用カテゴリーシステムを構築する。

**注意**: ボード機能での「ボード紐づけ」は別システムとして独立して設計・実装する。カテゴリーは「内容による分類」、ボード紐づけは「プロジェクト/ワークフローによる組織化」という役割分担。

## 現在の問題点

### 1. 機能的問題
- 固定カテゴリーのみで拡張性がない
- カテゴリーの追加・編集・削除ができない
- 色指定が複雑で管理が煩雑
- データベースに保存されていない（フォームのみ）

### 2. 技術的問題
- タスクのみの実装でメモとの共通化なし
- 将来のボード機能との連携を考慮していない
- カテゴリー管理のUIが存在しない

## 目標

### 1. 機能目標
- ユーザーが自由にカテゴリーを作成・編集・削除
- 色指定を廃止してシンプルな文字ベース
- メモ・タスク・ボード（将来）で共通利用
- 直感的なカテゴリー管理UI

### 2. 技術目標
- 共通カテゴリーシステムの構築
- データベースでの永続化
- タイプセーフなAPI設計
- 再利用可能なコンポーネント設計

## データベース設計

### Categories テーブル
```sql
CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  user_id INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 既存テーブルの変更
```sql
-- memos テーブル
ALTER TABLE memos ADD COLUMN category_id INTEGER REFERENCES categories(id);

-- tasks テーブル  
ALTER TABLE tasks ADD COLUMN category_id INTEGER REFERENCES categories(id);

-- boards テーブル（将来実装）
-- ALTER TABLE boards ADD COLUMN category_id INTEGER REFERENCES categories(id);
-- 注意: ボード紐づけは別テーブル（board_items）で管理
```

## API設計

### エンドポイント
```typescript
// カテゴリー管理
GET    /api/categories          // カテゴリー一覧取得
POST   /api/categories          // カテゴリー作成
PUT    /api/categories/:id      // カテゴリー更新
DELETE /api/categories/:id      // カテゴリー削除

// 使用状況確認
GET    /api/categories/:id/usage // カテゴリーの使用状況
```

### 型定義
```typescript
// 基本カテゴリー型
interface Category {
  id: number;
  name: string;
  userId: number;
  createdAt: string;
  updatedAt: string;
}

// カテゴリー作成データ
interface CreateCategoryData {
  name: string;
}

// カテゴリー更新データ
interface UpdateCategoryData {
  name: string;
}

// カテゴリー使用状況
interface CategoryUsage {
  categoryId: number;
  memoCount: number;
  taskCount: number;
  boardCount: number; // 将来用
}
```

## UI/UX設計

### 1. カテゴリー選択UI
- 既存のCustomSelectorを改修
- 色表示を削除
- 「新しいカテゴリーを追加」オプションを追加
- インライン追加機能

### 2. カテゴリー管理UI
- 設定画面にカテゴリー管理セクションを追加
- カテゴリー一覧表示
- 名前の編集機能
- 削除機能（使用状況の確認付き）
- 使用状況の表示

### 3. コンポーネント構成
```
components/
├── features/
│   └── category/
│       ├── category-selector.tsx      // カテゴリー選択
│       ├── category-manager.tsx       // カテゴリー管理
│       ├── category-list.tsx          // カテゴリー一覧
│       ├── category-form.tsx          // カテゴリー作成/編集
│       └── category-delete-modal.tsx  // 削除確認
└── ui/
    └── selectors/
        └── enhanced-selector.tsx      // 改修版セレクター
```

## 共通化戦略

### 1. フック設計
```typescript
// カテゴリー管理用フック
export function useCategories() {
  // カテゴリーの取得・作成・更新・削除
}

export function useCategorySelector() {
  // セレクター用のロジック
}

export function useCategoryUsage(categoryId: number) {
  // カテゴリー使用状況の取得
}
```

### 2. 共通プロップス
```typescript
interface CategorySelectProps {
  value?: number;
  onChange: (categoryId: number | null) => void;
  allowCreate?: boolean;
  placeholder?: string;
}
```

## 実装手順

### Phase 1: データベース・API層
1. **データベース移行**
   - Categories テーブルの作成
   - 既存テーブルへのcategory_id追加
   - 移行スクリプトの作成

2. **API実装**
   - カテゴリーCRUD APIの実装
   - 使用状況取得APIの実装
   - バリデーション・エラーハンドリング

### Phase 2: 共通コンポーネント
1. **カテゴリー管理フック**
   - `useCategories`の実装
   - `useCategorySelector`の実装
   - `useCategoryUsage`の実装

2. **UIコンポーネント**
   - CategorySelectorの実装
   - CategoryManagerの実装
   - 削除確認モーダルの実装

### Phase 3: 各機能への適用
1. **タスク機能の改修**
   - TaskFormの修正
   - TaskEditorの修正
   - 保存・読み込み処理の修正

2. **メモ機能への適用**
   - MemoFormにカテゴリー選択を追加
   - MemoEditorの修正
   - 保存・読み込み処理の修正

### Phase 4: 管理UI・最適化
1. **設定画面の拡張**
   - カテゴリー管理セクションの追加
   - 一括操作機能

2. **表示・フィルタリング機能**
   - カテゴリー別表示
   - カテゴリーフィルター
   - 統計表示

## 技術的考慮事項

### 1. パフォーマンス
- カテゴリー一覧のキャッシュ
- 使用状況の効率的な取得
- 大量カテゴリーへの対応

### 2. UX配慮
- カテゴリー削除時の警告
- 使用中カテゴリーの保護
- インクリメンタル検索

### 3. 拡張性
- 将来のボード機能への対応
- カテゴリーの階層化（将来拡張）
- 色・アイコンの再導入への対応

## 注意点・リスク

### 1. データ移行
- 既存データのバックアップ必須
- 段階的移行の実施
- ロールバック計画の準備

### 2. UI/UX
- ユーザーの混乱を最小化
- 段階的機能公開
- 充分なテスト

### 3. パフォーマンス
- カテゴリー数の制限検討
- 検索・フィルタリングの最適化

## 完了条件

### 機能面
- [ ] カテゴリーの自由な作成・編集・削除
- [ ] メモ・タスクでのカテゴリー利用
- [ ] 設定画面でのカテゴリー管理
- [ ] カテゴリー別表示・フィルタリング

### 技術面
- [ ] データベース移行完了
- [ ] API実装完了
- [ ] 共通コンポーネント実装完了
- [ ] テスト実装完了

### 品質面
- [ ] 既存機能の動作確認
- [ ] パフォーマンステスト
- [ ] ユーザビリティテスト

---

この計画書に基づいて段階的に実装を進めることで、堅牢で拡張可能なカテゴリーシステムを構築できます。