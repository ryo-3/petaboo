# Claude開発仕様書

## プロジェクト概要
- **メモ帳アプリ**: メモとタスクの統合管理アプリ
- **技術スタック**: 
  - **フロントエンド**: Next.js + TypeScript + Tailwind CSS
  - **バックエンド**: Hono + SQLite + Drizzle ORM
  - **認証**: Clerk (JWT Bearer認証)
- **アーキテクチャ**: Turborepo monorepo構成

## 基本設計原則
- **共通化ファースト**: 2回以上使われる可能性があるなら即座に共通化
- **Props設計**: variant, size, color等のオプションで拡張性重視
- **親からサイズ指定**: デフォルト値は定義せず、明示的にサイズを渡す
- **CSS-First アニメーション**: JavaScript制御よりCSS @keyframesを優先
- **段階的リファクタリング**: 既存機能を壊さず段階的に改善

## 主要システム

### カテゴリーシステム
- **スキーマ**: categories テーブル (id, name, userId, createdAt, updatedAt)
- **API**: /categories (CRUD操作、Clerk Bearer認証)
- **フック**: use-categories.ts (React Query)
- **UI**: CategorySelector (CustomSelector利用)

### ボードシステム ✅
- **スキーマ**: boards テーブル (id, name, slug, description, userId, position, archived, createdAt, updatedAt)
- **API**: 
  - `/boards` - ボード一覧・作成・更新・削除
  - `/boards/slug/{slug}` - slugからボード取得
  - `/boards/{id}/items` - ボード内アイテム取得・追加・削除
- **フック**: 
  - `useBoards()` - ボード一覧取得
  - `useBoardBySlug(slug)` - slugからボード取得
  - `useBoardWithItems(id)` - ボード詳細とアイテム取得
- **URL設計**: `/boards/{slug}` - SEOフレンドリーなslugベースURL
- **Slug生成**: 
  - 英数字: 名前をケバブケース変換
  - 日本語/特殊文字: ランダム6文字 (例: `fnlncz`)
  - 重複チェック: 自動で `-1`, `-2` 追加
- **UI機能**:
  - ✅ ボード一覧（カード表示）
  - ✅ ボード作成・編集・削除
  - ✅ ボード詳細画面（アイテム表示）
  - ✅ メモ・タスクのボード追加・削除

### 画面モード
```tsx
type ScreenMode = 'home' | 'memo' | 'task' | 'create' | 'settings' | 'board';
```

### 削除後自動選択
```tsx
import { getMemoDisplayOrder, getTaskDisplayOrder, getNextItemAfterDeletion } from "@/src/utils/domUtils";
const nextTask = getNextItemAfterDeletion(filteredTasks, deletedTask, getTaskDisplayOrder());
```

### 変更検知・保存システム
```tsx
<SaveButton onClick={handleSave} disabled={!hasChanges} isSaving={isSaving} />
const hasChanges = useMemo(() => currentTitle !== initialTitle || currentContent !== initialContent, [title, content, initialTitle, initialContent]);
```

### 並び替えシステム
```tsx
// 3状態トグル: 無効 → 昇順 → 降順 → 無効
<TaskSortToggle sortOptions={sortOptions} onSortChange={setSortOptions} buttonSize="size-6" iconSize="size-4" />
```

### 編集日表示システム
```tsx
<EditDateToggle showEditDate={showEditDate} onToggle={setShowEditDate} buttonSize="size-7" iconSize="size-4" />
// 通常モード: 最新日付のみ / 詳細モード: 作成日と更新日を横並び表示
```

### 設定システム
```tsx
// ユーザー設定（データベース保存）
interface UserPreferences {
  hideHeader: boolean;  // ヘッダー表示/非表示
}
// 画面高さ自動調整
const screenHeight = preferences?.hideHeader ? 'h-screen' : 'h-[calc(100vh-64px)]';
```

### CSS アニメーションシステム
```tsx
// deleteAnimation.ts - CSS版アニメーション
import { animateEditorContentToTrashCSS, animateBulkFadeOutCSS } from '@/src/utils/deleteAnimation';

// エディター削除アニメーション
@keyframes editor-to-trash {
  0% { transform: translate(0, 0) scale(1); }
  20% { transform: translate(0, 0) scale(0.8); }
  100% { transform: translate(var(--move-x), var(--move-y)) scale(0.01); }
}

// 一括削除最適化: 30件以下=全アニメーション、30件以上=混合モード
animateBulkFadeOutCSS(ids, onComplete, 120, 'delete', (id) => {
  // 300ms + index*120ms でアニメーション完了と同時にDOM更新
});
```

## 重要コンポーネント

### 共通基盤コンポーネント
- `domUtils.ts` - DOM順序取得とアイテム選択
- `ConfirmationModal` - 確認ダイアログ統一
- `BaseCard`, `BaseViewer` - レイアウト共通化
- `DeleteButton` - 削除ボタン統一（TrashIcon CSS化済み）
- `SaveButton` - 保存ボタン統一（変更検知対応、CSS化済み）
- `CustomSelector` - セレクター統一
- `CategorySelector` - カテゴリー選択コンポーネント

### UIコントロール
- `TaskSortToggle` - 並び替えトグル
- `EditDateToggle` - 編集日表示切り替え
- `TrashIcon` - ゴミ箱アイコン（CSS制御）

### 共通フック
- `useSelectionHandlers` - 選択ハンドラーパターン統一
- `useRightEditorDelete` - 右側エディター削除処理統一
- `use-bulk-restore` - 復元処理統一（メモ・タスク共通）
- `use-categories` - カテゴリー操作フック（CRUD操作）
- `use-boards` - ボード操作フック（CRUD操作、slug対応）

### アニメーション
- `deleteAnimation.ts` - 削除アニメーション（CSS版完了）
  - ✅ `animateEditorContentToTrashCSS` - エディター削除（CSS版）
  - ✅ `animateBulkFadeOutCSS` - 一括削除・復元（CSS版、メモ・タスク両側完了）

### パフォーマンス最適化
- **一括操作最適化**（メモ・タスク両側完了）:
  - 30件以下: 全アニメーション（120ms間隔）
  - 30件以上: 混合モード（最初30件アニメーション + 残り瞬時処理）
  - 100件制限: カスタムモーダルメッセージ対応
  - React Query競合回避: 自動更新なしmutation使用
  - DOM順序対応: タスクの並び替えに対応した全選択・アニメーション

## UIコントロール統一規則
- **サイズ**: buttonSize="size-7", iconSize="size-5", arrowSize="w-2.5 h-3"
- **色**: 背景=bg-gray-100, アクティブ=bg-white shadow-sm, 非アクティブ=text-gray-400

## API認証パターン
```typescript
// Clerk Bearer認証（credentials: "include" 不要）
const response = await fetch(`${API_BASE_URL}/categories`, {
  headers: {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  },
});
```

## 開発コマンド
```bash
npm run check-types && npm run lint  # コミット前必須
```

# 🚨 重要：開発制約と作業原則

## 🚫 絶対禁止事項（monorepo破壊防止）

### 1. パッケージ関連 - 絶対に触るな！
- ❌ **npmパッケージの追加・インストール**
- ❌ **package.jsonの変更**
- ❌ **pnpm-lock.yamlの変更**
- ❌ **依存関係の変更**
- ❌ **npm install, pnpm install等の実行**

**理由**: Turborepo monorepo構成が完全に壊れる

### 2. 確認不足による作業 - 毎回エラーの原因！
- ❌ **コードを読まずに修正提案**
- ❌ **変数・関数の存在確認をしない**
- ❌ **既存実装を理解せずに変更**
- ❌ **影響範囲を考えずに変更**

**理由**: 毎回型エラーやランタイムエラーが発生

### 3. 品質破壊
- ❌ **型エラーを残す**
- ❌ **lintエラーを残す**
- ❌ **テストを壊す**

## ✅ 必須作業手順（この順番で！）

### 1. 作業前の準備
```bash
# 1. 必ず既存コードを読む
Read/Grep/Task tools で関連ファイルを確認

# 2. 依存関係・変数の存在確認
import文、型定義、関数の存在を確認

# 3. 影響範囲の理解
変更による他ファイルへの影響を確認
```

### 2. 作業中
- **小さな変更から開始**
- **1つずつ確認しながら進める**
- **エラーが出たら即座に修正**

### 3. 作業後（必須！）
```bash
# 型チェック + lint実行（コミット前必須）
npm run check-types && npm run lint
```

## 🎯 作業時の心構え

### Claude側のチェックリスト
1. □ コードを読んだか？
2. □ 変数・関数の存在を確認したか？
3. □ 影響範囲を理解したか？
4. □ パッケージを触っていないか？
5. □ 型エラー・lintエラーはないか？

### ユーザーとのコミュニケーション
- **エラーが出たら**: 具体的なエラーメッセージを聞く
- **分からないことがあれば**: 必ず確認する
- **提案前に**: 既存コードの確認結果を伝える

## 📋 開発制約まとめ
- **新npmパッケージ追加禁止**
- **型エラー・lintエラー0維持**
- **セキュリティ重視（悪意コード禁止）**
- **Turborepoの設定変更禁止**

## 削除機能の構造

### 左側一括削除（チェックボックスで選択したアイテム）
- **状態**: `isBulkDeleting`, `isBulkDeleteLidOpen`
- **処理**: `handleLeftBulkDelete`
- **表示条件**: `checkedMemos.size > 0` 時
- **位置**: 左パネルの右下
- **アニメーション**: ✅ `animateBulkFadeOutCSS` (CSS版、パフォーマンス最適化済み)

### 右側エディター削除（現在表示中のメモ・タスク）
- **状態**: `isEditorDeleting`
- **処理**: `useRightEditorDelete` (共通フック)
- **表示条件**: エディター表示中 かつ チェック無し時
- **位置**: 右パネルの右下 (`DELETE_BUTTON_POSITION = "fixed bottom-4 right-4"`)
- **アニメーション**: ✅ `animateEditorContentToTrashCSS` (CSS版)

### 削除済み完全削除・一括復元
- **メモ・タスク**: CSS版アニメーション使用、パフォーマンス最適化済み ✅

### 動的高さシステム
- **BaseCard**: タスクとメモで異なる高さを自動設定
  - タスク: `h-[170px]`
  - メモ: `h-[160px]`
  - 判定: `dataTaskId` プロパティの有無で自動切り替え

### テキストオーバーフロー対策
```tsx
<p className="text-xs text-gray-600 line-clamp-1 break-all">
  {task.description || ""}
</p>
```