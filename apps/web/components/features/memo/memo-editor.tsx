"use client";

import BaseViewer from "@/components/shared/base-viewer";
import DeleteButton from "@/components/ui/buttons/delete-button";
import SaveButton from "@/components/ui/buttons/save-button";
import PhotoButton from "@/components/ui/buttons/photo-button";
import { useMemoForm } from "@/src/hooks/use-memo-form";
import { useDeleteNote } from "@/src/hooks/use-notes";
import type { Memo } from "@/src/types/memo";
import { useState, useRef, useEffect, useCallback } from "react";

interface MemoEditorProps {
  memo: Memo | null;
  onClose: () => void;
  onMemoAdd?: (memo: Memo) => void;
  onMemoUpdate?: (id: number, updates: Partial<Memo>) => void;
  onMemoDelete?: (id: number) => void;
  onDeleteAndSelectNext?: () => void;
  onCloseAndStayOnMemoList?: () => void; // 閉じてメモ一覧に留まる（ホームに戻らない）
}

function MemoEditor({ 
  memo, 
  onClose, 
  onMemoAdd, 
  onMemoUpdate, 
  onMemoDelete, 
  onDeleteAndSelectNext,
  onCloseAndStayOnMemoList
}: MemoEditorProps) {
  const deleteNote = useDeleteNote();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const {
    title,
    content,
    isSaving,
    saveError,
    hasChanges,
    handleSave: originalHandleSave,
    handleTitleChange,
    handleContentChange,
    resetForm,
  } = useMemoForm({ memo, onMemoAdd, onMemoUpdate });

  const [error] = useState<string | null>(null);

  // Enhanced save handler for empty memo deletion
  const handleSave = useCallback(async () => {
    const isEmpty = !title.trim() && !content.trim();
    console.log('🔍 handleSave実行:', { isEmpty, memoId: memo?.id, title, content });
    
    if (isEmpty && memo?.id) {
      console.log('🗑️ 空メモ削除処理開始');
      // Delete existing memo if it becomes empty
      try {
        // 右パネルを閉じる（ホームには戻らない）
        console.log('🚪 右パネルを閉じます');
        if (onCloseAndStayOnMemoList) {
          console.log('📱 onCloseAndStayOnMemoList呼び出し（メモ一覧に留まる）');
          onCloseAndStayOnMemoList();
        } else {
          console.log('📱 onClose呼び出し');
          onClose();
        }
        
        // その後削除処理（onMemoDeleteは呼ばない＝onCloseを二重実行しない）
        console.log('🗑️ API削除開始');
        await deleteNote.mutateAsync(memo.id);
        console.log('🗑️ API削除完了（onMemoDeleteは呼ばずに右パネルだけ閉じる）');
      } catch (error) {
        console.error("削除に失敗しました:", error);
      }
    } else if (!isEmpty) {
      console.log('💾 通常保存処理');
      // Save normally if content exists
      await originalHandleSave();
      
      // 新規作成時は保存後にフォームをリセット
      if (!memo) {
        console.log('🔄 新規作成なので保存後にフォームリセット');
        setTimeout(() => {
          resetForm();
        }, 600); // 保存中表示(500ms)が終わってからリセット
      }
    } else {
      console.log('⚪ 新規メモで空なので何もしません');
    }
    // Do nothing if empty and new memo (no save needed)
  }, [title, content, memo, deleteNote, onCloseAndStayOnMemoList, onClose, originalHandleSave, resetForm]);

  // Focus management
  useEffect(() => {
    if (textareaRef.current) {
      // requestAnimationFrame を2回使って確実に次のフレームでフォーカス
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const textarea = textareaRef.current;
          if (textarea) {
            textarea.focus();
            textarea.setSelectionRange(textarea.value.length, textarea.value.length);
          }
        });
      });
    }
  }, [memo]);

  // Ctrl+S keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleSave]);

  const handleDelete = async () => {
    try {
      if (memo?.id) {
        await deleteNote.mutateAsync(memo.id);
        onMemoDelete?.(memo.id);
        
        if (onDeleteAndSelectNext) {
          onDeleteAndSelectNext();
        } else {
          onClose();
        }
      }
    } catch (error) {
      console.error("削除に失敗しました:", error);
    }
  };

  return (
    <>
      <BaseViewer
        item={memo || {
          id: 0,
          title: '',
          content: '',
          createdAt: Math.floor(Date.now() / 1000),
          updatedAt: Math.floor(Date.now() / 1000)
        }}
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
            <PhotoButton />
          </div>
        }
      >
        <textarea
          ref={textareaRef}
          autoFocus={memo === null} // 新規作成時のみ自動フォーカス
          placeholder="メモを入力...&#10;&#10;最初の行がタイトルになります"
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