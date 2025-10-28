# スマホデザイン基準

## レイアウト構造

### メインコンテナのパディング

**標準パターン（メモ一覧、タスク一覧、ボード一覧など）:**

```tsx
<div className="w-full pt-2 md:pt-3 pl-2 md:pl-5 md:pr-2 flex-col relative">
```

**パディング詳細:**

- **上**: `pt-2 md:pt-3` （スマホ 8px / PC 12px）
- **左**: `pl-2 md:pl-5` （スマホ 8px / PC 20px）
- **右**: `md:pr-2` （スマホ **0px** / PC 8px）
- **下**: なし（コンテンツ側で調整）

**設計思想:**

- スマホでは右側パディングを0にして、画面幅を最大限活用
- スクロールエリア内で `pr-2` を設定してスクロールバーとの余白を確保
- PCでは左右にパディングを設けて余裕を持たせる

### スクロールエリア

```tsx
<div className="flex-1 overflow-y-auto overflow-x-hidden hover-scrollbar pr-2 pb-10 mb-2">
  <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
    {/* カード */}
  </div>
</div>
```

**重要: スクロールバー配置の設計**

外側コンテナに `pr-2` をつけた場合:

```
[コンテンツ][スクロールバー] [8pxの余白]
                             ↑ 画面端から離れる
```

→ スクロールバーが内側に食い込み、コンテンツ幅が狭くなる

内側スクロールエリアに `pr-2` をつけた場合:

```
[コンテンツ] [8pxの余白][スクロールバー]
                        ↑ 画面端ギリギリ
```

→ スクロールバーが画面端に配置され、コンテンツとの間に余白ができる

**ポイント:**

- `pr-2`: コンテンツとスクロールバーの間に余白を作る（スマホでも適用）
- `pb-10 mb-2`: 下部余白でFABボタンとの重なり回避
- グリッドの `gap-3` (12px) も実質的な右側余白として機能する

## ヘッダー領域

### タイトル + 追加ボタン

```tsx
<div className="flex items-center gap-2">
  <h1 className="font-bold text-gray-800 text-[22px] w-[105px] truncate">
    メモ一覧
  </h1>
  <button className="p-2 rounded-lg text-white bg-Green">
    <PlusIcon className="w-3.5 h-3.5" />
  </button>
</div>
```

**統一ルール:**

- タイトルサイズ: `text-[22px]` で統一
- 追加ボタン: `p-2` + アイコン `w-3.5 h-3.5`

### ツールバー（スマホ最適化）

```tsx
<div className="flex items-center gap-2 h-7 mb-1.5">
  {/* PCのみ表示する機能 */}
  <div className="hidden md:block">{/* 列数選択など */}</div>

  {/* スマホでも表示する機能 */}
  <button className="bg-gray-100 rounded-lg size-7">{/* ... */}</button>
</div>
```

**最適化方針:**

- `hidden md:block`: PCのみ表示（列数選択、詳細設定など）
- スマホでは必要最小限のボタンのみ表示

## 2パネルレイアウト（PC横並び / スマホ縦並び）

### 基本構造（チーム一覧など）

```tsx
<div className="flex-1 flex flex-col gap-4 pb-6 overflow-auto">
  <div className="flex flex-col md:flex-row gap-4 flex-1">
    {/* 左パネル */}
    <div className="flex-1 md:min-h-0 min-h-[300px]">
      <Card className="p-4 md:p-6 h-full flex flex-col">
        <h3 className="text-base md:text-lg font-bold mb-3 md:mb-4">
          所属チーム
        </h3>
        <div className="space-y-2 md:space-y-3 overflow-auto flex-1">
          {/* コンテンツ */}
        </div>
      </Card>
    </div>

    {/* 右パネル */}
    <div className="flex-1 md:min-h-0 min-h-[300px]">
      <Card className="p-4 md:p-6 h-full flex flex-col">{/* ... */}</Card>
    </div>
  </div>
</div>
```

**レスポンシブ設定:**

- コンテナ: `flex flex-col md:flex-row` （スマホ縦 / PC横）
- パネル: `min-h-[300px]` でスマホ時の最低高さ確保
- カードパディング: `p-4 md:p-6` （スマホ小さめ / PC大きめ）
- 見出し: `text-base md:text-lg` （スマホ小さめ / PC大きめ）
- アイテム間隔: `space-y-2 md:space-y-3`

## サイズ調整パターン

### アイコンサイズ

```tsx
// スマホ小さめ / PC大きめ
<Icon className="w-6 h-6 md:w-8 md:h-8" />

// 統一サイズ（サイドバーボタンなど）
<Icon className="w-5 h-5" />
```

### フォントサイズ

```tsx
// タイトル: 全画面統一
className = "text-[22px]";

// 見出し: レスポンシブ
className = "text-base md:text-lg";

// 本文: レスポンシブ
className = "text-xs md:text-sm";
```

### 余白

```tsx
// パディング
className = "p-4 md:p-6";
className = "px-3 py-2 md:px-4 md:py-3";

// マージン
className = "mb-3 md:mb-4";
className = "gap-2 md:gap-3";
```

## FABボタン（スマホのみ）

```tsx
<button className="md:hidden fixed bottom-16 right-2 size-9 bg-Green hover:bg-Green/90 text-white rounded-full shadow-lg flex items-center justify-center z-20">
  <PlusIcon className="size-5" />
</button>
```

**配置:**

- `fixed bottom-16 right-2`: 下部ナビゲーションバー（h-14）の上
- `size-9`: 36px × 36px
- `z-20`: 他の要素より前面

## ナビゲーションバー

### 位置

```tsx
// サイドバーコンテナ
<div className="fixed left-0 right-0 md:top-16 bottom-0 md:bottom-auto md:w-16 w-full md:h-screen h-14 md:border-r md:border-b-0 border-t border-gray-200">
```

**レスポンシブ:**

- スマホ: `bottom-0` + `h-14` （画面下部、高さ56px）
- PC: `md:top-16` + `md:w-16` （画面左側、幅64px）

### メインコンテンツエリアの調整

```tsx
<div className="flex-1 md:ml-16 ml-0 h-screen overflow-hidden md:pt-16 pt-0 md:mb-0 mb-14">
```

**マージン:**

- スマホ: `mb-14` （下部ナビゲーションバーの高さ分）
- PC: `md:ml-16 md:pt-16` （左サイドバー + 上ヘッダーの分）

## テキスト省略

### 1行省略

```tsx
<div className="flex items-center gap-2 min-w-0">
  <span className="truncate flex-1">長いテキストは省略される</span>
  <span className="flex-shrink-0">固定要素</span>
</div>
```

**ポイント:**

- 親要素に `min-w-0` 必須
- 省略する要素に `truncate` + `flex-1`
- 固定する要素に `flex-shrink-0`

### 複数行省略

```tsx
<p className="text-xs text-gray-600 line-clamp-4">
  長いテキストは4行まで表示して省略
</p>
```

## グリッドレイアウト

### メモ・タスクカード

```tsx
<div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
  {/* カード */}
</div>
```

**レスポンシブブレークポイント:**

- デフォルト（~767px）: 1列
- md（768px~）: 2列
- lg（1024px~）: 3列
- xl（1280px~）: 4列

## 説明文の表示制御

```tsx
<div className="text-sm text-gray-500 hidden md:block">
  PCでは表示、スマホでは非表示の説明文
</div>
```

**用途:**

- ヘッダーの補足説明
- 詳細な操作ガイド
- スマホでは省略可能な情報

## チェックリスト

新規画面作成時は以下を確認：

- [ ] メインコンテナのパディング: `pl-2 md:pl-5 md:pr-2 pt-2 md:pt-3`
- [ ] タイトルサイズ: `text-[22px]`
- [ ] スクロールエリア: `overflow-auto pr-2 pb-10`
- [ ] FABボタン: `bottom-16 right-2` で配置（スマホのみ）
- [ ] 2パネルは `flex-col md:flex-row` で縦→横
- [ ] カードパディング: `p-4 md:p-6`
- [ ] 見出し: `text-base md:text-lg`
- [ ] アイコン: `w-6 h-6 md:w-8 md:h-8` または `w-5 h-5`
- [ ] 余白: `gap-2 md:gap-3`, `mb-3 md:mb-4`
- [ ] テキスト省略: `min-w-0` + `truncate` + `flex-shrink-0`
- [ ] 不要な説明文: `hidden md:block` で非表示化
