"use client";

import { useEditor, EditorContent, Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Markdown } from "@tiptap/markdown";
import { useEffect, useRef, useState } from "react";

interface TiptapEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  className?: string;
  toolbarVisible?: boolean;
  onToolbarToggle?: (visible: boolean) => void;
}

// ツールバーコンポーネント
function Toolbar({ editor }: { editor: Editor | null }) {
  if (!editor) return null;

  return (
    <div className="flex items-center gap-1 px-2 py-1 border-b border-gray-200 bg-gray-200 flex-wrap mb-2 mr-1">
      {/* 見出しボタン */}
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={`px-2 py-0.5 text-sm font-semibold rounded hover:bg-gray-200 transition-colors ${
          editor.isActive("heading", { level: 1 }) ? "bg-gray-300" : "bg-white"
        }`}
        title="見出し1"
      >
        H1
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={`px-2 py-0.5 text-sm font-semibold rounded hover:bg-gray-200 transition-colors ${
          editor.isActive("heading", { level: 2 }) ? "bg-gray-300" : "bg-white"
        }`}
        title="見出し2"
      >
        H2
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        className={`px-2 py-0.5 text-sm font-semibold rounded hover:bg-gray-200 transition-colors ${
          editor.isActive("heading", { level: 3 }) ? "bg-gray-300" : "bg-white"
        }`}
        title="見出し3"
      >
        H3
      </button>

      {/* 区切り線 */}
      <div className="w-px h-6 bg-gray-300 mx-1" />

      {/* 太字・斜体ボタン */}
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={`px-2 py-0.5 text-sm font-bold rounded hover:bg-gray-200 transition-colors ${
          editor.isActive("bold") ? "bg-gray-300" : "bg-white"
        }`}
        title="太字 (Ctrl+B)"
      >
        B
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={`px-2 py-0.5 text-sm italic rounded hover:bg-gray-200 transition-colors ${
          editor.isActive("italic") ? "bg-gray-300" : "bg-white"
        }`}
        title="斜体 (Ctrl+I)"
      >
        I
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleStrike().run()}
        className={`px-2 py-0.5 text-sm line-through rounded hover:bg-gray-200 transition-colors ${
          editor.isActive("strike") ? "bg-gray-300" : "bg-white"
        }`}
        title="取り消し線"
      >
        S
      </button>

      {/* 区切り線 */}
      <div className="w-px h-6 bg-gray-300 mx-1" />

      {/* リストボタン */}
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={`px-2 py-0.5 text-sm rounded hover:bg-gray-200 transition-colors ${
          editor.isActive("bulletList") ? "bg-gray-300" : "bg-white"
        }`}
        title="箇条書きリスト"
      >
        ●
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={`px-2 py-0.5 text-sm rounded hover:bg-gray-200 transition-colors ${
          editor.isActive("orderedList") ? "bg-gray-300" : "bg-white"
        }`}
        title="番号付きリスト"
      >
        1.
      </button>

      {/* 区切り線 */}
      <div className="w-px h-6 bg-gray-300 mx-1" />

      {/* その他ボタン */}
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleCode().run()}
        className={`px-2 py-0.5 text-sm font-mono rounded hover:bg-gray-200 transition-colors ${
          editor.isActive("code") ? "bg-gray-300" : "bg-white"
        }`}
        title="インラインコード"
      >
        &lt;/&gt;
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        className={`px-2 py-0.5 text-sm font-mono rounded hover:bg-gray-200 transition-colors ${
          editor.isActive("codeBlock") ? "bg-gray-300" : "bg-white"
        }`}
        title="コードブロック"
      >
        {"{"}
        {"}"}
      </button>
    </div>
  );
}

export function TiptapEditor({
  content,
  onChange,
  placeholder = "入力...",
  readOnly = false,
  className = "",
  toolbarVisible = false,
  onToolbarToggle,
}: TiptapEditorProps) {
  const isFirstRender = useRef(true);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        paragraph: {
          HTMLAttributes: {
            class: "my-0",
          },
        },
        hardBreak: {
          keepMarks: true,
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      Markdown.configure({
        markedOptions: {
          breaks: true, // 単一の\nを<br>に変換
          gfm: true,
          pedantic: false,
        },
      }),
    ],
    // 初期contentをマークダウンとして解釈
    content,
    contentType: "markdown",
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      // マークダウン形式で取得
      let markdown = editor.getMarkdown();

      // 4スペース+改行を2スペース+改行に修正（<br>のマークダウン表現）
      markdown = markdown.replace(/ {4}\n/g, "  \n");

      onChange(markdown);
    },
    editorProps: {
      attributes: {
        class: `prose prose-sm prose-headings:font-bold prose-strong:font-bold prose-em:italic max-w-none ${className} outline-none leading-relaxed`,
      },
      handleKeyDown: (view, event) => {
        // Enterキーで改行（<br>）を挿入
        if (event.key === "Enter" && !event.shiftKey) {
          const hardBreakNode = view.state.schema.nodes.hardBreak;
          if (hardBreakNode) {
            event.preventDefault();
            view.dispatch(
              view.state.tr.replaceSelectionWith(hardBreakNode.create()),
            );
            return true;
          }
        }
        return false;
      },
    },
  });

  // contentが外部から変更された時に更新
  useEffect(() => {
    if (editor && !isFirstRender.current) {
      const currentMarkdown = editor.getMarkdown();
      if (content !== currentMarkdown) {
        // 2スペース+改行を<br>タグに変換してから設定
        const processedContent = content.replace(/ {2}\n/g, "<br>\n");

        // マークダウンとして解釈して設定
        editor.commands.setContent(processedContent, {
          contentType: "markdown",
        });
      }
    }
    isFirstRender.current = false;
  }, [content, editor]);

  // readOnlyが変更された時に更新
  useEffect(() => {
    if (editor) {
      editor.setEditable(!readOnly);
    }
  }, [readOnly, editor]);

  return (
    <div
      className={`${readOnly ? "text-red-500 bg-red-50 cursor-not-allowed" : "text-gray-500"}`}
    >
      {!readOnly && toolbarVisible && <Toolbar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  );
}
