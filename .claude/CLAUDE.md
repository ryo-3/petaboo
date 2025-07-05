# Claude開発仕様書

## プロジェクト概要
- **メモ帳アプリ**: メモとタスクの統合管理アプリ
- **技術スタック**: 
  - **フロントエンド**: Next.js + TypeScript + Tailwind CSS
  - **バックエンド**: Hono + SQLite
  - **認証**: Clerk
- **アーキテクチャ**: Turborepo monorepo構成

## 基本設計原則
- **共通化ファースト**: 2回以上使われる可能性があるなら即座に共通化
- **Props設計**: variant, size, color等のオプションで拡張性重視
- **親からサイズ指定**: デフォルト値は定義せず、明示的にサイズを渡す
- **CSS-First アニメーション**: JavaScript制御よりCSS @keyframesを優先
- **段階的リファクタリング**: 既存機能を壊さず段階的に改善

## 主要システム

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
```

## 重要コンポーネント

### 共通基盤コンポーネント
- `domUtils.ts` - DOM順序取得とアイテム選択
- `ConfirmationModal` - 確認ダイアログ統一
- `BaseCard`, `BaseViewer` - レイアウト共通化
- `DeleteButton` - 削除ボタン統一（TrashIcon CSS化済み）
- `SaveButton` - 保存ボタン統一（変更検知対応、CSS化済み）
- `CustomSelector` - セレクター統一

### UIコントロール
- `TaskSortToggle` - 並び替えトグル
- `EditDateToggle` - 編集日表示切り替え
- `TrashIcon` - ゴミ箱アイコン（CSS制御）

### 共通フック
- `useSelectionHandlers` - 選択ハンドラーパターン統一
- `useRightEditorDelete` - 右側エディター削除処理統一
- `use-bulk-restore` - 復元処理統一（メモ・タスク共通）

### アニメーション
- `deleteAnimation.ts` - 削除アニメーション（段階的CSS化中）
  - ✅ `animateEditorContentToTrashCSS` - エディター削除（CSS版）
  - ❌ `animateMultipleItemsToTrash` - 複数アイテム（JS版）
  - ❌ その他の削除アニメーション（JS版）

## UIコントロール統一規則
- **サイズ**: buttonSize="size-7", iconSize="size-5", arrowSize="w-2.5 h-3"
- **色**: 背景=bg-gray-100, アクティブ=bg-white shadow-sm, 非アクティブ=text-gray-400

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
- **アニメーション**: `animateMultipleItemsToTrash` (JS版)

#### 右側エディター削除（現在表示中のメモ・タスク）
- **状態**: `isEditorDeleting`
- **処理**: `useRightEditorDelete` (共通フック)
- **表示条件**: エディター表示中 かつ チェック無し時
- **位置**: 右パネルの右下 (`DELETE_BUTTON_POSITION = "fixed bottom-4 right-4"`)
- **アニメーション**: `animateEditorContentToTrashCSS` (CSS版) ✅

#### 削除済み完全削除（削除済みアイテムの完全削除）
- **メモ**: `use-deleted-memo-actions.ts` でJS版使用 ❌
- **タスク**: `use-deleted-task-actions.ts` でJS版使用 ❌
- **次回作業**: `animateEditorContentToTrash` → `animateEditorContentToTrashCSS`