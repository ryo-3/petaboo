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

### ステップ2: use-board-state.tsの修正 ✅

- [x] `validatePanelToggle`をインポート
- [x] 各トグルハンドラー（6箇所）のバリデーションロジックを置き換え：
  - `handleMemoToggle`
  - `handleTaskToggle`
  - `handleCommentToggle`
  - `handleListPanelToggle`
  - `handleDetailPanelToggle`
  - `handleCommentPanelToggle`

### ステップ3: board-detail-screen-3panel.tsxの修正（選択時） ✅

- [x] ヘルパー関数をインポート
- [x] 1000行目付近の選択時ロジックを置き換え：

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

- [x] `getPanelSize`関数を削除し、`sizes`オブジェクトを使用
- [x] `visiblePanels`計算をヘルパーに置き換え

### ステップ4: board-detail-screen-3panel.tsxの修正（非選択時） ✅

- [x] 1890行目付近の非選択時ロジックを置き換え
- [x] order計算をヘルパーに置き換え
- [x] `getPanelSize`関数を削除し、選択時と同じ`sizes`オブジェクト方式に統一

### ステップ5: panel-helpers.tsのクリーンアップ ✅

- [x] 未使用の`getPanelSizeByOrder`関数を削除

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

- [x] すべてのヘルパー関数が実装されている
- [x] use-board-state.tsの重複ロジックが削除されている
- [x] board-detail-screen-3panel.tsxの選択時・非選択時のパターンを統一
- [x] 型エラーがない（`npm run check:wsl` で確認済み）
- ⏸️ すべてのテスト項目のパス（動作テストはユーザー確認待ち）

---

## ✅ 完了報告（2025-11-14）

すべての実装が完了しました！

### 実施した変更

1. **ヘルパー関数の作成** (`panel-helpers.ts`)
   - 7つの関数を実装
   - 型定義も完備

2. **use-board-state.ts の完全修正**
   - 6つのトグルハンドラーすべてで`validatePanelToggle`を使用
   - 重複していたバリデーションロジックを完全に削除

3. **board-detail-screen-3panel.tsx の統一**
   - 選択時・非選択時のorder計算をヘルパーに置き換え
   - 選択時・非選択時のパネルサイズ参照を`sizes`オブジェクト方式に統一
   - 重複していた`getPanelSize`ローカル関数を削除

4. **panel-helpers.ts のクリーンアップ**
   - 未使用の`getPanelSizeByOrder`関数を削除

### コード品質

- ✅ TypeScriptエラー: 0件
- ✅ ESLint警告: 15件（今回の変更とは無関係な既存の警告のみ）

### 削減されたコード

- 約30行の重複ロジックを削除
- 一貫性のあるコードパターンに統一

---

## 🎯 元の残作業（最終5%）の詳細（完了済み）

### 目的

選択時・非選択時のパネルサイズ参照方法を統一し、コードの一貫性を向上させる

### 現状の問題

**選択時（line 1049-1053）:**

```typescript
const sizes = {
  list: calculatedSizes.left,
  detail: calculatedSizes.center,
  comment: calculatedSizes.right,
};
// 使用: defaultSize={sizes.list}
```

**非選択時（line 1974-1981）:**

```typescript
const getPanelSize = (order: number) => {
  if (order === memoPanelOrder) return calculatedSizes.left;
  if (order === taskPanelOrder) return calculatedSizes.center;
  if (order === commentPanelOrder) return calculatedSizes.right;
  return 100;
};
// 使用: defaultSize={getPanelSize(memoPanelOrder)}
```

→ **異なるパターンで混乱を招く**

### 修正内容

#### 1. board-detail-screen-3panel.tsx の非選択時（line 1974-1981）

**削除:**

```typescript
const getPanelSize = (order: number) => {
  if (order === memoPanelOrder) return calculatedSizes.left;
  if (order === taskPanelOrder) return calculatedSizes.center;
  if (order === commentPanelOrder) return calculatedSizes.right;
  return 100;
};
```

**追加:**

```typescript
const sizes = {
  memo: calculatedSizes.left,
  task: calculatedSizes.center,
  comment: calculatedSizes.right,
};
```

**使用箇所の変更（3箇所）:**

- line 2211: `defaultSize={getPanelSize(memoPanelOrder)}` → `defaultSize={sizes.memo}`
- line 2313: `defaultSize={getPanelSize(taskPanelOrder)}` → `defaultSize={sizes.task}`
- line 2426: `defaultSize={getPanelSize(commentPanelOrder)}` → `defaultSize={sizes.comment}`

#### 2. panel-helpers.ts のクリーンアップ

**削除（lines 73-86）:**

```typescript
/**
 * orderに基づいてパネルサイズを取得
 * ResizablePanelのdefaultSizeに渡す値を計算
 */
export function getPanelSizeByOrder(
  order: number,
  sizes: PanelSizes,
  orders: PanelOrders,
): number {
  if (order === orders.left) return sizes.left;
  if (order === orders.center) return sizes.center;
  if (order === orders.right) return sizes.right;
  return 0;
}
```

→ **どこでも使われていないので削除**

### 期待される効果

1. ✅ 選択時・非選択時で同じパターン
2. ✅ コードの一貫性向上
3. ✅ 理解しやすいコード
4. ✅ 未使用関数の削除
