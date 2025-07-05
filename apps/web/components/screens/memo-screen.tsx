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
import RestoreButton from "@/components/ui/buttons/restore-button";
import { ButtonContainer } from "@/components/ui/layout/button-container";
import RightPanel from "@/components/ui/layout/right-panel";
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
import { useTabChange } from "@/src/hooks/use-tab-change";
import { useUserPreferences } from "@/src/hooks/use-user-preferences";
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
  const { showDeleteButton, deleteButtonCount } = useBulkDeleteButton({
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

  // 一括復元関連
  const { handleBulkRestore, RestoreModal } = useMemosBulkRestore({
    checkedDeletedMemos,
    setCheckedDeletedMemos,
    deletedNotes,
    onDeletedMemoRestore: handleItemDeselect,
  });

  // 削除後の次選択処理
  const selectNextDeletedMemo = useNextDeletedItemSelection({
    deletedItems: deletedNotes || null,
    onSelectDeletedItem: onSelectDeletedMemo,
    onClose,
    setScreenMode: (mode: string) => setMemoScreenMode(mode as MemoScreenMode),
    editorSelector: "[data-memo-editor]",
  });

  // 削除済みメモの復元時の次選択処理
  const handleRestoreAndSelectNext = (deletedMemo: DeletedMemo) => {
    if (!deletedNotes) return;
    createDeletedNextSelectionHandler(deletedNotes, deletedMemo, onSelectDeletedMemo, 
      () => onDeselectAndStayOnMemoList?.(), setMemoScreenMode);
  };

  const screenHeight = preferences?.hideHeader ? 'h-screen' : 'h-[calc(100vh-64px)]';

  return (
    <div className={`flex ${screenHeight} bg-white overflow-hidden`}>
      {/* 左側：一覧表示エリア */}
      <div
        className={`${memoScreenMode === "list" ? "w-full" : "w-1/2"} ${memoScreenMode !== "list" ? "border-r border-gray-300" : ""} pt-6 pl-6 pr-2 flex flex-col transition-all duration-300 relative`}
      >
        <DesktopUpper
          currentMode="memo"
          activeTab={activeTab as "normal" | "deleted"}
          onTabChange={useTabChange({
            setActiveTab,
            setScreenMode: (mode: string) =>
              setMemoScreenMode(mode as MemoScreenMode),
            selectedItem: selectedMemo,
            selectedDeletedItem: selectedDeletedMemo,
            onSelectItem: onSelectMemo,
            onSelectDeletedItem: onSelectDeletedMemo,
            normalTabName: "normal",
            deletedTabName: "deleted",
          })}
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
          activeTab={activeTab as "normal" | "deleted"}
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
          onSelectMemo={(memo) => {
            onSelectMemo(memo);
            setMemoScreenMode("view");
          }}
          onSelectDeletedMemo={(memo) => {
            onSelectDeletedMemo(memo);
            setMemoScreenMode("view");
          }}
        />

        {/* 左側一括削除ボタン（チェックボックスで選択したアイテムの一括削除用） */}
        <ButtonContainer show={showDeleteButton} position="bottom-right">
          <DeleteButton
            ref={deleteButtonRef}
            onDelete={handleLeftBulkDelete}
            count={deleteButtonCount}
            isAnimating={isLeftLidOpen}
            variant={activeTab === "deleted" ? "danger" : undefined}
          />
        </ButtonContainer>

        {/* 一括復元ボタン */}
        <ButtonContainer
          show={activeTab === "deleted" && checkedDeletedMemos.size > 0}
          position="bottom-left"
        >
          <RestoreButton
            onRestore={handleBulkRestore}
            isRestoring={false}
            count={checkedDeletedMemos.size}
            buttonSize="size-9"
            iconSize="size-5"
            tooltipPosition="top"
          />
        </ButtonContainer>
      </div>

      {/* モーダル */}
      <BulkDeleteModal />
      <RestoreModal />

      {/* 右側：詳細表示エリア */}
      <RightPanel
        isOpen={memoScreenMode !== "list"}
        onClose={() => {
          setMemoScreenMode("list");
          onDeselectAndStayOnMemoList?.(); // 選択解除してメモ一覧に留まる
        }}
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
            <div className={`${DELETE_BUTTON_POSITION} z-10`}>
              <DeleteButton
                data-right-panel-trash
                onDelete={() => {
                  // ボタンクリック時に即座に蓋を開く
                  setIsRightLidOpen(true);

                  // モーダルを表示
                  deletedMemoViewerRef.current?.showDeleteConfirmation();
                }}
                isAnimating={isRightLidOpen}
                variant="danger"
              />
            </div>
          </>
        )}
      </RightPanel>
    </div>
  );
}

export default MemoScreen;
