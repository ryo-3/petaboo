"use client";

import CheckIcon from "@/components/icons/check-icon";
import PhotoIcon from "@/components/icons/photo-icon";
import BaseViewer from "@/components/shared/base-viewer";
import DeleteButton from "@/components/ui/buttons/delete-button";
import { useMemoForm } from "@/src/hooks/use-memo-form";
import { useDeleteNote } from "@/src/hooks/use-notes";
import type { Memo } from "@/src/types/memo";
import { useState } from "react";

interface MemoEditorProps {
  memo: Memo;
  onClose: () => void;
  onEdit?: (memo: Memo) => void;
  onDeleteAndSelectNext?: (deletedMemo: Memo) => void;
}

function MemoEditor({ memo, onClose, onDeleteAndSelectNext }: MemoEditorProps) {
  const deleteNote = useDeleteNote();
  const {
    setTitle,
    content,
    setContent,
    savedSuccessfully,
  } = useMemoForm({ memo });

  const [error] = useState<string | null>(null);

  const handleDelete = async () => {
    try {
      // console.log('=== MemoEditor: メモ削除処理開始 ===')
      // console.log('削除対象メモ:', memo)
      // console.log('onDeleteAndSelectNext関数存在:', !!onDeleteAndSelectNext)

      await deleteNote.mutateAsync(memo.id);
      // console.log('削除完了')

      // 削除後に次のメモを選択する処理があれば実行、なければエディターを閉じる
      if (onDeleteAndSelectNext) {
        // console.log('次のメモ選択処理を実行')
        onDeleteAndSelectNext(memo);
      } else {
        // console.log('エディターを閉じます')
        onClose();
      }
    } catch (error) {
      console.error("削除に失敗しました:", error);
    }
  };

  return (
    <>
      <BaseViewer
        item={memo}
        onClose={onClose}
        error={error}
        isEditing={true}
        headerActions={
          <div className="flex items-center gap-2">
            {savedSuccessfully && (
              <CheckIcon className="w-5 h-5 text-green-600" />
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
          placeholder="メモを入力...&#10;&#10;最初の行がタイトルになります"
          value={content}
          onChange={(e) => {
            const newContent = e.target.value;
            // 最初の行をタイトルとして設定
            const firstLine = newContent.split("\n")[0] || "";

            // バッチで状態更新
            setContent(newContent);
            setTitle(firstLine);

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
