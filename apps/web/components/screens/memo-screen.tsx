"use client";

import DeletedMemoViewer from "@/components/features/memo/deleted-memo-viewer";
import SimpleMemoEditor from "@/components/features/memo/simple-memo-editor";
import DesktopLower from "@/components/layout/desktop-lower";
import DesktopUpper from "@/components/layout/desktop-upper";
import DeleteButton from "@/components/ui/buttons/delete-button";
import RightPanel from "@/components/ui/layout/right-panel";
import { BulkDeleteConfirmation } from "@/components/ui/modals";
import { useDeletedNotes, useNotes } from "@/src/hooks/use-notes";
import { useMemosBulkDelete } from "@/components/features/memo/use-memo-bulk-delete";
import { useUserPreferences } from "@/src/hooks/use-user-preferences";
import { useScreenState } from "@/src/hooks/use-screen-state";
import type { DeletedMemo, Memo } from "@/src/types/memo";
import { useCallback, useState } from "react";
import { createToggleHandler } from "@/src/utils/toggleUtils";
import { shouldShowDeleteButton, getDeleteButtonCount } from "@/src/utils/screenUtils";

type MemoScreenMode = "list" | "view" | "create" | "edit";

interface MemoScreenProps {
  selectedMemo?: Memo | null;
  selectedDeletedMemo?: DeletedMemo | null;
  onSelectMemo: (memo: Memo) => void;
  onSelectDeletedMemo: (memo: DeletedMemo) => void;
  onClose: () => void;
  onDeselectAndStayOnMemoList?: () => void; // 選択解除してメモ一覧に留まる
}

function MemoScreen({
  selectedMemo,
  selectedDeletedMemo,
  onSelectMemo,
  onSelectDeletedMemo,
  onClose,
  onDeselectAndStayOnMemoList,
}: MemoScreenProps) {
  // 新規作成エディターのキー管理
  const [createEditorKey, setCreateEditorKey] = useState(0);
  
  // データ取得
  const { data: notes, isLoading: memoLoading, error: memoError } = useNotes();
  const { data: deletedNotes } = useDeletedNotes();
  const { preferences } = useUserPreferences(1);

  // 共通screen状態管理
  const {
    screenMode: memoScreenMode,
    setScreenMode: setMemoScreenMode,
    activeTab,
    setActiveTab,
    viewMode,
    setViewMode,
    columnCount,
    setColumnCount,
    checkedItems: checkedMemos,
    setCheckedItems: setCheckedMemos,
    checkedDeletedItems: checkedDeletedMemos,
    setCheckedDeletedItems: setCheckedDeletedMemos,
    effectiveColumnCount
  } = useScreenState(
    {
      type: 'memo',
      defaultActiveTab: 'normal',
      defaultColumnCount: 4
    },
    'list' as MemoScreenMode,
    selectedMemo,
    selectedDeletedMemo,
    preferences || undefined
  );

  // 保存完了後の処理（超シンプル）
  const handleSaveComplete = useCallback((savedMemo: Memo, wasEmpty: boolean, isNewMemo: boolean) => {
    if (wasEmpty) {
      // 空メモは削除して閉じる
      onDeselectAndStayOnMemoList?.();
      setMemoScreenMode("list");
    } else if (isNewMemo) {
      // 新規作成は連続作成のため再マウント
      onDeselectAndStayOnMemoList?.();
      setTimeout(() => {
        setCreateEditorKey(prev => prev + 1); // キーを変更して再マウント
        setMemoScreenMode("create");
      }, 700); // 保存中表示(600ms)より少し長く
    } else {
      // 既存メモ更新は選択状態更新
      onSelectMemo(savedMemo);
    }
  }, [onDeselectAndStayOnMemoList, setMemoScreenMode, onSelectMemo]);

  // 削除完了後の処理
  const handleDeleteComplete = useCallback(() => {
    onDeselectAndStayOnMemoList?.();
    setMemoScreenMode("list");
  }, [onDeselectAndStayOnMemoList, setMemoScreenMode]);

  // メモ復元（シンプル化）
  const restoreMemo = useCallback(() => {
    // 復元は単純にAPI呼び出しのみ
  }, []);

  // 一括削除関連
  const { handleBulkDelete, bulkDeleteState } = useMemosBulkDelete({
    activeTab: activeTab as "normal" | "deleted",
    checkedMemos,
    checkedDeletedMemos,
    setCheckedMemos,
    setCheckedDeletedMemos,
    notes,
    deletedNotes,
    localMemos: notes || [],
    onMemoDelete: () => {} // シンプル化
  });

  // 次のメモ選択ハンドラー（簡略化）
  const handleDeletedMemoAndSelectNext = () => {
    onClose();
  };


  return (
    <div className="flex h-[calc(100vh-64px)] bg-white">
      {/* 左側：一覧表示エリア */}
      <div
        className={`${memoScreenMode === "list" ? "w-full" : "w-1/2"} ${memoScreenMode !== "list" ? "border-r border-gray-300" : ""} pt-6 pl-6 pr-2 flex flex-col transition-all duration-300 relative`}
      >
        <DesktopUpper
          currentMode="memo"
          activeTab={activeTab as "normal" | "deleted"}
          onTabChange={(tab) => setActiveTab(tab)}
          onCreateNew={() => setMemoScreenMode("create")}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          columnCount={columnCount}
          onColumnCountChange={setColumnCount}
          rightPanelMode={memoScreenMode === "list" ? "hidden" : "view"}
          normalCount={notes?.length || 0}
          deletedNotesCount={deletedNotes?.length || 0}
        />

        <DesktopLower
          currentMode="memo"
          activeTab={activeTab as "normal" | "deleted"}
          viewMode={viewMode}
          effectiveColumnCount={effectiveColumnCount}
          isLoading={memoLoading}
          error={memoError}
          notes={notes || []}
          localMemos={notes || []}
          deletedNotes={deletedNotes || []}
          selectedMemo={selectedMemo}
          selectedDeletedMemo={selectedDeletedMemo}
          checkedMemos={checkedMemos}
          checkedDeletedMemos={checkedDeletedMemos}
          onToggleCheckMemo={createToggleHandler(checkedMemos, setCheckedMemos)}
          onToggleCheckDeletedMemo={createToggleHandler(checkedDeletedMemos, setCheckedDeletedMemos)}
          onSelectMemo={(memo) => {
            onSelectMemo(memo);
            setMemoScreenMode("view");
          }}
          onSelectDeletedMemo={(memo) => {
            onSelectDeletedMemo(memo);
            setMemoScreenMode("view");
          }}
        />

        {/* 一括削除ボタン */}
        {shouldShowDeleteButton(activeTab, "deleted", checkedMemos, checkedDeletedMemos) && (
          <DeleteButton
            onDelete={handleBulkDelete}
            className="absolute bottom-6 right-6 z-10"
            count={getDeleteButtonCount(activeTab, "deleted", checkedMemos, checkedDeletedMemos)}
          />
        )}
      </div>

      {/* 右側：詳細表示エリア */}
      <RightPanel
        isOpen={memoScreenMode !== "list"}
        onClose={() => {
          setMemoScreenMode("list");
          onDeselectAndStayOnMemoList?.(); // 選択解除してメモ一覧に留まる
        }}
      >
        {memoScreenMode === "create" && (
          <SimpleMemoEditor
            key={`create-${createEditorKey}`} // 管理されたキーで再マウント
            memo={null}
            onClose={() => setMemoScreenMode("list")}
            onSaveComplete={handleSaveComplete}
          />
        )}
        {memoScreenMode === "view" && selectedMemo && (
          <SimpleMemoEditor
            memo={selectedMemo}
            onClose={() => setMemoScreenMode("list")}
            onSaveComplete={handleSaveComplete}
            onDeleteComplete={handleDeleteComplete}
          />
        )}
        {memoScreenMode === "view" && selectedDeletedMemo && (
          <DeletedMemoViewer
            memo={selectedDeletedMemo}
            onClose={() => setMemoScreenMode("list")}
            onDeleteAndSelectNext={handleDeletedMemoAndSelectNext}
            onMemoRestore={restoreMemo}
          />
        )}
        {memoScreenMode === "edit" && selectedMemo && (
          <SimpleMemoEditor
            memo={selectedMemo}
            onClose={() => setMemoScreenMode("view")}
            onSaveComplete={handleSaveComplete}
            onDeleteComplete={handleDeleteComplete}
          />
        )}
      </RightPanel>

      {/* 一括削除確認モーダル */}
      <BulkDeleteConfirmation
        isOpen={bulkDeleteState.isModalOpen}
        onClose={bulkDeleteState.handleCancel}
        onConfirm={bulkDeleteState.handleConfirm}
        count={bulkDeleteState.targetIds.length}
        itemType="memo"
        deleteType={activeTab === "normal" ? "normal" : "permanent"}
        isLoading={bulkDeleteState.isDeleting}
      />
    </div>
  );
}

export default MemoScreen;
