# メモ帳アプリ 問題整理と改善計画書

## 現在発生している問題の整理

### 1. 削除済みアイテムの404エラー問題 🚨 **[緊急]**

**問題の詳細**:
- 削除済みメモ/タスクで`useItemBoards`が呼ばれ、存在しないIDで404エラーが発生
- エラー例: `GET http://localhost:8794/boards/items/memo/4/boards 404 (Not Found)`

**根本原因**:
- 削除済みアイテムは別テーブル（`deletedNotes`/`deletedTasks`）に移動される
- `originalId`で元のIDを保持するが、APIは`isNull(boardItems.deletedAt)`でフィルターしているため削除済みアイテムのボード情報を取得できない
- フロントエンドで削除済みアイテムでもボード情報取得を試行している

**影響範囲**:
- `memo-list-item.tsx`
- `memo-card-content.tsx` 
- `deleted-task-viewer.tsx`

**現在の対処**:
- 削除済みアイテムの場合はAPIコールを停止する修正を実施済み

---

### 2. データベース構造の複雑性問題 🔧 **[重要]**

**問題の詳細**:
- 現在の二重管理による構造の複雑さ
- `notes` + `deletedNotes` テーブルの分離
- `tasks` + `deletedTasks` テーブルの分離
- `id` と `originalId` の複雑な関係
- ボード関連の処理で混乱が発生

**現在の構造**:
```typescript
// 通常のメモ
interface Memo {
  id: number
  title: string
  content: string | null
  // ...
}

// 削除済みメモ（別テーブル）
interface DeletedMemo {
  id: number           // 削除済みテーブルでの新しいID
  originalId: number   // 元のメモのID
  title: string
  content: string | null
  deletedAt: number
  // ...
}
```

**提案される改善構造**:
```typescript
// 統一されたメモ構造（単一テーブル）
interface Memo {
  id: number
  title: string
  content: string | null
  categoryId?: number | null
  createdAt: number
  updatedAt?: number
  deletedAt?: number | null  // ソフトデリート用
  // ...
}
```

**メリット**:
- テーブル構造のシンプル化
- `originalId` 概念の排除
- ボード関連の処理統一
- データの一貫性向上

---

### 3. 並び替え機能の動作不良 📊 **[調査必要]**

**問題の詳細**:
- 並び替えがうまく動作していない（具体的な症状要確認）

**現在の実装**:
- フロントエンドで`ItemStatusDisplay`コンポーネントが並び替えを制御
- `getDefaultSortValue`でデフォルト並び順を設定
  - 通常メモ: `updatedAt || createdAt` の降順
  - 削除済みメモ: `deletedAt` の降順

**調査が必要な点**:
- 具体的にどのような並び替えの問題が発生しているか
- ソート機能自体の動作確認
- APIレスポンスとフロントエンド並び替えの整合性

---

### 4. position フィールドの必要性の検討 🗂️ **[最適化]**

**現状**:
- `boards.position`: ボード一覧での表示順序
- `boardItems.position`: ボード内アイテムの表示順序
- `deletedBoards.position`: 削除済みボードの順序保持

**発見**:
- メモ一覧では更新日時順でフロントエンド並び替えを実装
- positionフィールドの実際の利用頻度が不明

**検討事項**:
- positionフィールドの削除可能性
- フロントエンド並び替えで十分かどうか
- ユーザーカスタム並び替えの必要性

---

## 改善計画

### Phase 1: 緊急対応 **[完了]**
- [x] 削除済みアイテムの404エラー修正
- [x] 並び替え機能の動作確認と修正

### Phase 2: 構造改善実装 **[完了]** 
- [x] positionフィールドの削除
- [x] API並び替えの統一化
  - [x] メモ一覧: 更新日降順 > 作成日降順
  - [x] タスク一覧: 優先度降順(high>medium>low) > 更新日降順 > 作成日降順
  - [x] ボード一覧: 更新日降順 > 作成日降順
  - [x] ボード内アイテム: 作成日昇順（挿入順）
- [x] テーブル名の統一（`notes` → `memos`）
  - [x] データベーススキーマ変更（notes → memos, deleted_notes → deleted_memos）
  - [x] API エンドポイント変更（/notes → /memos）
  - [x] フロントエンドAPI クライアント更新（notesApi → memosApi）
  - [x] React フック名変更（useNotes → useMemos 等）
  - [x] 変数・関数名の統一（deletedNotes → deletedMemos 等）
  - [x] UI テキストの更新（Notes → Memos）
  - [x] originalId システムの実装
  - [x] autoIncrement による ID 重複回避対応
- [ ] データベース構造シンプル化の詳細設計

### Phase 3: 今後の改善検討 **[検討段階]**
- [ ] データベーススキーマの変更（ソフトデリートへの移行）
- [ ] 削除済みアイテムテーブルの統合
- [ ] フロントエンド型定義の更新
- [ ] コンポーネントの修正

### Phase 4: 最適化 **[長期]**
- [ ] パフォーマンス最適化
- [ ] 不要なコードの削除
- [ ] テストケースの追加

---

## 技術的な判断基準

### データベース設計の方向性
- **シンプル化優先**: 保守性とパフォーマンスのバランス
- **ソフトデリート採用**: `deletedAt` カラムによる論理削除
- **一貫性重視**: 同じパターンをメモ・タスク両方に適用

### フロントエンド設計の方向性
- **型安全性**: TypeScriptの恩恵を最大限活用
- **パフォーマンス**: 不要なAPI呼び出しの削除
- **ユーザビリティ**: 直感的な並び替えと表示

---

## 次のアクション

### 即座に対応が必要
1. 並び替え機能の具体的な問題の特定と修正

### 計画として検討
1. データベース構造シンプル化の実装判断
2. position フィールドの削除検討

---

*最終更新: 2025-07-23*
*作成者: Claude Code Assistant*