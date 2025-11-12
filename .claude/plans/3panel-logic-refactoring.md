# 3パネルレイアウトのロジック整理Plan

> ⚠️ Codexに実装依頼する際は、以下を厳守すること：
>
> - **既存ファイルを丸ごと再生成させないこと** → Codexへの依頼は必ず **差分（patch形式）** で行う
> - **日本語コメント・文字列を扱う場合はUTF-8前提で依頼すること** → 文字化け防止のため明記する
> - **Codexに git add / git commit を実行させないこと**
> - **完了した場合ファイルを`.claude/fixed-plans` に移動する**

## 目的

3パネルレイアウトの状態管理ロジックを整理し、コードの可読性とメンテナンス性を向上させる。

**重要**: パネル幅の保存・復元機能はそのまま維持する（ユーザー体験を変えない）

## 現状の問題点

1. **order計算ロジックの重複**
   - 選択時（1000行目付近）と非選択時（1890行目付近）で同じロジックが重複

2. **パネルサイズ計算ロジックの重複**
   - `getPanelSize`関数が選択時・非選択時で2箇所に存在

3. **表示/非表示の条件分岐が複雑**
   - 8通りのパターンをif-elseで処理している

4. **バリデーションロジックの重複**
   - 「最低1つのパネルは表示」の制約が各トグルハンドラーに重複

## 変更範囲

### 新規作成

- `apps/web/src/utils/panel-helpers.ts` ✅ 作成済み
  - パネル表示計算のヘルパー関数を集約

### 修正対象

- `apps/web/components/screens/board-detail-screen-3panel.tsx`
  - ヘルパー関数を使用するよう書き換え
  - 重複ロジックを削除

- `apps/web/src/hooks/use-board-state.ts`
  - バリデーションロジックをヘルパー関数に置き換え

## 実装手順

### ステップ1: ヘルパー関数の作成 ✅

- [x] `panel-helpers.ts`を作成
- [x] 以下の関数を実装：
  - `calculatePanelOrders()` - order計算
  - `countVisiblePanels()` - 表示パネル数
  - `calculatePanelSizes()` - パネルサイズ計算
  - `getPanelSizeByOrder()` - orderからサイズ取得
  - `validatePanelToggle()` - 表示切り替えのバリデーション

### ステップ2: use-board-state.tsの修正

- [ ] `validatePanelToggle`をインポート
- [ ] 各トグルハンドラー（6箇所）のバリデーションロジックを置き換え：
  - `handleMemoToggle`
  - `handleTaskToggle`
  - `handleCommentToggle`
  - `handleListPanelToggle`
  - `handleDetailPanelToggle`
  - `handleCommentPanelToggle`

### ステップ3: board-detail-screen-3panel.tsxの修正（選択時）

- [ ] ヘルパー関数をインポート
- [ ] 1000行目付近の選択時ロジックを置き換え：

  ```typescript
  // 修正前
  let currentOrder = 0;
  const listOrder = showListPanel ? ++currentOrder : 0;
  const detailOrder = showDetailPanel ? ++currentOrder : 0;
  const commentOrder = showCommentPanel ? ++currentOrder : 0;

  // 修正後
  const orders = calculatePanelOrders({
    left: showListPanel,
    center: showDetailPanel,
    right: showCommentPanel,
  });
  const { left: listOrder, center: detailOrder, right: commentOrder } = orders;
  ```

- [ ] `getPanelSize`関数をヘルパーに置き換え
- [ ] `visiblePanels`計算をヘルパーに置き換え

### ステップ4: board-detail-screen-3panel.tsxの修正（非選択時）

- [ ] 1890行目付近の非選択時ロジックを置き換え
- [ ] order計算をヘルパーに置き換え
- [ ] `getPanelSize`関数をヘルパーに置き換え

## 影響範囲

### 変更する機能

- なし（内部ロジックの整理のみ）

### 変更しない機能

- ✅ パネル幅の保存・復元機能
- ✅ パネルの表示/非表示切り替え
- ✅ 3パネル/2パネル/1パネルの動作
- ✅ モバイル/デスクトップの切り替え

## 懸念点

1. **型安全性**: ヘルパー関数にしっかりとした型定義が必要
   - ✅ 解決済み: PanelVisibility, PanelSizes, PanelOrders型を定義

2. **既存の動作を壊さないか**:
   - リファクタリングなので慎重にテストが必要
   - 特にパネルサイズ計算のロジックは重要

3. **パフォーマンス**:
   - 関数呼び出しが増えるが、軽量な計算なので影響は無視できる

## テスト項目

- [ ] 3パネル表示で幅を変更して保存・復元できるか
- [ ] 2パネル表示で固定幅（30:70）になるか
- [ ] 1パネル表示で100%になるか
- [ ] パネルを非表示にしても最低1つは表示されるか
- [ ] 選択時・非選択時の両方で正しく動作するか
- [ ] モバイルで1パネル固定になるか

## 完了条件

- [ ] すべてのヘルパー関数が実装されている
- [ ] use-board-state.tsの重複ロジックが削除されている
- [ ] board-detail-screen-3panel.tsxの重複ロジックが削除されている
- [ ] すべてのテスト項目がパスする
- [ ] 型エラーがない
