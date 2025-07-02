"use client";

import DeletedMemoViewer from "@/components/features/memo/deleted-memo-viewer";
import MemoEditor from "@/components/features/memo/memo-editor";
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

  // 簡単なメモ操作ハンドラー
  const addMemo = useCallback((memo: Memo) => {
    console.log('🆕 addMemo実行:', memo.id, memo.title);
    // 新規作成時は保存後も新規作成画面を開いたまま（連続作成）
    // 先に選択解除してから新規作成画面に切り替え
    console.log('🆕 選択解除を実行');
    onDeselectAndStayOnMemoList?.(); // 選択解除
    
    // フォーカス処理が完了してから新規作成画面に切り替え
    setTimeout(() => {
      console.log('🆕 新規作成画面に切り替え');
      setMemoScreenMode("create");
      console.log('🆕 メモ作成完了、次の新規作成画面準備完了');
    }, 150); // 150ms遅延でフォーカス処理を待つ
  }, [setMemoScreenMode, onDeselectAndStayOnMemoList]);

  const updateMemo = useCallback((id: number, updates: Partial<Memo>) => {
    console.log('🔄 updateMemo実行:', { id, updates, selectedMemoId: selectedMemo?.id });
    // 選択中メモも同時に更新
    if (selectedMemo && selectedMemo.id === id) {
      const updatedMemo = { ...selectedMemo, ...updates };
      console.log('🔄 更新されたメモ:', updatedMemo);
      onSelectMemo(updatedMemo);
      console.log('🔄 onSelectMemo呼び出し完了');
    } else {
      console.log('🔄 選択中メモではないのでスキップ');
    }
  }, [selectedMemo, onSelectMemo]);

  // メモ削除
  const deleteMemo = useCallback((id: number) => {
    console.log('🗑️ deleteMemo実行:', { id, selectedMemoId: selectedMemo?.id });
    // 削除したメモが選択中の場合は選択を解除
    if (selectedMemo && selectedMemo.id === id) {
      console.log('🗑️ 選択中のメモを削除したのでonClose実行');
      onClose();
    }
  }, [selectedMemo, onClose]);

  // メモ復元
  const restoreMemo = useCallback(() => {
    // 復元は単純にAPI呼び出しのみ（画面更新はuseNotesで自動）
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
    onMemoDelete: deleteMemo
  });

  // 次のメモ選択ハンドラー（簡略化）
  const handleDeleteAndSelectNext = () => {
    onClose();
  };

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
          <MemoEditor
            memo={null}
            onClose={() => {
              setMemoScreenMode("list");
            }}
            onMemoAdd={addMemo}
            onMemoUpdate={updateMemo}
            onMemoDelete={deleteMemo}
          />
        )}
        {memoScreenMode === "view" && selectedMemo && (
          <MemoEditor
            memo={selectedMemo}
            onClose={() => setMemoScreenMode("list")}
            onCloseAndStayOnMemoList={() => {
              // 空メモ削除時は右パネルだけ閉じる（ホームには戻らない）
              console.log('🔧 onCloseAndStayOnMemoList実行: モードをlistに変更');
              setMemoScreenMode("list");
              onDeselectAndStayOnMemoList?.(); // 選択解除してメモ一覧に留まる
              console.log('🔧 モード変更＆選択解除完了');
            }}
            onDeleteAndSelectNext={handleDeleteAndSelectNext}
            onMemoAdd={addMemo}
            onMemoUpdate={updateMemo}
            onMemoDelete={deleteMemo}
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
          <MemoEditor
            memo={selectedMemo}
            onClose={() => setMemoScreenMode("view")}
            onDeleteAndSelectNext={handleDeleteAndSelectNext}
            onMemoAdd={addMemo}
            onMemoUpdate={updateMemo}
            onMemoDelete={deleteMemo}
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
