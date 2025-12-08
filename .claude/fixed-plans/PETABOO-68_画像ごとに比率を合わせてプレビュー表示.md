# PETABOO-68: 画像ごとに比率を合わせてプレビュー表示

## ステータス: 完了

## 目的

現在、画像プレビューが正方形（PC: 48x48 / 32x32）で`object-cover`を使用しているため、画像のアスペクト比によっては重要な部分が見切れてしまう。画像ごとに元のアスペクト比を維持してプレビュー表示することで、意味のあるプレビューにする。

## 実施した変更

### ファイル: `apps/web/components/features/attachments/attachment-gallery.tsx`

### 1. 既存画像のスタイル変更（276行目付近）

**Before:**

```tsx

className={`w-full md:w-48 h-auto md:h-48 md:object-cover rounded-lg ${
```

**After:**

```tsx
className={`w-full md:min-w-32 md:max-w-80 md:min-h-32 md:max-h-64 object-contain rounded-lg ${
  isProcessing
    ? "opacity-50 cursor-default border border-gray-300"
    : isMarkedForDelete
      ? "opacity-50 border-2 border-red-400 cursor-pointer hover:opacity-80 transition-opacity"
      : "cursor-pointer hover:opacity-80 transition-opacity border border-gray-300"
}`}
```

### 2. 保存待ち画像のスタイル変更（532行目付近）

**Before:**

```tsx
className={`w-full md:w-32 h-auto md:h-32 md:object-cover rounded-lg transition-opacity ${
```

**After:**

```tsx
className={`w-full md:min-w-24 md:max-w-64 md:min-h-24 md:max-h-48 object-contain rounded-lg transition-opacity ${
  isUploading
    ? "opacity-50 border border-gray-300"
    : "cursor-pointer hover:opacity-80 border-2 border-blue-400"
}`}
```

## 変更内容まとめ

| 項目         | Before                     | After                                           |
| ------------ | -------------------------- | ----------------------------------------------- |
| サイズ指定   | 固定サイズ（w-48 h-48）    | 範囲指定（min-w-32 max-w-80 min-h-32 max-h-64） |
| フィット方式 | `object-cover`（クロップ） | `object-contain`（アスペクト比維持）            |
| ボーダー     | なし                       | `border border-gray-300`                        |

## 効果

- 画像が元のアスペクト比を維持して表示される
- 正方形にクロップされなくなり、画像全体が見える
- 縦長・横長の画像も意味のあるプレビューになる
- ボーダーにより画像の境界がわかりやすくなった
