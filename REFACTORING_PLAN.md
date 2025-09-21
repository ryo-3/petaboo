# 🔧 ぺたぼー全体リファクタリング計画書

## 📋 概要

プロジェクト全体のコードベース調査により、大幅な重複コードと改善機会を特定。
保守性向上とコード品質改善を目的とした段階的リファクタリングを実施。

**調査対象**: 195個のTSXファイル、52個のカスタムフック
**総削減見込み**: 1,000行以上のコード削減

---

## 🎯 リファクタリング項目と優先順位

### ✅ 完了項目

#### 1. フィルターラッパー統合 【完了】

- **実装日**: 2025-09-21
- **効果**: 120行削減、フィルタリングロジック一元化
- **対象ファイル**:
  - `apps/web/components/shared/item-filter-wrapper.tsx` (新規作成)
  - `apps/web/components/features/memo/memo-filter-wrapper.tsx` (66行 → 17行)
  - `apps/web/components/features/task/task-filter-wrapper.tsx` (61行 → 17行)
- **改善内容**: ジェネリック型対応の共通コンポーネント化

---

## 🔥 高優先度項目

### 2. CSVインポートモーダル統合 【最優先】

- **重要度**: 🔴 High
- **見込み効果**: 560行以上削減
- **実装コスト**: 中 (2-3日)
- **対象ファイル**:
  - `apps/web/components/features/memo/csv-import-modal.tsx` (256行)
  - `apps/web/components/features/task/csv-import-modal.tsx` (305行)

**重複度**: 95%以上 - ほぼ同一のロジックとUI

- CSVパースロジック
- ドラッグ&ドロップ機能
- プレビュー表示機能
- インポート処理

**提案実装**:

```typescript
// apps/web/components/shared/csv-import-modal.tsx
interface CSVImportModalProps<T> {
  isOpen: boolean;
  onClose: () => void;
  parseFunction: (csvText: string) => T[];
  importHook: () => UseMutationResult<any, Error, File>;
  itemType: "memo" | "task";
  formatDescription: string;
  previewColumns: string[];
  renderPreviewItem: (item: T, index: number) => React.ReactNode;
}
```

**リスク**: 中 - 複雑なUIロジックの統合が必要
**メリット**: バグ修正コストの半減、メンテナンス性大幅向上

### 3. バルク削除フック統合 【高効果】

- **重要度**: 🔴 High
- **見込み効果**: 300行以上削減
- **実装コスト**: 高 (4-5日)
- **対象ファイル**:
  - `apps/web/components/features/memo/use-memo-bulk-delete.tsx` (384行)
  - `apps/web/components/features/task/use-task-bulk-delete.tsx` (類似)

**重複度**: 90%以上

- アニメーション制御ロジック
- チェック状態管理
- API呼び出しパターン
- エラーハンドリング

**提案実装**:

```typescript
// apps/web/src/hooks/use-bulk-delete-common.ts
interface UseBulkDeleteProps<T, D> {
  activeTab: string;
  checkedItems: Set<number>;
  setCheckedItems: (items: Set<number>) => void;
  items?: T[];
  deletedItems?: D[];
  deleteHook: () => UseMutationResult<any, Error, number>;
  permanentDeleteHook: () => UseMutationResult<any, Error, string>;
}
```

**リスク**: 高 - 複雑なアニメーション制御とジェネリック型の組み合わせ
**メリット**: 大幅なコード削減、型安全性向上

---

## 🟡 中優先度項目

### 4. 型定義の共通化 【保守性重視】

- **重要度**: 🟡 Medium
- **見込み効果**: 保守性向上、一貫性確保
- **実装コスト**: 低 (半日)
- **対象ファイル**:
  - `apps/web/src/types/memo.ts`
  - `apps/web/src/types/task.ts`

**重複パターン**:

```typescript
// 両方に存在する共通フィールド
userId?: string;
teamId?: number;
createdBy?: string | null;
avatarColor?: string | null;
```

**提案実装**:

```typescript
// apps/web/src/types/common.ts
export interface TeamCreatorFields {
  userId?: string;
  teamId?: number;
  createdBy?: string | null;
  avatarColor?: string | null;
}

// 各型での使用
export interface Memo extends TeamCreatorFields {
  // memo固有のフィールド
}
```

### 5. APIルート実装の共通化 【API統一】

- **重要度**: 🟡 Medium
- **見込み効果**: 50行削減、API実装統一
- **実装コスト**: 中 (2日)
- **対象ファイル**:
  - `apps/api/src/routes/memos/route.ts`
  - `apps/api/src/routes/tasks/route.ts`

**重複パターン**:

- CSVパース関数の実装
- OpenAPIスキーマ定義パターン
- 認証・データベースミドルウェア適用

---

## 🟢 低優先度項目

#### 6. アイコンコンポーネントProps統一 【完了】

- **実装日**: 2025-09-21
- **効果**: 35個のアイコンコンポーネント統一、型定義重複排除
- **対象ファイル**:
  - `apps/web/src/types/icon.ts` (BaseIconProps作成)
  - 35個のアイコンファイル (重複interface削除)
- **改善内容**:
  - BaseIconPropsによる統一インターフェース
  - 独自Props持ちコンポーネント(4個)は適切に拡張
  - 新規アイコン作成効率化

---

## 🚫 推奨しないリファクタリング

### ❌ 避けるべき過度な抽象化

#### 1. メモ・タスクエディターの統合

- **理由**: 異なる要件とビジネスロジック
- **リスク**: Props bucket relay、複雑な条件分岐増加
- **判断**: 個別実装を維持

#### 2. カスタムフック全体の統合

- **理由**: ビジネスロジックの違いが大きい
- **リスク**: 単一責任原則の違反、テスタビリティ低下
- **判断**: 個別最適化を優先

---

## 📅 実装スケジュール

### フェーズ1: 基盤整備 (1-2日)

1. ✅ **フィルターラッパー統合** (完了)
2. ✅ **アイコンコンポーネントProps統一** (完了)
3. **型定義の共通化** (半日)

### フェーズ2: 大型リファクタリング (5-6日)

4. **CSVインポートモーダル統合** (2-3日)
5. **バルク削除フック統合** (4-5日)

### フェーズ3: 最終調整 (2日)

6. **APIルート共通化** (2日)

**総実装期間**: 8-11日

---

## 📊 効果測定指標

### 定量的効果

- **コード削減**: 約1,000行以上
- **ファイル削減**: 重複ファイル統合
- **型安全性**: TypeScriptエラー削減

### 定性的効果

- **保守性向上**: バグ修正箇所の半減
- **開発効率**: 新機能追加時の重複実装回避
- **品質向上**: 一貫した実装パターン確立
- **テストカバレッジ**: 重複テストの排除

---

## ⚠️ リスク管理

### 高リスク項目

- **バルク削除フック統合**: 複雑なアニメーション制御
- **CSVインポートモーダル統合**: UI状態管理の複雑さ

### リスク軽減策

1. **段階的実装**: 小さな変更から開始
2. **テスト優先**: 既存機能の動作確認
3. **ロールバック準備**: Git履歴の適切な管理
4. **影響範囲限定**: 個別コンポーネント単位での実装

---

## 🎯 成功基準

### 必須条件

- [ ] 既存機能の完全動作保証
- [ ] TypeScriptエラーゼロ
- [ ] Lintエラーゼロ
- [ ] UIの動作一貫性

### 目標条件

- [ ] 1,000行以上のコード削減達成
- [ ] 重複ロジックの95%以上削除
- [ ] 新機能追加時の実装時間50%短縮
- [ ] バグ修正箇所の半減

---

**更新日**: 2025-09-21
**ステータス**: フェーズ1 66%完了 (フィルターラッパー統合、アイコンProps統一完了)
**次回実装**: 型定義共通化(簡単) → CSVインポートモーダル統合(最優先)
