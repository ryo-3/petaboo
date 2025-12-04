> ⚠️ Codexに実装依頼する際は、以下を厳守すること：

- **既存ファイルを丸ごと再生成させないこと**
  → Codexへの依頼は必ず **差分（patch形式）** で行う
- **日本語コメント・文字列を扱う場合はUTF-8前提で依頼すること**
  → 文字化け防止のため明記する
- **Codexに git add / git commit を実行させないこと**
- **完了した場合ファイルを`.claude/fixed-plans` に移動する**

---

# PETABOO-46: エディター内 画像プレビューで自身の画像をドラッグドロップできてしまう

## 目的

エディター内の画像プレビュー（AttachmentGallery）で表示されている画像を自分自身のエディタードロップエリアにドラッグ＆ドロップできてしまう問題を修正する。

## 問題の原因

[attachment-gallery.tsx](apps/web/components/features/attachments/attachment-gallery.tsx) の `<img>` タグはデフォルトでドラッグ可能（`draggable="true"`がデフォルト）。

エディター（[task-editor.tsx](apps/web/components/features/task/task-editor.tsx), [memo-editor.tsx](apps/web/components/features/memo/memo-editor.tsx)）には画像ドロップエリアがあり、ファイルドロップを受け付ける。

**現状の問題**:

1. ユーザーがAttachmentGallery内の画像をドラッグ
2. 同じエディター内のドロップエリアにドロップ
3. ブラウザのドラッグ＆ドロップAPIが発火
4. 意図しない動作（エラーや二重登録など）が発生する可能性

## 変更範囲

### ファイル

- `apps/web/components/features/attachments/attachment-gallery.tsx`

### 影響範囲

- タスクエディター内の画像プレビュー
- メモエディター内の画像プレビュー
- ボード詳細内の画像プレビュー
- 画像拡大モーダル内の画像（任意）

## 実装手順

### 方法1: 画像のドラッグを無効化（推奨）

`<img>` タグに `draggable="false"` を追加して、画像のドラッグ自体を無効化する。

#### 変更箇所

**attachment-gallery.tsx**

1. 既存の画像表示部分（246-260行目付近）:

```tsx
// Before
<img
  src={imageUrl}
  alt={attachment.fileName}
  className={`w-full md:w-32 h-auto md:h-32 md:object-cover rounded-lg ${...}`}
  onClick={() => !isProcessing && setSelectedImage(imageUrl)}
  referrerPolicy="no-referrer"
/>

// After
<img
  src={imageUrl}
  alt={attachment.fileName}
  draggable={false}
  className={`w-full md:w-32 h-auto md:h-32 md:object-cover rounded-lg ${...}`}
  onClick={() => !isProcessing && setSelectedImage(imageUrl)}
  referrerPolicy="no-referrer"
/>
```

2. 保存待ち画像のプレビュー部分（471-479行目付近）:

```tsx
// Before
<img
  src={url}
  alt={`保存待ち ${index + 1}`}
  className={`w-full md:w-32 h-auto md:h-32 md:object-cover rounded-lg transition-opacity ${...}`}
  onClick={() => !isUploading && setSelectedImage(url)}
  referrerPolicy="no-referrer"
/>

// After
<img
  src={url}
  alt={`保存待ち ${index + 1}`}
  draggable={false}
  className={`w-full md:w-32 h-auto md:h-32 md:object-cover rounded-lg transition-opacity ${...}`}
  onClick={() => !isUploading && setSelectedImage(url)}
  referrerPolicy="no-referrer"
/>
```

### 方法2（任意）: 画像拡大モーダルも対応

**image-preview-modal.tsx** (109-113行目付近):

```tsx
// Before
<img
  src={imageUrl}
  alt="拡大表示"
  className="max-w-[95vw] max-h-[95vh] object-contain"
/>

// After
<img
  src={imageUrl}
  alt="拡大表示"
  draggable={false}
  className="max-w-[95vw] max-h-[95vh] object-contain"
/>
```

## 懸念点

- `draggable="false"` はすべての主要ブラウザでサポートされている
- ユーザーが意図的に画像をドラッグして他のアプリに貼り付けたい場合は動作しなくなる
  - → 画像コピー機能が既に実装されているため、代替手段として十分

## Codex用ToDoリスト

- [ ] `apps/web/components/features/attachments/attachment-gallery.tsx` を開く
- [ ] 246行目付近の `<img>` タグに `draggable={false}` を追加
- [ ] 471行目付近の `<img>` タグに `draggable={false}` を追加
- [ ] （任意）`apps/web/components/ui/modals/image-preview-modal.tsx` の109行目付近の `<img>` タグに `draggable={false}` を追加
- [ ] `npm run check:wsl` で型チェック実行
- [ ] 動作確認：画像をドラッグしてもドロップエリアが反応しないことを確認

## 参考URL

https://petaboo.vercel.app/team/moricrew?board=PETABOO&task=46
