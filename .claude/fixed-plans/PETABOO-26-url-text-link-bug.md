# PETABOO-26: URL入力＋テキストでテキストがURLに紐づいてしまう

> ⚠️ Codexに実装依頼する際は、以下を厳守すること：
>
> - **既存ファイルを丸ごと再生成させないこと**
>   → Codexへの依頼は必ず **差分（patch形式）** で行う
> - **日本語コメント・文字列を扱う場合はUTF-8前提で依頼すること**
>   → 文字化け防止のため明記する
> - **Codexに git add / git commit を実行させないこと**
> - **完了した場合ファイルを`.claude/fixed-plans` に移動する**

---

## 目的

TiptapエディタでURLを入力した後に続けてテキストを入力すると、そのテキストもリンクの一部として扱われてしまうバグを修正する。

## 問題の原因

Tiptapの`Link`エクステンションは、デフォルトで`inclusive: true`の挙動となっている。
これにより、リンクマーク内にカーソルがある状態で入力を続けると、入力したテキストも同じマーク（リンク）の一部として扱われる。

### 参考Issue

- [After inserting the link, all words are also part of the link · Issue #2571](https://github.com/ueberdosis/tiptap/issues/2571)

## 解決策

`Link.configure()`を`Link.extend({ inclusive: false }).configure()`に変更する。

`inclusive: false`を設定することで、リンクマークがカーソルの最終位置を含まなくなり、リンク終端でテキスト入力するとリンク外のテキストになる。

---

## 変更範囲

### 変更ファイル

- `apps/web/components/features/memo/tiptap-editor.tsx`

---

## 実装手順

### ステップ1: Link拡張の変更

**対象ファイル**: `apps/web/components/features/memo/tiptap-editor.tsx`

**変更箇所**: Line 174-182

**変更前**:

```typescript
Link.configure({
  openOnClick: true,
  autolink: true,
  linkOnPaste: true,
  HTMLAttributes: {
    class:
      "!text-blue-600 hover:!text-blue-800 underline cursor-pointer break-all",
  },
}),
```

**変更後**:

```typescript
Link.extend({
  inclusive: false,
}).configure({
  openOnClick: true,
  autolink: true,
  linkOnPaste: true,
  HTMLAttributes: {
    class:
      "!text-blue-600 hover:!text-blue-800 underline cursor-pointer break-all",
  },
}),
```

---

## 影響範囲・懸念点

1. **影響範囲**: メモエディタ、タスクエディタなど、`TiptapEditor`コンポーネントを使用している全箇所
2. **期待される動作変化**:
   - URL入力後にスペースなしで続けてテキストを入力しても、テキストはリンク外になる
   - 既存のリンクの中にカーソルを置いて入力しても、リンク外のテキストになる
3. **懸念点**:
   - リンク内のテキストを編集したい場合（リンクテキストの変更）は、一度リンクを解除してから編集が必要になる可能性がある
   - ただし、これは一般的なリッチテキストエディタの挙動と一致するため、問題にはならないと考えられる

---

## Codex用ToDoリスト

- [ ] `apps/web/components/features/memo/tiptap-editor.tsx` のLine 174-182を上記の通り変更
- [ ] `npm run check:wsl` で型エラーがないことを確認
- [ ] 動作確認: URL入力後にテキストを入力し、テキストがリンク外になることを確認
