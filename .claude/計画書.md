# メモ帳アプリ開発計画書

## プロジェクト概要
メモとタスクの統合管理アプリケーション。ボード機能を追加して、プロジェクトやカテゴリごとの整理を可能にする。

## ボードシステム開発計画

### 1. 現状分析
- **実装済み**:
  - boards テーブル (id, name, description, userId, createdAt, updatedAt)
  - /boards API (CRUD操作、Clerk Bearer認証)
  - use-boards.ts (React Query)
  - 基本的なボード一覧表示
  - ボード作成・削除機能
  - DesktopUpper統合

### 2. UI設計方針
- **ターゲット規模**: 100個以上のボード管理を想定
- **表示形式**: カード表示のみ（リスト表示は不要）
- **レイアウト**: グリッド表示（列数固定、調整機能不要）
- **理由**: ボードは大きな単位なので、メモ・タスクのような細かい表示切り替えは不要

### 3. 必須機能（フェーズ1）

#### 3.1 ボード情報の拡充
- **表示項目**:
  - ボード名（実装済み）
  - 説明文（スキーマには存在、UI未実装）
  - 含まれるメモ数
  - 含まれるタスク数
  - 最終更新日
- **実装方法**:
  - APIレスポンスに統計情報を追加
  - BoardCardコンポーネントの拡張

#### 3.2 検索・フィルター機能
- **検索対象**:
  - ボード名
  - 説明文
- **実装方法**:
  - DesktopUpperに検索バーを追加（ボードモード時のみ表示）
  - クライアントサイドフィルタリング（初期実装）
  - 将来的にサーバーサイド検索も検討

#### 3.3 並び替え機能
- **ソート項目**:
  - 作成日（昇順/降順）
  - 更新日（昇順/降順）
  - 名前順（A-Z/Z-A）
  - メモ・タスク数順
- **実装方法**:
  - SortToggleコンポーネントの再利用
  - DesktopUpperに統合

### 4. 実装優先順位

1. **第1段階**: ボード情報の拡充
   - BoardCardにメモ/タスク数、最終更新日を表示
   - APIレスポンスの拡張

2. **第2段階**: 検索機能
   - 検索バーUI実装
   - クライアントサイドフィルタリング

3. **第3段階**: 並び替え機能
   - SortToggleの統合
   - ソートロジック実装

### 5. 将来的な拡張（フェーズ2）
- **手動並び替え**: ドラッグ&ドロップでボード順序を変更
- **お気に入り機能**: よく使うボードをピン留め
- **アーカイブ機能**: 使わなくなったボードを非表示に
- **ボードテンプレート**: よく使う構成を保存・複製
- **共有機能**: チームでボードを共有

### 6. 技術的考慮事項
- **パフォーマンス**: 100個以上のボードでも快適に動作
- **検索の最適化**: デバウンス処理、仮想スクロール検討
- **状態管理**: React Queryのキャッシュ戦略
- **レスポンシブ対応**: モバイルでの表示最適化

### 7. データベース拡張案
```sql
-- 将来的な拡張用
ALTER TABLE boards ADD COLUMN display_order INTEGER DEFAULT 0;
ALTER TABLE boards ADD COLUMN is_favorite BOOLEAN DEFAULT FALSE;
ALTER TABLE boards ADD COLUMN is_archived BOOLEAN DEFAULT FALSE;
ALTER TABLE boards ADD COLUMN color VARCHAR(7); -- #RRGGBB形式
ALTER TABLE boards ADD COLUMN icon VARCHAR(50); -- アイコン識別子
```

### 8. API拡張案
```typescript
// GET /boards レスポンス拡張
interface BoardWithStats {
  id: number;
  name: string;
  description: string;
  memoCount: number;
  taskCount: number;
  lastActivityAt: string; // メモ・タスクの最新更新日時
  createdAt: string;
  updatedAt: string;
}
```