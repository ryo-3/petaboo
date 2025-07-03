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
import { getMemoDisplayOrder, getNextItemAfterDeletion, getNextDeletedItem } from "@/src/utils/domUtils";

type MemoScreenMode = "list" | "view" | "create";

interface MemoScreenProps {
  selectedMemo?: Memo | null;
  selectedDeletedMemo?: DeletedMemo | null;
  onSelectMemo: (memo: Memo | null) => void;
  onSelectDeletedMemo: (memo: DeletedMemo | null) => void;
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

  // 削除完了後の処理（次のメモを自動選択）
  const handleDeleteComplete = useCallback(() => {
    if (selectedMemo && notes) {
      const displayOrder = getMemoDisplayOrder();
      // getNextItemAfterDeletionには削除前の全メモを渡す
      const nextItem = getNextItemAfterDeletion(notes, selectedMemo, displayOrder);
      
      if (nextItem && nextItem.id !== selectedMemo.id) {
        onSelectMemo(nextItem);
        setMemoScreenMode("view");
      } else {
        setMemoScreenMode("list");
        onDeselectAndStayOnMemoList?.();
      }
    } else {
      onDeselectAndStayOnMemoList?.();
      setMemoScreenMode("list");
    }
  }, [selectedMemo, notes, onSelectMemo, onDeselectAndStayOnMemoList, setMemoScreenMode]);


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

  // 削除済みメモの完全削除時の次選択処理
  const handleDeletedMemoAndSelectNext = useCallback((deletedMemo: DeletedMemo) => {
    if (deletedNotes) {
      const nextItem = getNextDeletedItem(deletedNotes, deletedMemo);
      
      if (nextItem && nextItem.id !== deletedMemo.id) {
        onSelectDeletedMemo(nextItem);
        setMemoScreenMode("view");
      } else {
        setMemoScreenMode("list");
        onClose();
      }
    } else {
      onClose();
    }
  }, [deletedNotes, onSelectDeletedMemo, onClose, setMemoScreenMode]);

  // 削除済みメモの復元時の次選択処理
  const handleRestoreAndSelectNext = useCallback((deletedMemo: DeletedMemo) => {
    console.log('復元処理開始:', { deletedMemo: deletedMemo.id, deletedNotesCount: deletedNotes?.length });
    
    // 復元後の削除済みメモ数を計算
    const remainingDeletedMemos = deletedNotes ? deletedNotes.filter(m => m.id !== deletedMemo.id) : [];
    
    if (remainingDeletedMemos.length > 0) {
      // 他に削除済みメモがある場合は次を選択
      const nextItem = getNextDeletedItem(deletedNotes || [], deletedMemo);
      
      if (nextItem && nextItem.id !== deletedMemo.id) {
        console.log('次の削除済みメモを選択:', nextItem.id);
        onSelectDeletedMemo(nextItem);
        setMemoScreenMode("view");
      } else {
        // これは通常起こらないが、念のため
        console.log('次のメモが見つからない、通常タブに戻る');
        onSelectDeletedMemo(null);
        setActiveTab("normal");
        setMemoScreenMode("list");
        onDeselectAndStayOnMemoList?.();
      }
    } else {
      // 最後の削除済みメモを復元した場合、通常タブに戻る
      console.log('最後の削除済みメモを復元、通常タブに戻る');
      onSelectDeletedMemo(null); // 削除済みメモの選択を解除
      setActiveTab("normal");
      // 少し遅延してからパネルを閉じる
      setTimeout(() => {
        setMemoScreenMode("list");
        onDeselectAndStayOnMemoList?.();
      }, 100);
    }
  }, [deletedNotes, onSelectDeletedMemo, setActiveTab, setMemoScreenMode, onDeselectAndStayOnMemoList]);


  return (
    <div className="flex h-[calc(100vh-64px)] bg-white">
      {/* 左側：一覧表示エリア */}
      <div
        className={`${memoScreenMode === "list" ? "w-full" : "w-1/2"} ${memoScreenMode !== "list" ? "border-r border-gray-300" : ""} pt-6 pl-6 pr-2 flex flex-col transition-all duration-300 relative`}
      >
        <DesktopUpper
          currentMode="memo"
          activeTab={activeTab as "normal" | "deleted"}
          onTabChange={(tab) => {
            console.log('タブ切り替え:', { from: activeTab, to: tab, selectedMemo: selectedMemo?.id, selectedDeletedMemo: selectedDeletedMemo?.id });
            
            // タブ切り替え時に選択をクリア
            if (tab === 'normal' && selectedDeletedMemo) {
              console.log('通常タブに切り替え、削除済みメモの選択を解除');
              onSelectDeletedMemo(null);
              setMemoScreenMode('list');
            } else if (tab === 'deleted' && selectedMemo) {
              console.log('削除済みタブに切り替え、通常メモの選択を解除');
              onSelectMemo(null);
              setMemoScreenMode('list');
            }
            
            setActiveTab(tab);
          }}
          onCreateNew={() => {
            // 新規作成時に選択状態をクリア
            onSelectMemo(null);
            onSelectDeletedMemo(null);
            setMemoScreenMode("create");
          }}
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
          console.log('右パネルを閉じる');
          setMemoScreenMode("list");
          onDeselectAndStayOnMemoList?.(); // 選択解除してメモ一覧に留まる
        }}
      >
        {(() => {
          console.log('右パネルコンテンツレンダー:', { memoScreenMode, selectedMemo: selectedMemo?.id, selectedDeletedMemo: selectedDeletedMemo?.id });
          return null;
        })()}
        {memoScreenMode === "create" && (
          <MemoEditor
            key={`create-${createEditorKey}`} // 管理されたキーで再マウント
            memo={null}
            onClose={() => setMemoScreenMode("list")}
            onSaveComplete={handleSaveComplete}
          />
        )}
        {memoScreenMode === "view" && selectedMemo && !selectedDeletedMemo && (
          <MemoEditor
            key={`memo-${selectedMemo.id}`}
            memo={selectedMemo}
            onClose={() => setMemoScreenMode("list")}
            onSaveComplete={handleSaveComplete}
            onDeleteComplete={handleDeleteComplete}
          />
        )}
        {memoScreenMode === "view" && selectedDeletedMemo && !selectedMemo && (
          <DeletedMemoViewer
            memo={selectedDeletedMemo}
            onClose={() => {
              setMemoScreenMode("list");
              // 削除済みタブからの閉じる時は通常タブに戻る
              if (activeTab === "deleted") {
                setActiveTab("normal");
              }
              onDeselectAndStayOnMemoList?.();
            }}
            onDeleteAndSelectNext={handleDeletedMemoAndSelectNext}
            onRestoreAndSelectNext={handleRestoreAndSelectNext}
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
