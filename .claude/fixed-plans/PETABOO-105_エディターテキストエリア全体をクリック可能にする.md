# PETABOO-105: エディターテキストエリア全体をクリック可能にする

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

メモ・タスクエディターで、テキストエリア全体（空白部分含む）をクリックしても入力モードに切り替わるようにする。現状は入力可能な範囲が狭く（約2行分程度）、ユーザー体験が悪い。

---

## 問題の原因

`TiptapEditor`コンポーネント（[tiptap-editor.tsx](apps/web/components/features/memo/tiptap-editor.tsx)）において：

1. `EditorContent`コンポーネント自体は内容に応じたサイズしか持たない
2. 親のdivに`min-height`が設定されていない
3. コンテナ全体をクリックしてもエディターにフォーカスが移らない

---

## 変更範囲

### 対象ファイル

1. `apps/web/components/features/memo/tiptap-editor.tsx`

### 変更内容

**TiptapEditorコンポーネントの修正：**

1. 外側のコンテナにクリックハンドラーを追加し、クリック時にエディターにフォーカスを当てる
2. `min-height: 100%`を設定してコンテナが親要素いっぱいに広がるようにする
3. `cursor: text`を追加して入力可能であることを視覚的に示す

---

## 実装手順

### ステップ1: TiptapEditorコンポーネントの修正

**ファイル:** `apps/web/components/features/memo/tiptap-editor.tsx`

**変更箇所:** 270-276行目付近のreturn文内

**現在のコード:**

```tsx
return (
  <div
    className={`flex flex-col ${readOnly ? "text-red-500 bg-red-50 cursor-not-allowed" : "text-gray-500"}`}
  >
    <EditorContent editor={editor} />
  </div>
);
```

**修正後のコード:**

```tsx
return (
  <div
    className={`flex flex-col h-full min-h-[200px] ${readOnly ? "text-red-500 bg-red-50 cursor-not-allowed" : "text-gray-500 cursor-text"}`}
    onClick={(e) => {
      // readOnlyでない場合、コンテナクリックでエディターにフォーカス
      if (!readOnly && editor && !editor.isFocused) {
        // クリック位置がEditorContent外の場合のみフォーカス
        const target = e.target as HTMLElement;
        if (!target.closest(".ProseMirror")) {
          editor.commands.focus("end");
        }
      }
    }}
  >
    <EditorContent editor={editor} className="flex-1" />
  </div>
);
```

---

## 影響範囲

- `memo-editor.tsx` - TiptapEditorを使用（変更不要）
- `task-editor.tsx` - TiptapEditorを使用（変更不要）
- 両エディターとも同じTiptapEditorコンポーネントを使用しているため、修正は1箇所で完了

---

## 懸念点

1. **クリック挙動の変化**: 既存のクリック挙動（テキスト選択など）に影響しないようにする必要がある
   → `target.closest('.ProseMirror')`でエディター内クリックは除外

2. **readOnlyモード**: 削除済みアイテム表示時はクリック不可にする必要がある
   → `readOnly`チェックで対応済み

---

## Codex用ToDoリスト

- [ ] `apps/web/components/features/memo/tiptap-editor.tsx` の270-276行目を修正
  - 外側divに`h-full min-h-[200px]`を追加
  - 外側divに`cursor-text`クラスを追加（readOnlyでない場合）
  - 外側divにonClickハンドラーを追加（エディター外クリック時にフォーカス）
  - `EditorContent`に`className="flex-1"`を追加
- [ ] 動作確認: メモエディターでテキストエリア外をクリックして入力可能か確認
- [ ] 動作確認: タスクエディターでテキストエリア外をクリックして入力可能か確認
- [ ] 動作確認: 削除済みアイテムの表示でクリック不可か確認

---

## URL

https://petaboo.vercel.app/team/moricrew?PETABOO&task=105
