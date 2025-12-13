"use client";

import { useEditor, EditorContent, Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import { useEffect, useRef, useState } from "react";

interface TiptapEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  className?: string;
  toolbarVisible?: boolean;
  onToolbarToggle?: (visible: boolean) => void;
  onEditorReady?: (editor: Editor) => void;
  onImagePaste?: (file: File) => void;
}

// ツールバーコンポーネント
export function Toolbar({ editor }: { editor: Editor | null }) {
  if (!editor) return null;

  return (
    <div className="flex items-center gap-1 px-1 py-1 border-b border-gray-200 bg-gray-200 flex-wrap mb-2 mr-1 mt-1 rounded-md">
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

      {/* 区切り線（モバイルでは非表示） */}
      <div className="hidden md:block w-px h-6 bg-gray-300 mx-1" />

      {/* 太字・斜体ボタン */}
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={`px-2 py-0.5 text-sm font-bold rounded hover:bg-gray-200 transition-colors ml-1 md:ml-0 ${
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

      {/* 区切り線（モバイルでは非表示） */}
      <div className="hidden md:block w-px h-6 bg-gray-300 mx-1" />

      {/* リストボタン */}
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={`px-2 py-0.5 text-sm rounded hover:bg-gray-200 transition-colors ml-1 md:ml-0 ${
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

      {/* 区切り線（モバイルでは非表示） */}
      <div className="hidden md:block w-px h-6 bg-gray-300 mx-1" />

      {/* その他ボタン */}
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleCode().run()}
        className={`px-2 py-0.5 text-sm font-mono rounded hover:bg-gray-200 transition-colors ml-1 md:ml-0 ${
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
  onEditorReady,
  onImagePaste,
}: TiptapEditorProps) {
  const isFirstRender = useRef(true);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        hardBreak: {
          keepMarks: true,
        },
        // StarterKitに含まれるlinkを無効化（カスタム設定を使用するため）
        link: false,
      }),
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
      Placeholder.configure({
        placeholder,
      }),
    ],
    content,
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      // HTML形式で取得
      const html = editor.getHTML();
      onChange(html);
    },
    editorProps: {
      attributes: {
        class: `prose text-[15px] prose-headings:font-bold prose-strong:font-bold prose-em:italic max-w-none ${className} outline-none leading-relaxed`,
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
      handlePaste: (_view, event) => {
        // 画像ペースト処理
        if (onImagePaste && event.clipboardData?.items) {
          const items = event.clipboardData.items;

          for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item && item.type.startsWith("image/")) {
              event.preventDefault();
              const file = item.getAsFile();
              if (file) {
                onImagePaste(file);
              }
              return true; // ペースト処理を中断
            }
          }
        }

        // 画像がない場合は通常のペースト処理を続行
        return false;
      },
    },
  });

  // contentが外部から変更された時に更新
  const prevContentRef = useRef<string>(content);

  useEffect(() => {
    if (editor && !isFirstRender.current) {
      const currentHTML = editor.getHTML();

      // 前回のcontentと比較（エディタからの変更を除外）
      if (content !== prevContentRef.current && content !== currentHTML) {
        // HTMLとして設定
        editor.commands.setContent(content);
      }

      prevContentRef.current = content;
    }
    isFirstRender.current = false;
  }, [content, editor]);

  // readOnlyが変更された時に更新
  useEffect(() => {
    if (editor) {
      editor.setEditable(!readOnly);
    }
  }, [readOnly, editor]);

  // editorが作成されたら親に通知
  useEffect(() => {
    if (editor && onEditorReady) {
      onEditorReady(editor);
    }
  }, [editor, onEditorReady]);

  return (
    <div
      className={`flex flex-col h-full min-h-[200px] ${readOnly ? "text-red-500 bg-red-50 cursor-not-allowed" : "text-gray-500 cursor-text"}`}
      onClick={(e) => {
        // readOnlyでない場合、コンテナクリックでエディターにフォーカス
        if (!readOnly && editor && !editor.isFocused) {
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
}
