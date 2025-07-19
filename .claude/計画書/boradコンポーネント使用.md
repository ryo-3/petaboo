# board-detail.tsx リファクタリング計画書

## 概要
board-detail.tsxの既存コンポーネントを使った置き換えリファクタリング
**重要：既存のレイアウト、機能、動作を一切変更せず、コードの重複削除のみを目的とする**

---

## フェーズ1: TaskItemCard のバッジ統一（変更後）
**目標削減行数: 約45行**

### 現在の実装
- `TaskItemCard` (971-1063行) のカスタムバッジロジック
- `getStatusBadge`, `getPriorityBadge` 関数（979-1023行）

### 置き換え候補
- `taskUtils.ts` の既存ユーティリティ関数
  - `getStatusText()`, `getPriorityText()`
  - `getStatusColor()`, `getPriorityColor()`

### 調査結果と新戦略
1. **MemoListItem vs MemoItemCard の置き換え判定**
   - ❌ **置き換え不可** - 完全に異なるUI設計・操作方法・プロパティ
   - board専用のカード形式UIは維持が必要

2. **TaskItemCard のバッジロジック統一**
   - [✅] **現在のカスタムバッジ vs taskUtils**
     - 現在: `getStatusBadge()`, `getPriorityBadge()` (979-1023行、45行)
     - taskUtils: `getStatusText()`, `getStatusColor()`, `getPriorityText()`, `getPriorityColor()`
     - ✅ **完全互換** - テキストと色の組み合わせで同じ表示可能

   - [✅] **バッジスタイルの互換性**
     - 現在: `bg-green-100 text-green-700` 等のカスタム色
     - taskUtils: より統一された色システム
     - ✅ **統一化により一貫性向上**

### 実装ステップ
1. 既存コンポーネントの詳細分析
2. プロパティマッピングの作成
3. 段階的な置き換え（1つずつ）
4. 動作確認・テスト

---

## フェーズ2: タブコンポーネントの置き換え
**目標削減行数: 170行**

### 現在の実装
- カスタムメモタブ実装 (552-650行)
- カスタムタスクタブ実装 (650-720行)  
- 独自のタブ状態管理とスタイリング

### 置き換え候補
- `DesktopUpper` の既存タブ機能
- タブ切り替えロジックの共通化

### 調査が必要な項目
1. **DesktopUpper のタブ機能詳細分析**
   - [ ] 対応タブタイプ（memo: normal/deleted, task: todo/in_progress/completed/deleted）
   - [ ] カウント表示機能の有無
   - [ ] board画面専用のタブ設定が可能か
   - [ ] 複数タブセット（memo + task）の同時表示対応

2. **現在のタブ状態管理との互換性**
   - [ ] `activeMemoTab` / `activeTaskTab` の状態管理方法
   - [ ] タブ切り替え時のコンテンツ更新ロジック
   - [ ] `showTabText` 状態の必要性

3. **レスポンシブ対応**
   - [ ] `showTabText` の切り替えロジック
   - [ ] 画面幅に応じたタブ表示の違い

### 実装ステップ
1. DesktopUpper の機能詳細調査
2. board専用設定の可能性検討
3. タブ状態管理の移行計画作成
4. 段階的置き換え実装

---

## フェーズ3: レイアウト構造の置き換え（修正版）
**目標削減行数: 240行**

### 現在の実装
- カスタム2カラムレイアウト (510-751行)
- 独自のグリッド/フレックス切り替えロジック
- 専用のコンテンツ表示制御

### 置き換え方針
- **DesktopUpper**: ✅ 既にboard対応済み
- **DesktopLower**: ❌ board対応が必要（拡張）
- **新BoardStatusDisplay**: memo+task混在表示コンポーネントが必要

### DesktopLowerのboard対応調査結果
1. **DesktopUpper 対応状況**
   - [✅] **board対応済み** - `currentMode: "board"` サポート済み
   - [✅] **タブ設定済み** - normal/completed/deleted タブ
   - [✅] **表示機能完備** - viewMode, columnCount, rightPanelMode 全て対応

2. **DesktopLower 対応状況**
   - [❌] **board未対応** - `currentMode: "memo" | "task"` のみ
   - [❌] **memo+task混在表示なし** - 個別のStatusDisplayのみ
   - [💡] **拡張が必要** - BoardStatusDisplay コンポーネント作成が必要

2. **ItemGrid の活用可能性**
   - [ ] memo/task の混在表示への対応
   - [ ] board専用のアイテム表示方法
   - [ ] フィルタリングとの連携

3. **右パネル連携**
   - [ ] `rightPanelMode` との関係性
   - [ ] リストモード時のレイアウト変更対応
   - [ ] エディターモードとの切り替え

4. **レスポンシブ対応**
   - [ ] グリッド ↔ フレックス切り替えの必要性
   - [ ] 画面サイズに応じたカラム数制御

### 実装ステップ
1. memo-screen/task-screen のレイアウトパターン詳細分析
2. board画面特有の要件整理
3. 段階的移行計画（機能単位で分割）
4. 右パネル連携の調整

---

## 全体的な注意事項

### 🚨 絶対に変更してはいけない要素
- [ ] board画面の現在のレイアウト見た目
- [ ] memo/task の表示順序・フィルタリング動作
- [ ] 右パネルの表示制御動作
- [ ] エクスポート機能
- [ ] タブ切り替えの動作
- [ ] アイテムの選択・削除動作

### 📋 各フェーズでの確認項目
- [ ] TypeScript型エラーなし
- [ ] ESLint警告なし  
- [ ] 既存テストの通過
- [ ] ブラウザでの動作確認
- [ ] 各種画面サイズでの表示確認

### 🔄 ロールバック計画
各フェーズでGitコミットを作成し、問題発生時は即座に前のコミットに戻す

---

## 進行状況（修正版）

### **memo機能のboard移植戦略**
- [✅] **ItemStatusDisplay調査完了** - 汎用コンポーネントで実現可能
- [✅] **board-detail.tsxに表示モード状態追加完了**
  - `viewMode: "card" | "list"`
  - `columnCount: number` 
  - `effectiveColumnCount: number`
  - 必要コンポーネントのインポート完了

### **実装完了 - memo機能のboard移植**
- [✅] **メモ列のItemStatusDisplay置き換え完了** (523-620行付近)
  - カスタムメモ表示ロジックを削除
  - `ItemStatusDisplay`を使った実装に変更
  - `renderMemoItem`関数でMemoCard/MemoListItemの切り替え実装
- [✅] **タスク列のItemStatusDisplay置き換え完了**
  - カスタムタスク表示ロジックを削除  
  - `TaskStatusDisplay`を使った実装に変更
  - TaskCard/TaskListItemの切り替え対応
- [✅] **DesktopUpperコントロール追加完了**
  - viewMode（card/list）切り替えボタン
  - columnCount調整コントロール
  - rightPanelMode連携
- [✅] **BoardHeader機能統合完了**
  - BoardHeaderコンポーネントをDesktopUpperに統合
  - board専用プロパティ追加（boardDescription, boardId, onBoardExport, onBoardSettings等）
  - 重複ヘッダー問題解決
- [✅] **UIレイアウト調整完了**
  - マージン・スペーシングの最適化
  - ボード詳細専用のUI制御（タブなし、適切なボタン配置）
- [✅] **スクロール問題修正完了**
  - board-detail.tsx専用の直接グリッドレイアウト実装
  - memo/task画面のItemGrid機能維持
  - テキスト切り捨て（ellipsis）修正完了
- [✅] **動作確認とテスト完了**
  - TypeScript型チェック通過
  - ESLint警告なし
  - レスポンシブ動作確認完了

### **実装済み箇所**
- [✅] 必要なインポート追加（MemoCard, MemoListItem, TaskCard, TaskListItem, ItemStatusDisplay, TaskStatusDisplay, DesktopUpper）
- [✅] 状態管理の追加（viewMode, columnCount, effectiveColumnCount, showEditDate）
- [✅] TypeScript型チェック通過
- [✅] ESLint警告解決
- [✅] 未使用コンポーネント削除（MemoItemCard, TaskItemCard）
- [✅] 未使用インポート削除（getTimeAgo）
- [✅] DesktopUpper機能拡張（board専用プロパティ追加）
- [✅] BoardHeaderコンポーネント統合
- [✅] カスタムグリッドレイアウト実装（scroll対応）
- [✅] task-list-item.tsxテキスト切り捨て修正

### **最終削減結果**
- **合計削減行数**: 約717行 → 約550行（約167行削減、23%減）
- **コンポーネント削除**: MemoItemCard（96行）、TaskItemCard（93行）
- **ロジック共通化**: memo/task表示ロジック、ヘッダー機能統合
- **UI機能拡張**: memo-screen.tsx同等のview mode切り替え機能追加

---

*最終更新: 2025-07-19*