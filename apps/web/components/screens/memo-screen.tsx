"use client";

import DeletedMemoViewer, {
  type DeletedMemoViewerRef,
} from "@/components/features/memo/deleted-memo-viewer";
import MemoEditor from "@/components/features/memo/memo-editor";
import { useMemosBulkDelete } from "@/components/features/memo/use-memo-bulk-delete";
import { useMemosBulkRestore } from "@/components/features/memo/use-memo-bulk-restore";
import DesktopLower from "@/components/layout/desktop-lower";
import DesktopUpper from "@/components/layout/desktop-upper";
import DeleteButton from "@/components/ui/buttons/delete-button";
import RightPanel from "@/components/ui/layout/right-panel";
import { RightPanelDeleteButton } from "@/components/ui/buttons/right-panel-delete-button";
import { BulkActionButtons } from "@/components/ui/layout/bulk-action-buttons";
import { DELETE_BUTTON_POSITION } from "@/src/constants/ui";
import { useBulkDeleteButton } from "@/src/hooks/use-bulk-delete-button";
import { useDeletionLid } from "@/src/hooks/use-deletion-lid";
import { useItemDeselect } from "@/src/hooks/use-item-deselect";
import { useNextDeletedItemSelection } from "@/src/hooks/use-next-deleted-item-selection";
import { useRightEditorDelete } from "@/src/hooks/use-right-editor-delete";
import {
  useDeletedNotes,
  useDeleteNote,
  useNotes,
} from "@/src/hooks/use-notes";
import { useScreenState } from "@/src/hooks/use-screen-state";
import { useSelectAll } from "@/src/hooks/use-select-all";
import { useUserPreferences } from "@/src/hooks/use-user-preferences";
import { useSelectionHandlers } from "@/src/hooks/use-selection-handlers";
import type { DeletedMemo, Memo } from "@/src/types/memo";
import {
  createDeletedNextSelectionHandler,
  getMemoDisplayOrder,
  getNextItemAfterDeletion,
} from "@/src/utils/domUtils";
import { createToggleHandlerWithTabClear } from "@/src/utils/toggleUtils";
import { useCallback, useRef, useState } from "react";

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

  // 選択モード管理
  const [selectionMode, setSelectionMode] = useState<"select" | "check">(
    "select"
  );

  // 編集日表示管理
  const [showEditDate, setShowEditDate] = useState(true);

  // 削除ボタンの参照
  const deleteButtonRef = useRef<HTMLButtonElement>(null);

  // 削除済みメモビューアーの参照
  const deletedMemoViewerRef = useRef<DeletedMemoViewerRef>(null);

  // 削除完了時に蓋を閉じる処理
  useDeletionLid(() => setIsRightLidOpen(false));

  // 左側一括削除の状態
  const [isLeftDeleting, setIsLeftDeleting] = useState(false);
  const [isLeftLidOpen, setIsLeftLidOpen] = useState(false);

  // 右側削除の状態
  const [isRightDeleting, setIsRightDeleting] = useState(false);
  const [isRightLidOpen, setIsRightLidOpen] = useState(false);

  // 復元の状態
  const [isRestoring, setIsRestoring] = useState(false);
  const [isRestoreLidOpen, setIsRestoreLidOpen] = useState(false);

  // データ取得
  const { data: notes, isLoading: memoLoading, error: memoError } = useNotes();
  const { data: deletedNotes } = useDeletedNotes();
  const { preferences } = useUserPreferences(1);

  // 削除API
  const deleteNote = useDeleteNote();

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
    effectiveColumnCount,
  } = useScreenState(
    { type: "memo", defaultActiveTab: "normal", defaultColumnCount: 4 },
    "list" as MemoScreenMode,
    selectedMemo,
    selectedDeletedMemo,
    preferences || undefined
  );

  // 保存完了後の処理（超シンプル）
  const handleSaveComplete = useCallback(
    (savedMemo: Memo, wasEmpty: boolean, isNewMemo: boolean) => {
      if (wasEmpty) {
        // 空メモは削除して閉じる
        onDeselectAndStayOnMemoList?.();
        setMemoScreenMode("list");
      } else if (isNewMemo) {
        // 新規作成は連続作成のため再マウント
        onDeselectAndStayOnMemoList?.();
        setTimeout(() => {
          setCreateEditorKey((prev) => prev + 1); // キーを変更して再マウント
          setMemoScreenMode("create");
        }, 700); // 保存中表示(600ms)より少し長く
      } else {
        // 既存メモ更新は選択状態更新
        onSelectMemo(savedMemo);
      }
    },
    [onDeselectAndStayOnMemoList, setMemoScreenMode, onSelectMemo]
  );

  // 削除完了後の処理（次のメモを自動選択）
  const handleDeleteComplete = useCallback(() => {
    setIsLeftDeleting(false); // 左側削除状態をリセット
    setIsRightDeleting(false); // 右側削除状態をリセット

    if (selectedMemo && notes) {
      const displayOrder = getMemoDisplayOrder();
      const nextItem = getNextItemAfterDeletion(
        notes, // 削除前の全メモを渡す
        selectedMemo,
        displayOrder
      );

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
  }, [
    selectedMemo,
    notes,
    onSelectMemo,
    onDeselectAndStayOnMemoList,
    setMemoScreenMode,
  ]);

  // 一括削除ボタンの表示制御
  const { showDeleteButton, deleteButtonCount } = useBulkDeleteButton({ // eslint-disable-line @typescript-eslint/no-unused-vars
    activeTab,
    deletedTabName: "deleted",
    checkedItems: checkedMemos,
    checkedDeletedItems: checkedDeletedMemos,
    isDeleting: isLeftDeleting,
  });

  // 全選択機能
  const { isAllSelected, handleSelectAll } = useSelectAll({
    activeTab,
    deletedTabName: "deleted",
    items: notes || null,
    deletedItems: deletedNotes || null,
    checkedItems: checkedMemos,
    checkedDeletedItems: checkedDeletedMemos,
    setCheckedItems: setCheckedMemos,
    setCheckedDeletedItems: setCheckedDeletedMemos,
  });

  // 選択解除処理
  const handleItemDeselect = useItemDeselect(
    selectedMemo,
    selectedDeletedMemo,
    () => onDeselectAndStayOnMemoList?.(),
    (mode: string) => setMemoScreenMode(mode as MemoScreenMode)
  );

  // 左側一括削除関連（チェックボックスで選択したアイテムの一括削除）
  const {
    handleBulkDelete: handleLeftBulkDelete,
    DeleteModal: BulkDeleteModal,
    currentDisplayCount,
  } = useMemosBulkDelete({
    activeTab: activeTab as "normal" | "deleted",
    checkedMemos,
    checkedDeletedMemos,
    setCheckedMemos,
    setCheckedDeletedMemos,
    notes,
    deletedNotes,
    localMemos: notes || [],
    onMemoDelete: handleItemDeselect,
    deleteButtonRef,
    setIsDeleting: setIsLeftDeleting,
    setIsLidOpen: setIsLeftLidOpen,
    viewMode,
  });

  // 右側エディター削除処理（現在表示中のメモの単体削除）
  const handleRightEditorDelete = useRightEditorDelete({
    item: selectedMemo || null,
    deleteMutation: deleteNote,
    editorSelector: "[data-memo-editor]",
    setIsDeleting: setIsRightDeleting,
    onDeleteComplete: () => handleDeleteComplete(),
    executeApiFirst: false, // Memo方式：アニメーション内でAPI削除
    restoreEditorVisibility: false,
  });

  // 復元ボタンの参照
  const restoreButtonRef = useRef<HTMLButtonElement>(null);

  // 一括復元関連
  const { 
    handleBulkRestore, 
    RestoreModal,
    currentDisplayCount: currentRestoreDisplayCount,
    isRestoreModalOpen,
  } = useMemosBulkRestore({
    checkedDeletedMemos,
    setCheckedDeletedMemos,
    deletedNotes,
    onDeletedMemoRestore: handleItemDeselect,
    restoreButtonRef,
    setIsRestoring,
    setIsLidOpen: setIsRestoreLidOpen,
  });

  // 削除後の次選択処理
  const selectNextDeletedMemo = useNextDeletedItemSelection({
    deletedItems: deletedNotes || null,
    onSelectDeletedItem: onSelectDeletedMemo,
    onDeselectOnly: () => onSelectDeletedMemo(null),
    setScreenMode: (mode: string) => setMemoScreenMode(mode as MemoScreenMode),
    editorSelector: "[data-memo-editor]",
  });

  // 削除済みメモの復元時の次選択処理
  const handleRestoreAndSelectNext = (deletedMemo: DeletedMemo) => {
    if (!deletedNotes) return;
    createDeletedNextSelectionHandler(deletedNotes, deletedMemo, onSelectDeletedMemo, 
      () => onSelectDeletedMemo(null), setMemoScreenMode);
  };


  // タブ切り替え用の状態
  const [displayTab, setDisplayTab] = useState(activeTab);

  // カスタムタブ切り替えハンドラー - 直接状態を制御
  const handleCustomTabChange = useCallback((newTab: string) => {
    // 1. 先に内部状態を全て更新（画面には反映させない）
    
    // 個別選択のクリア
    if (newTab === "normal" && selectedDeletedMemo) {
      onSelectDeletedMemo(null);
      setMemoScreenMode("list");
    } else if (newTab === "deleted" && selectedMemo) {
      onSelectMemo(null);
      setMemoScreenMode("list");
    }
    
    // activeTabを更新
    setActiveTab(newTab);
    
    // 2. 状態更新完了後に表示を切り替え
    Promise.resolve().then(() => {
      setTimeout(() => {
        setDisplayTab(newTab);
      }, 0);
    });
  }, [selectedMemo, selectedDeletedMemo, onSelectMemo, onSelectDeletedMemo, setActiveTab, setMemoScreenMode]);

  // 選択ハンドラーパターン
  const {
    handleSelectItem: handleSelectMemo,
    handleSelectDeletedItem: handleSelectDeletedMemo,
    handleCreateNew,
    handleRightPanelClose,
  } = useSelectionHandlers<Memo, DeletedMemo>({
    setScreenMode: (mode: string) => setMemoScreenMode(mode as MemoScreenMode),
    onSelectItem: onSelectMemo,
    onSelectDeletedItem: onSelectDeletedMemo,
    onDeselectAndStay: onDeselectAndStayOnMemoList,
    onClose: onClose,
  });


  const screenHeight = preferences?.hideHeader ? 'h-screen' : 'h-[calc(100vh-64px)]';

  return (
    <div className={`flex ${screenHeight} bg-white overflow-hidden`}>
      {/* 左側：一覧表示エリア */}
      <div
        className={`${memoScreenMode === "list" ? "w-full" : "w-1/2"} ${memoScreenMode !== "list" ? "border-r border-gray-300" : ""} pt-6 pl-6 pr-2 flex flex-col transition-all duration-300 relative`}
      >
        <DesktopUpper
          currentMode="memo"
          activeTab={displayTab as "normal" | "deleted"}
          onTabChange={handleCustomTabChange}
          onCreateNew={handleCreateNew}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          columnCount={columnCount}
          onColumnCountChange={setColumnCount}
          rightPanelMode={memoScreenMode === "list" ? "hidden" : "view"}
          selectionMode={selectionMode}
          onSelectionModeChange={setSelectionMode}
          onSelectAll={handleSelectAll}
          isAllSelected={isAllSelected}
          showEditDate={showEditDate}
          onShowEditDateChange={setShowEditDate}
          normalCount={notes?.length || 0}
          deletedNotesCount={deletedNotes?.length || 0}
        />

        <DesktopLower
          currentMode="memo"
          activeTab={displayTab as "normal" | "deleted"}
          viewMode={viewMode}
          effectiveColumnCount={effectiveColumnCount}
          isLoading={memoLoading}
          error={memoError}
          selectionMode={selectionMode}
          showEditDate={showEditDate}
          notes={notes || []}
          localMemos={notes || []}
          deletedNotes={deletedNotes || []}
          selectedMemo={selectedMemo}
          selectedDeletedMemo={selectedDeletedMemo}
          checkedMemos={checkedMemos}
          checkedDeletedMemos={checkedDeletedMemos}
          onToggleCheckMemo={createToggleHandlerWithTabClear(
            checkedMemos,
            setCheckedMemos,
            [setCheckedDeletedMemos]
          )}
          onToggleCheckDeletedMemo={createToggleHandlerWithTabClear(
            checkedDeletedMemos,
            setCheckedDeletedMemos,
            [setCheckedMemos]
          )}
          onSelectMemo={handleSelectMemo}
          onSelectDeletedMemo={handleSelectDeletedMemo}
        />

        {/* 一括操作ボタン */}
        <BulkActionButtons
          showDeleteButton={(() => {
            // 削除済みタブでの特別ロジック
            if (activeTab === "deleted") {
              // 復元モーダル開いてる時は非表示
              if (isRestoreModalOpen) return false;
              // アニメーション中（蓋が開いている間）は非表示
              if (isRestoreLidOpen) return false;
              // 復元中で蓋が閉じていて選択項目がある場合は表示（部分復元完了後）
              if (isRestoring && !isRestoreLidOpen && checkedDeletedMemos.size > 0) return true;
              // 復元中で蓋が閉じていて選択項目がない場合は非表示
              if (isRestoring) return false;
              // 選択項目がある時は表示
              return checkedDeletedMemos.size > 0;
            }
            // 通常タブの場合
            const result = showDeleteButton && !isRestoreModalOpen;
            console.log('🗑️ 削除ボタン表示判定:', { activeTab, showDeleteButton, isRestoreModalOpen, isRestoring, checkedDeletedCount: checkedDeletedMemos.size, result });
            return result;
          })()}
          deleteButtonCount={currentDisplayCount}
          onDelete={handleLeftBulkDelete}
          deleteButtonRef={deleteButtonRef}
          isDeleting={isLeftLidOpen}
          deleteVariant={activeTab === "deleted" ? "danger" : undefined}
          showRestoreButton={activeTab === "deleted" && (checkedDeletedMemos.size > 0 || (isRestoring && currentRestoreDisplayCount > 0))}
          restoreCount={checkedDeletedMemos.size}
          onRestore={handleBulkRestore}
          restoreButtonRef={restoreButtonRef}
          isRestoring={isRestoreLidOpen}
          animatedRestoreCount={currentRestoreDisplayCount}
          useAnimatedRestoreCount={true}
        />
      </div>

      {/* モーダル */}
      <BulkDeleteModal />
      <RestoreModal />

      {/* 右側：詳細表示エリア */}
      <RightPanel
        isOpen={memoScreenMode !== "list"}
        onClose={handleRightPanelClose}
      >
        {/* 右側エディター削除ボタン（現在表示中のメモの単体削除用） */}
        {memoScreenMode === "view" &&
          selectedMemo &&
          activeTab === "normal" && (
            <div className={`${DELETE_BUTTON_POSITION} z-10`}>
              <DeleteButton
                data-right-panel-trash
                onDelete={() => {
                  // 右側エディター削除処理を実行
                  if (selectedMemo) {
                    handleRightEditorDelete(selectedMemo);
                  }
                }}
                isAnimating={isRightDeleting}
              />
            </div>
          )}
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
          />
        )}
        {memoScreenMode === "view" && selectedDeletedMemo && !selectedMemo && (
          <>
            <DeletedMemoViewer
              ref={deletedMemoViewerRef}
              memo={selectedDeletedMemo}
              onClose={() => {
                setMemoScreenMode("list");
                // 削除済みタブからの閉じる時は通常タブに戻る
                if (activeTab === "deleted") {
                  setActiveTab("normal");
                }
                onDeselectAndStayOnMemoList?.();
              }}
              onDeleteAndSelectNext={selectNextDeletedMemo}
              onRestoreAndSelectNext={handleRestoreAndSelectNext}
            />
            {/* 削除済みメモ用の右下削除ボタン */}
            <RightPanelDeleteButton
              viewerRef={deletedMemoViewerRef}
              setIsRightLidOpen={setIsRightLidOpen}
              isRightLidOpen={isRightLidOpen}
            />
          </>
        )}
      </RightPanel>
    </div>
  );
}

export default MemoScreen;
