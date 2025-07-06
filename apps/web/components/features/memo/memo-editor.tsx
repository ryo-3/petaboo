"use client";

import BaseViewer from "@/components/shared/base-viewer";
import PhotoButton from "@/components/ui/buttons/photo-button";
import SaveButton from "@/components/ui/buttons/save-button";
import { useSimpleMemoSave } from "@/src/hooks/use-simple-memo-save";
import { useUserPreferences } from "@/src/hooks/use-user-preferences";
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
  customHeight?: string;
}

function MemoEditor({ memo, onClose, onSaveComplete, customHeight }: MemoEditorProps) {
  const { preferences } = useUserPreferences(1);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const baseViewerRef = useRef<HTMLDivElement>(null);

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

  // Ctrl+S ショートカット（変更がある場合のみ実行）
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (hasChanges) {
          handleSave();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleSave, hasChanges]);

  return (
    <>
      <div ref={baseViewerRef} data-memo-editor>
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
                buttonSize="size-6"
                iconSize="size-3.5"
              />
              <PhotoButton
                buttonSize="size-6"
                iconSize="size-4"
                className="rounded-full"
              />
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
            className={`w-full ${customHeight || (preferences?.hideHeader ? 'h-[calc(100vh-100px)]' : 'h-[calc(100vh-164px)]')} resize-none outline-none text-gray-500 leading-relaxed font-medium pb-10 mt-3`}
          />
        </BaseViewer>
      </div>
    </>
  );
}

export default MemoEditor;
