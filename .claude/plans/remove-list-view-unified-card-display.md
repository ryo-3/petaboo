# カード表示統一＆UI簡素化実装計画

> ⚠️ Codexに実装依頼する際は、以下を厳守すること：
>
> - **既存ファイルを丸ごと再生成させないこと**
>   → Codexへの依頼は必ず **差分（patch形式）** で行う
> - **日本語コメント・文字列を扱う場合はUTF-8前提で依頼すること**
>   → 文字化け防止のため明記する
> - **Codexに git add / git commit を実行させないこと**
> - **完了した場合ファイルを`.claude/fixed-plans` に移動する**

---

## 🎯 目的

メモ・タスク一覧を**カード表示のみ**に統一し、リスト表示を削除。カード表示時は常にボード名・タグを表示し、切り替えボタンを削除してUIをシンプル化する。

## 📋 変更内容

### 1️⃣ 削除するコンポーネント・ファイル

- `ViewModeToggle` コンポーネント（`apps/web/components/ui/layout/view-mode-toggle.tsx`）
- `BoardNameToggle` コンポーネント（`apps/web/components/ui/buttons/board-name-toggle.tsx`）
- `TagDisplayToggle` コンポーネント（`apps/web/components/ui/buttons/tag-display-toggle.tsx`）
- `CardViewIcon` / `ListViewIcon` コンポーネント（`apps/web/components/icons/`）
- `useViewModeStorage` フック（`apps/web/src/hooks/use-view-mode-storage.ts`）

### 2️⃣ DB・型定義の変更

**API側スキーマ（apps/api）**

- `apps/api/src/db/schema/user-preferences.ts`: `memoViewMode`, `taskViewMode` カラム削除
- マイグレーション作成（ALTER TABLE でカラム削除）

**Web側型定義（apps/web）**

- `apps/web/src/contexts/user-preferences-context.tsx`: `memoViewMode`, `taskViewMode` プロパティ削除

### 3️⃣ フック・ユーティリティの修正

**`apps/web/src/hooks/use-screen-state.ts`**

- `viewMode` を削除し、固定で `"card"` を使用
- `useViewModeStorage` の呼び出しを削除
- 戻り値から `viewMode`, `setViewMode` を削除

**`apps/web/src/hooks/use-board-state.ts`**

- 同様に `viewMode` 関連を削除

**`apps/web/src/utils/domUtils.ts`**

- リスト表示関連の処理を削除（必要に応じて）

### 4️⃣ UI層の修正（25ファイル）

**コントロールパネル（`apps/web/components/ui/controls/control-panel.tsx`）**

- `ViewModeToggle` のimport削除
- `BoardNameToggle` のimport削除
- `TagDisplayToggle` のimport削除
- これらコンポーネントの表示削除
- Props から関連する型定義を削除

**レイアウト（`apps/web/components/layout/desktop-upper.tsx`）**

- `viewMode` Props削除
- `onViewModeChange` Props削除
- `showBoardName` / `onShowBoardNameChange` Props削除
- `showTagDisplay` / `onShowTagDisplayChange` Props削除
- ControlPanelへの渡し方を修正

**レイアウト（`apps/web/components/layout/desktop-lower.tsx`）**

- `viewMode` Props削除
- `showBoardName`, `showTags` を常に `true` として扱う

**アイテム表示（`apps/web/components/ui/layout/item-display.tsx`）**

- `viewMode` Props削除（すべて `"card"` として扱う）
- `viewMode="list"` 分岐を削除
- カード表示のみのスタイルに統一
- `showBoardName` と `showTags` を常に `true` として扱う

**グリッド（`apps/web/components/ui/layout/item-grid.tsx`）**

- `viewMode` Props削除（すべて `"card"` として扱う）
- `viewMode="list"` 分岐を削除
- カード表示のグリッドレイアウトのみ残す

**各画面（memo-screen.tsx, task-screen.tsx, board-screen.tsx）**

- `viewMode` 関連の state/props を削除
- `showBoardName`, `showTagDisplay` の state を削除（常に表示）
- `setViewMode` の呼び出しを削除
- `onViewModeChange` Props を削除

**その他影響ファイル**

- `apps/web/components/screens/board-detail-screen.tsx`
- `apps/web/components/screens/board-detail-screen-3panel.tsx`
- `apps/web/components/features/board/board-task-section.tsx`
- `apps/web/components/features/board/board-memo-section.tsx`
- `apps/web/components/ui/layout/item-status-display.tsx`
- `apps/web/components/features/memo/memo-status-display.tsx`
- `apps/web/components/features/task/task-status-display.tsx`
- `apps/web/components/features/memo/use-memo-bulk-delete-wrapper.tsx`
- `apps/web/components/features/task/use-task-bulk-delete-wrapper.tsx`

### 5️⃣ LocalStorage クリーンアップ（オプション）

既存ユーザーの localStorage から以下のキーを削除する処理を追加:

- `memo-view-mode`
- `task-view-mode`
- `board-view-mode`

※アプリ初回レンダリング時にクリーンアップ処理を実行（任意対応）

## ⚠️ 懸念点・注意事項

1. **既存データの影響**
   - user-preferences テーブルのカラム削除は既存DBに影響
   - マイグレーション作成が必要（ローカル環境のみ実行）

2. **ボード詳細画面の確認**
   - ボード内でのメモ・タスク表示も同様にカード統一

3. **モバイル表示**
   - モバイルでもカード表示（スクロール量は増える可能性あり）

## 🔄 実装手順

### フェーズ1: DB・スキーマ変更

1. **API側スキーマ編集**
   - `apps/api/src/db/schema/user-preferences.ts`
   - `memoViewMode`, `taskViewMode` カラムを削除

2. **マイグレーション生成**
   - `npm run db:generate` 実行
   - 生成されたマイグレーションファイルを確認

3. **マイグレーション実行（ローカルのみ）**
   - `npm run db:migration:local`

### フェーズ2: 型定義・Context修正

4. **Web側型定義更新**
   - `apps/web/src/contexts/user-preferences-context.tsx`
   - `UserPreferences` 型から `memoViewMode`, `taskViewMode` を削除
   - `updatePreferences` の型定義も更新
   - デフォルト値から削除

### フェーズ3: 共通フック修正

5. **use-view-mode-storage.ts 削除**
   - ファイル丸ごと削除

6. **use-screen-state.ts 修正**
   - `useViewModeStorage` import削除
   - `viewMode` state削除
   - `setViewMode` 削除
   - すべて固定で `"card"` を使用
   - 戻り値の型定義から削除

7. **use-board-state.ts 修正**
   - 同様の対応

### フェーズ4: コンポーネント削除

8. **削除対象コンポーネント**
   - `apps/web/components/ui/layout/view-mode-toggle.tsx`
   - `apps/web/components/ui/buttons/board-name-toggle.tsx`
   - `apps/web/components/ui/buttons/tag-display-toggle.tsx`
   - `apps/web/components/icons/card-view-icon.tsx`
   - `apps/web/components/icons/list-view-icon.tsx`

### フェーズ5: UI層の一括修正

9. **control-panel.tsx**
   - import削除
   - Props削除
   - コンポーネント削除

10. **desktop-upper.tsx**
    - Props削除
    - ControlPanelへの渡し方修正

11. **desktop-lower.tsx**
    - Props削除
    - 常に `showBoardName={true}`, `showTags={true}` 扱い

12. **item-display.tsx**
    - `viewMode` Props削除
    - すべてカード表示スタイルに統一
    - `showBoardName`, `showTags` を常に有効として扱う

13. **item-grid.tsx**
    - `viewMode` Props削除
    - カードグリッドレイアウトのみ残す

14. **各画面コンポーネント修正**
    - `memo-screen.tsx`
    - `task-screen.tsx`
    - `board-screen.tsx`
    - `board-detail-screen.tsx`
    - `board-detail-screen-3panel.tsx`
    - その他影響ファイル（約20ファイル）

### フェーズ6: 品質チェック

15. **型チェック＆lint**
    - `npm run check:wsl`
    - `npm run check:api`
    - エラー修正

16. **動作確認**
    - メモ一覧表示
    - タスク一覧表示
    - ボード一覧表示
    - ボード詳細表示

## ✅ 完了条件

- ✅ リスト表示関連のコードが完全に削除されている
- ✅ カード表示でボード名・タグが常に表示される
- ✅ ヘッダーの切り替えボタンが消えている
- ✅ 型エラー・lintエラーがゼロ
- ✅ メモ・タスク・ボード一覧が正常に動作する
- ✅ マイグレーションが正常に適用されている

## 📝 Codex用ToDoリスト

### DB・型定義

- [ ] `apps/api/src/db/schema/user-preferences.ts` から `memoViewMode`, `taskViewMode` 削除
- [ ] マイグレーション生成・実行
- [ ] `apps/web/src/contexts/user-preferences-context.tsx` の型定義更新

### 共通フック

- [ ] `apps/web/src/hooks/use-view-mode-storage.ts` 削除
- [ ] `apps/web/src/hooks/use-screen-state.ts` 修正
- [ ] `apps/web/src/hooks/use-board-state.ts` 修正

### コンポーネント削除

- [ ] ViewModeToggle 削除
- [ ] BoardNameToggle 削除
- [ ] TagDisplayToggle 削除
- [ ] CardViewIcon / ListViewIcon 削除

### UI層修正

- [ ] control-panel.tsx 修正
- [ ] desktop-upper.tsx 修正
- [ ] desktop-lower.tsx 修正
- [ ] item-display.tsx 修正
- [ ] item-grid.tsx 修正
- [ ] memo-screen.tsx 修正
- [ ] task-screen.tsx 修正
- [ ] board-screen.tsx 修正
- [ ] その他影響ファイル修正（約15ファイル）

### 品質チェック

- [ ] 型チェック実行
- [ ] lint実行
- [ ] 動作確認

---

**作成日**: 2025-01-07
**最終更新**: 2025-01-07
