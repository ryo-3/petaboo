"use client";

import PhotoIcon from "@/components/icons/photo-icon";
import BaseViewer from "@/components/shared/base-viewer";
import DeleteButton from "@/components/ui/buttons/delete-button";
import { useMemoForm } from "@/src/hooks/use-memo-form";
import { useDeleteNote } from "@/src/hooks/use-notes";
import type { Memo } from "@/src/types/memo";
import { useState, useRef, useEffect } from "react";

interface MemoEditorProps {
  memo: Memo | null;
  onClose: () => void;
  onEdit?: (memo: Memo) => void;
  onMemoAdd?: (memo: Memo) => void;
  onMemoUpdate?: (id: number, updates: Partial<Memo>) => void;
  onMemoDelete?: (id: number) => void;
  onDeleteAndSelectNext?: (deletedMemo: Memo) => void;
  isNewlyCreated?: boolean;
}

function MemoEditor({ memo, onClose, onMemoAdd, onMemoUpdate, onMemoDelete, onDeleteAndSelectNext, isNewlyCreated = false }: MemoEditorProps) {
  const deleteNote = useDeleteNote();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const {
    content,
    savedSuccessfully,
    isSaving,
    saveError,
    lastEditedAt,
    realId,
    hasUserEdited,
    handleTitleChange,
    handleContentChange,
  } = useMemoForm({ memo, onMemoAdd, onMemoUpdate, onMemoIdUpdate: undefined });

  const [error] = useState<string | null>(null);

  // フォーカス管理：新規作成時と既存メモ表示時
  useEffect(() => {
    if (textareaRef.current) {
      const timer = setTimeout(() => {
        const textarea = textareaRef.current;
        if (textarea) {
          textarea.focus();
          textarea.setSelectionRange(textarea.value.length, textarea.value.length);
        }
      }, memo === null ? 300 : 100); // 新規作成時は少し長く遅延
      return () => clearTimeout(timer);
    }
  }, [memo?.id, memo]);

  const handleDelete = async () => {
    try {
      let deleteId: number | null = null;
      
      if (memo && memo.id) {
        // 既存メモの場合
        deleteId = memo.id;
        await deleteNote.mutateAsync(memo.id);
        localStorage.removeItem(`memo_draft_${memo.id}`);
      } else if (realId) {
        // 新規作成時で自動保存されたメモがある場合
        deleteId = realId;
        await deleteNote.mutateAsync(realId);
        localStorage.removeItem(`memo_draft_${realId}`);
      }

      // 新規作成用のローカルストレージを削除
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith("memo_draft_new_")) {
          try {
            const data = JSON.parse(localStorage.getItem(key) || "{}");
            if (data.title === content.split('\n')[0] && data.content === content) {
              localStorage.removeItem(key);
            }
          } catch (error) {
            console.error("ローカルストレージ解析エラー:", error);
          }
        }
      });

      // State側からも削除
      if (deleteId && onMemoDelete) {
        onMemoDelete(deleteId);
      }

      // 削除後の処理
      if (memo && onDeleteAndSelectNext) {
        onDeleteAndSelectNext(memo);
      } else {
        onClose();
      }
    } catch (error) {
      console.error("削除に失敗しました:", error);
    }
  };

  return (
    <>
      <BaseViewer
        item={memo || {
          id: realId || 0,
          title: '',
          content: '',
          createdAt: Math.floor(Date.now() / 1000),
          updatedAt: Math.floor(Date.now() / 1000)
        }}
        onClose={onClose}
        error={error}
        isEditing={true}
        createdItemId={isNewlyCreated ? (memo?.id || realId) : null}
        lastEditedAt={lastEditedAt}
        headerActions={
          <div className="flex items-center gap-2">
            {saveError && (
              <span className="text-xs text-red-500">{saveError}</span>
            )}
            <button
              className="p-2 rounded-full bg-gray-200 text-gray-600 hover:bg-gray-300 hover:text-gray-800 transition-colors"
              title="画像を添付（今後対応予定）"
              onClick={() => {
                // TODO: 画像添付機能の実装
                alert("画像添付機能は今後実装予定です");
              }}
            >
              <PhotoIcon className="w-4 h-4" />
            </button>
          </div>
        }
      >
        <textarea
          ref={textareaRef}
          placeholder="メモを入力...&#10;&#10;最初の行がタイトルになります"
          value={content}
          onChange={(e) => {
            const newContent = e.target.value;
            // 最初の行をタイトルとして設定
            const firstLine = newContent.split("\n")[0] || "";

            // 新しいハンドラーを使用
            handleContentChange(newContent);
            handleTitleChange(firstLine);

            // console.log('memo-editor onChange:', {
            //   title: firstLine,
            //   content: newContent.substring(0, 50) + '...'
            // });
          }}
          className="w-full h-[calc(100vh-280px)] resize-none outline-none text-gray-500 leading-relaxed font-medium"
        />
      </BaseViewer>
      <DeleteButton
        className="absolute bottom-6 right-6 z-10"
        onDelete={handleDelete}
      />
    </>
  );
}

export default MemoEditor;
