# コンポーネント名リネーム計画 - わかりやすい命名へ

> ⚠️ Codexに実装依頼する際は、以下を厳守すること：
>
> - **既存ファイルを丸ごと再生成させないこと** → Codexへの依頼は必ず **差分（patch形式）** で行う
> - **日本語コメント・文字列を扱う場合はUTF-8前提で依頼すること** → 文字化け防止のため明記する
> - **Codexに git add / git commit を実行させないこと**
> - **完了した場合ファイルを`.claude/fixed-plans` に移動する**

## 📋 目的

コンポーネント名が実際の役割と一致せず、開発時に混乱を招いている問題を解決する。

### 現状の問題点

- `ItemStatusDisplay` → 名前は「ステータス表示」だが、実際は「アイテム一覧表示」を担当
- `ItemDisplay` → 名前が汎用的すぎて、「1枚のカード表示」という役割が不明確
- 「一覧」と言っているのに「カード」や「ステータス」というコンポーネント名で混乱

## 🔍 現在のコンポーネント構造

### 階層構造

```
MemoStatusDisplay / TaskStatusDisplay (メモ/タスク専用ラッパー)
  └─ ItemStatusDisplay (汎用一覧表示 - ソート・フィルター・グリッド表示)
       └─ ItemGrid (グリッドレイアウト)
            └─ ItemDisplay (1枚のカード表示)
```

### 各コンポーネントの役割

#### 1. `ItemStatusDisplay`

- **ファイル**: `apps/web/components/ui/layout/item-status-display.tsx`
- **実際の役割**: アイテム一覧をグリッド表示（ソート・選択機能含む）
- **使用箇所**:
  - `MemoStatusDisplay` から呼び出し
  - `TaskStatusDisplay` から呼び出し
- **問題**: 名前が「ステータス表示」に見えるが、実際は「一覧表示」

#### 2. `ItemDisplay`

- **ファイル**: `apps/web/components/ui/layout/item-display.tsx`
- **実際の役割**: 1枚のメモ/タスクカードを表示
- **Propsの内容**:
  - `itemType: "memo" | "task"`
  - `item: Memo | Task | DeletedMemo | DeletedTask`
  - チェックボックス、選択状態、タグ、ボード名、画像サムネイル、日付表示など
- **使用箇所**: `MemoStatusDisplay`と`TaskStatusDisplay`の`renderMemo`/`renderTask`内
- **問題**: 汎用的すぎて「カード1枚」という役割が不明確

#### 3. `MemoStatusDisplay` / `TaskStatusDisplay`

- **ファイル**:
  - `apps/web/components/features/memo/memo-status-display.tsx`
  - `apps/web/components/features/task/task-status-display.tsx`
- **役割**: メモ/タスク専用のラッパー（フィルター、タグ・ボード情報の紐付け）
- **問題**: 特になし（適切な命名）

#### 4. `ItemGrid`

- **ファイル**: `apps/web/components/ui/layout/item-grid.tsx`
- **役割**: グリッドレイアウト（カラム数に応じたCSS Grid）
- **問題**: 特になし（適切な命名）

## 🎯 リネーム提案

### 提案1: 役割を明確にする命名

| 現在の名前          | 新しい名前        | 理由                              |
| ------------------- | ----------------- | --------------------------------- |
| `ItemStatusDisplay` | `ItemListDisplay` | 「一覧表示」であることを明確化    |
| `ItemDisplay`       | `ItemCard`        | 「1枚のカード」であることを明確化 |

### 提案2: より具体的な命名（検討中）

| 現在の名前          | 新しい名前     | 理由                              |
| ------------------- | -------------- | --------------------------------- |
| `ItemStatusDisplay` | `ItemGridList` | グリッド表示であることも明示      |
| `ItemDisplay`       | `MemoTaskCard` | メモ/タスク両対応であることを明示 |

## 📝 変更範囲

### 1. ファイル名変更

- `apps/web/components/ui/layout/item-status-display.tsx` → `item-list-display.tsx` (または `item-grid-list.tsx`)
- `apps/web/components/ui/layout/item-display.tsx` → `item-card.tsx`

### 2. コンポーネント名変更（export/import）

- `ItemStatusDisplay` → `ItemListDisplay`
- `ItemDisplay` → `ItemCard`

### 3. 影響を受けるファイル（import変更）

- `apps/web/components/features/memo/memo-status-display.tsx`
  - `import ItemStatusDisplay` → `import ItemListDisplay`
  - `import ItemDisplay` → `import ItemCard`
- `apps/web/components/features/task/task-status-display.tsx`
  - 同上

### 4. 型定義名変更

- `ItemStatusDisplayProps` → `ItemListDisplayProps`
- `ItemDisplayProps` → `ItemCardProps`

## ⚠️ 注意点

### 破壊的変更

- この変更はファイル名とコンポーネント名を変更するため、gitの履歴追跡が困難になる可能性がある
- `git mv` を使用してファイル名を変更し、履歴を保持する

### テスト

- リネーム後、以下の画面で動作確認が必要：
  - メモ一覧
  - タスク一覧
  - ボード詳細（メモ一覧）
  - ボード詳細（タスク一覧）
  - 削除済みアイテム一覧

## 🚀 実装手順

### Step 1: ファイル名変更（git mv使用）

```bash
cd apps/web/components/ui/layout
git mv item-status-display.tsx item-list-display.tsx
git mv item-display.tsx item-card.tsx
```

### Step 2: コンポーネント名・型名変更

各ファイル内の以下を変更：

- `function ItemStatusDisplay` → `function ItemListDisplay`
- `export default ItemStatusDisplay` → `export default ItemListDisplay`
- `interface ItemStatusDisplayProps` → `interface ItemListDisplayProps`
- `function ItemDisplay` → `function ItemCard`
- `export default ItemDisplay` → `export default ItemCard`
- `interface ItemDisplayProps` → `interface ItemCardProps`

### Step 3: import文変更

- `memo-status-display.tsx`
- `task-status-display.tsx`

### Step 4: 動作確認

- `npm run check:wsl` でTypeScriptエラーがないか確認
- 各画面で表示が正しいか確認

### Step 5: コミット

```bash
git add .
git commit -m "refactor: コンポーネント名を役割に合わせてリネーム

- ItemStatusDisplay → ItemListDisplay（一覧表示の役割を明確化）
- ItemDisplay → ItemCard（カード1枚の役割を明確化）
"
```

## 🤔 検討事項

### 最終的な命名の決定

- `ItemListDisplay` vs `ItemGridList` - どちらがわかりやすいか？
- `ItemCard` vs `MemoTaskCard` - より具体的な名前が必要か？

→ ユーザーと相談して決定

## 📌 補足

この変更により：

- ✅ 「一覧」と言ったときに`ItemListDisplay`が該当することが明確になる
- ✅ 「カード」と言ったときに`ItemCard`が該当することが明確になる
- ✅ コード理解とメンテナンスが容易になる
