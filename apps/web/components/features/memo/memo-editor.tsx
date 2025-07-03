"use client";

import PhotoIcon from "@/components/icons/photo-icon";
import BaseViewer from "@/components/shared/base-viewer";
import DeleteButton from "@/components/ui/buttons/delete-button";
import SaveButton from "@/components/ui/buttons/save-button";
import { useDeleteNote } from "@/src/hooks/use-notes";
import { useSimpleMemoSave } from "@/src/hooks/use-simple-memo-save";
import type { Memo } from "@/src/types/memo";
import { useEffect, useRef, useState } from "react";

interface MemoEditorProps {
  memo: Memo | null;
  onClose: () => void;
  onSaveComplete?: (
    savedMemo: Memo,
    wasEmpty: boolean,
    isNewMemo: boolean
  ) => void;
  onDeleteComplete?: () => void;
}

function MemoEditor({
  memo,
  onClose,
  onSaveComplete,
  onDeleteComplete,
}: MemoEditorProps) {
  const deleteNote = useDeleteNote();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const {
    content,
    isSaving,
    saveError,
    hasChanges,
    handleSave,
    handleTitleChange,
    handleContentChange,
  } = useSimpleMemoSave({
    memo,
    onSaveComplete,
  });

  const [error] = useState<string | null>(null);

  // フォーカス管理（新規作成時に遅延）
  useEffect(() => {
    if (textareaRef.current && !memo) {
      // 新規作成時のみ
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
        }
      }, 300);
    }
  }, [memo]);

  // Ctrl+S ショートカット
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleSave]);

  const handleDelete = async () => {
    try {
      if (memo?.id) {
        // 削除前にコールバックを呼ぶ（削除前のメモ情報を渡せるように）
        onDeleteComplete?.();
        await deleteNote.mutateAsync(memo.id);
      }
    } catch (error) {
      console.error("削除に失敗しました:", error);
    }
  };

  return (
    <>
      <BaseViewer
        item={
          memo || {
            id: 0,
            title: "",
            content: "",
            createdAt: Math.floor(Date.now() / 1000),
            updatedAt: Math.floor(Date.now() / 1000),
          }
        }
        onClose={onClose}
        error={error}
        isEditing={true}
        createdItemId={null}
        headerActions={
          <div className="flex items-center gap-2">
            {saveError && (
              <span className="text-xs text-red-500">{saveError}</span>
            )}
            <SaveButton
              onClick={handleSave}
              disabled={!hasChanges}
              isSaving={isSaving}
            />
            <button
              className="p-2 rounded-full bg-gray-200 text-gray-600 hover:bg-gray-300 hover:text-gray-800 transition-colors"
              title="画像を添付（今後対応予定）"
              onClick={() => {
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
          placeholder="入力..."
          value={content}
          onChange={(e) => {
            const newContent = e.target.value;
            const firstLine = newContent.split("\n")[0] || "";

            handleTitleChange(firstLine);
            handleContentChange(newContent);
          }}
          className="w-full h-[calc(100vh-280px)] resize-none outline-none text-gray-500 leading-relaxed font-medium"
        />
      </BaseViewer>

      {memo && (
        <DeleteButton
          className="absolute bottom-6 right-6 z-10"
          onDelete={handleDelete}
        />
      )}
    </>
  );
}

export default MemoEditor;
