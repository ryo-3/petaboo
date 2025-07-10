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
- **統合**: タスクに categoryId 追加

### 画面モード
```tsx
type ScreenMode = 'home' | 'memo' | 'task' | 'create' | 'settings';
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
// deleteAnimation.ts - 段階的CSS化
// Phase 1: エディター削除アニメーション（完了）
import { animateEditorContentToTrashCSS } from '@/src/utils/deleteAnimation';

// CSS keyframes with dynamic variables
@keyframes editor-to-trash {
  0% { transform: translate(0, 0) scale(1); }
  20% { transform: translate(0, 0) scale(0.8); }
  100% { transform: translate(var(--move-x), var(--move-y)) scale(0.01); }
}

// Phase 2: 一括削除・復元パフォーマンス最適化（メモ・タスク両側完了）
import { animateBulkFadeOutCSS } from '@/src/utils/deleteAnimation';

// スマートアニメーション切り替え: 30件以下=全アニメーション、30件以上=混合モード
if (ids.length > 30) {
  const animatedIds = ids.slice(0, 30);
  const bulkIds = ids.slice(30);
  // 美しいアニメーション + 効率的バックグラウンド処理
}

// 個別タイミング同期: onItemCompleteコールバックで精密制御
animateBulkFadeOutCSS(ids, onComplete, 120, 'delete', (id) => {
  // 300ms + index*120ms でアニメーション完了と同時にDOM更新
});

// DOM順序による全選択（タスクの並び替え対応）
import { getTaskDisplayOrder } from '@/src/utils/domUtils';
const domOrder = getTaskDisplayOrder();
setCheckedItems(new Set(domOrder.filter(id => filteredItems.some(item => item.id === id))));
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

### アニメーション
- `deleteAnimation.ts` - 削除アニメーション（段階的CSS化中）
  - ✅ `animateEditorContentToTrashCSS` - エディター削除（CSS版）
  - ✅ `animateBulkFadeOutCSS` - 一括削除・復元（CSS版、メモ・タスク両側完了）
  - ❌ その他の削除アニメーション（JS版）

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

## 開発制約
- 新npmパッケージ追加禁止
- 型エラー・lintエラー0維持
- セキュリティ重視（悪意コード禁止）

## 開発作業の重要原則

### ❌ 絶対にやってはいけないこと
1. **`npm run build`でエラーチェックしない** - 実際の結果が確認できていない
2. **コードを確認せずに修正提案しない** - 毎回エラーを起こしている  
3. **依存関係や変数の存在を確認せずに変更しない**

### ✅ 必ずやること
1. **必ずコードを読んでから修正する**
2. **エラーが出たら、ユーザーからエラーメッセージを聞く**
3. **変更前に影響範囲を確認する**

### 削除機能の構造

#### 左側一括削除（チェックボックスで選択したアイテム）
- **状態**: `isBulkDeleting`, `isBulkDeleteLidOpen`
- **処理**: `handleLeftBulkDelete`
- **表示条件**: `checkedMemos.size > 0` 時
- **位置**: 左パネルの右下
- **アニメーション**: 
  - ✅ **メモ**: `animateBulkFadeOutCSS` (CSS版、パフォーマンス最適化済み)
  - ✅ **タスク**: `animateBulkFadeOutCSS` (CSS版、パフォーマンス最適化済み)

#### 右側エディター削除（現在表示中のメモ・タスク）
- **状態**: `isEditorDeleting`
- **処理**: `useRightEditorDelete` (共通フック)
- **表示条件**: エディター表示中 かつ チェック無し時
- **位置**: 右パネルの右下 (`DELETE_BUTTON_POSITION = "fixed bottom-4 right-4"`)
- **アニメーション**: `animateEditorContentToTrashCSS` (CSS版) ✅

#### 削除済み完全削除（削除済みアイテムの完全削除）
- **メモ**: `use-deleted-memo-actions.ts` でCSS版使用 ✅
- **タスク**: `use-deleted-task-actions.ts` でCSS版使用 ✅
- **完了**: `animateEditorContentToTrash` → `animateEditorContentToTrashCSS` への移行完了

#### 一括復元（削除済みアイテムの復元）
- **メモ**: `use-memo-bulk-restore.tsx` でパフォーマンス最適化済み ✅
- **タスク**: `use-task-bulk-restore.tsx` でパフォーマンス最適化済み ✅

### 動的高さシステム
- **BaseCard**: タスクとメモで異なる高さを自動設定
  - タスク: `h-[170px]`
  - メモ: `h-[160px]`
  - 判定: `dataTaskId` プロパティの有無で自動切り替え

### テキストオーバーフロー対策
- **問題**: グリッドレイアウト（2列表示）でテキストがはみ出す
- **解決策**: `break-all` クラスを追加
```tsx
<p className="text-xs text-gray-600 line-clamp-1 break-all">
  {task.description || ""}
</p>
```