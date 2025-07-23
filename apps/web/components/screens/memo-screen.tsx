"use client";

import DeletedMemoViewer, {
  type DeletedMemoViewerRef,
} from "@/components/features/memo/deleted-memo-viewer";
import MemoEditor from "@/components/features/memo/memo-editor";
import { CSVImportModal } from "@/components/features/memo/csv-import-modal";
import { useMemosBulkDelete } from "@/components/features/memo/use-memo-bulk-delete";
import { useMemosBulkRestore } from "@/components/features/memo/use-memo-bulk-restore";
import DesktopLower from "@/components/layout/desktop-lower";
import DesktopUpper from "@/components/layout/desktop-upper";
import { BulkActionButtons } from "@/components/ui/layout/bulk-action-buttons";
import RightPanel from "@/components/ui/layout/right-panel";
import { useSortOptions } from "@/hooks/use-sort-options";
import { useBulkDeleteButton } from "@/src/hooks/use-bulk-delete-button";
import { useBulkProcessNotifications } from "@/src/hooks/use-bulk-process-notifications";
import { useDeletedItemOperations } from "@/src/hooks/use-deleted-item-operations";
import { useDeletionLid } from "@/src/hooks/use-deletion-lid";
import { useItemDeselect } from "@/src/hooks/use-item-deselect";
import {
  useDeletedMemos,
  useDeleteMemo,
  useMemos,
} from "@/src/hooks/use-memos";
import { useRightEditorDelete } from "@/src/hooks/use-right-editor-delete";
import { useScreenState } from "@/src/hooks/use-screen-state";
import { useSelectAll } from "@/src/hooks/use-select-all";
import { useSelectionHandlers } from "@/src/hooks/use-selection-handlers";
import { useUserPreferences } from "@/src/hooks/use-user-preferences";
import { useBoards } from "@/src/hooks/use-boards";
import type { DeletedMemo, Memo } from "@/src/types/memo";
import {
  getMemoDisplayOrder,
  getNextItemAfterDeletion,
} from "@/src/utils/domUtils";
import { createToggleHandler } from "@/src/utils/toggleUtils";
import { useCallback, useRef, useState, useEffect } from "react";
import { useTrashIconVisibility } from "@/src/hooks/use-trash-icon-visibility";

type MemoScreenMode = "list" | "view" | "create";

interface MemoScreenProps {
  selectedMemo?: Memo | null;
  selectedDeletedMemo?: DeletedMemo | null;
  onSelectMemo: (memo: Memo | null) => void;
  onSelectDeletedMemo: (memo: DeletedMemo | null) => void;
  onClose: () => void;
  onDeselectAndStayOnMemoList?: () => void; // 選択解除してメモ一覧に留まる
  rightPanelDisabled?: boolean; // 右パネル無効化（ボードから呼び出される場合）
  hideHeaderButtons?: boolean; // ヘッダーボタンを非表示（ボードから呼び出される場合）
  forceShowBoardName?: boolean; // ボード名表示を強制的に有効化（ボードから呼び出される場合）
}

function MemoScreen({
  selectedMemo,
  selectedDeletedMemo,
  onSelectMemo,
  onSelectDeletedMemo,
  onClose,
  onDeselectAndStayOnMemoList,
  hideHeaderButtons = false,
  forceShowBoardName = false,
}: MemoScreenProps) {
  // 一括処理中断通知の監視
  useBulkProcessNotifications();

  // 新規作成エディターのキー管理
  const [createEditorKey, setCreateEditorKey] = useState(0);

  // 選択モード管理
  const [selectionMode, setSelectionMode] = useState<"select" | "check">(
    "select"
  );

  // 編集日表示管理
  const [showEditDate, setShowEditDate] = useState(false);

  // ボード名表示管理
  const [showBoardName, setShowBoardName] = useState(forceShowBoardName);

  // ボードフィルター管理
  const [selectedBoardIds, setSelectedBoardIds] = useState<number[]>([]);
  const [boardFilterMode, setBoardFilterMode] = useState<'include' | 'exclude'>('include');

  // 並び替え管理
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { sortOptions, setSortOptions, getVisibleSortOptions } =
    useSortOptions("memo");

  // 削除ボタンの参照
  const deleteButtonRef = useRef<HTMLButtonElement>(null);

  // 削除済みメモビューアーの参照
  const deletedMemoViewerRef = useRef<DeletedMemoViewerRef>(null);

  // 削除完了時に蓋を閉じる処理
  useDeletionLid(() => setIsRightLidOpen(false));

  // 左側一括削除の状態
  const [isLeftDeleting, setIsLeftDeleting] = useState(false);
  
  // デバッグ用: isLeftDeletingの状態変化を監視
  useEffect(() => {
    console.log('📊 isLeftDeleting状態変化:', isLeftDeleting);
  }, [isLeftDeleting]);

  // ゴミ箱アイコンの表示状態を監視
  const { checkTrashIconStatus } = useTrashIconVisibility();

  // デバッグ用: 定期的にゴミ箱アイコンの状態をチェック
  useEffect(() => {
    if (isLeftDeleting) {
      console.log('🗑️🔍 削除開始 - ゴミ箱アイコン状態チェック');
      checkTrashIconStatus();
      
      // 削除中は定期的にチェック
      const interval = setInterval(() => {
        checkTrashIconStatus();
      }, 500);
      
      return () => clearInterval(interval);
    }
  }, [isLeftDeleting, checkTrashIconStatus]);
  const [isLeftLidOpen, setIsLeftLidOpen] = useState(false);

  // 右側削除の状態
  const [, setIsRightDeleting] = useState(false);
  const [isRightLidOpen, setIsRightLidOpen] = useState(false);

  // 復元の状態
  const [isRestoring, setIsRestoring] = useState(false);
  const [isRestoreLidOpen, setIsRestoreLidOpen] = useState(false);

  // CSVインポートモーダルの状態
  const [isCsvImportModalOpen, setIsCsvImportModalOpen] = useState(false);

  // データ取得
  const { data: memos, isLoading: memoLoading, error: memoError } = useMemos();
  const { data: deletedMemos } = useDeletedMemos();
  const { preferences } = useUserPreferences(1);
  const { data: boards } = useBoards();

  // 削除API
  const deleteNote = useDeleteMemo();

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

    // 蓋を閉じる（バックグラウンドで実行）
    setTimeout(() => {
      setIsRightLidOpen(false);
    }, 200);

    // 次のメモを選択（削除完了と同時）
    if (selectedMemo && memos) {
      const displayOrder = getMemoDisplayOrder();
      const nextItem = getNextItemAfterDeletion(
        memos, // 削除前の全メモを渡す
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
    memos,
    onSelectMemo,
    onDeselectAndStayOnMemoList,
    setMemoScreenMode,
  ]);

  // 一括削除ボタンの表示制御
  const { showDeleteButton } = useBulkDeleteButton({
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
    items: memos || null,
    deletedItems: deletedMemos || null,
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
    memos,
    deletedMemos,
    localMemos: memos || [],
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
  } = useMemosBulkRestore({
    checkedDeletedMemos,
    setCheckedDeletedMemos,
    deletedMemos,
    onDeletedMemoRestore: handleItemDeselect,
    restoreButtonRef,
    setIsRestoring,
    setIsLidOpen: setIsRestoreLidOpen,
  });

  // 削除済みメモ操作の共通ロジック
  const { selectNextDeletedItem: selectNextDeletedMemo, handleRestoreAndSelectNext } = 
    useDeletedItemOperations({
      deletedItems: deletedMemos || null,
      onSelectDeletedItem: onSelectDeletedMemo,
      setScreenMode: (mode: string) => setMemoScreenMode(mode as MemoScreenMode),
      editorSelector: "[data-memo-editor]",
    });

  // タブ切り替え用の状態
  const [displayTab, setDisplayTab] = useState(activeTab);

  // カスタムタブ切り替えハンドラー - 直接状態を制御
  const handleCustomTabChange = useCallback(
    (newTab: string) => {
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
    },
    [
      selectedMemo,
      selectedDeletedMemo,
      onSelectMemo,
      onSelectDeletedMemo,
      setActiveTab,
      setMemoScreenMode,
    ]
  );

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

  return (
    <div className="flex h-full bg-white overflow-hidden">
      {/* 左側：一覧表示エリア */}
      <div
        className={`${memoScreenMode === "list" ? "w-full" : "w-[44%]"} ${memoScreenMode !== "list" ? "border-r border-gray-300" : ""} pt-3 pl-5 pr-2 flex flex-col transition-all duration-300 relative`}
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
          onSelectionModeChange={(mode) => {
            setSelectionMode(mode);
            // checkモードからselectモードに切り替える時、選択状態をクリア
            if (mode === "select") {
              setCheckedMemos(new Set());
              setCheckedDeletedMemos(new Set());
            }
          }}
          onSelectAll={handleSelectAll}
          isAllSelected={isAllSelected}
          sortOptions={getVisibleSortOptions(activeTab)}
          onSortChange={setSortOptions}
          showEditDate={showEditDate}
          onShowEditDateChange={setShowEditDate}
          showBoardName={showBoardName}
          onShowBoardNameChange={setShowBoardName}
          boards={boards || []}
          selectedBoardIds={selectedBoardIds}
          onBoardFilterChange={setSelectedBoardIds}
          filterMode={boardFilterMode}
          onFilterModeChange={setBoardFilterMode}
          normalCount={memos?.length || 0}
          deletedMemosCount={deletedMemos?.length || 0}
          hideAddButton={hideHeaderButtons}
          onCsvImport={() => setIsCsvImportModalOpen(true)}
        />

        <DesktopLower
          currentMode="memo"
          activeTab={displayTab as "normal" | "deleted"}
          viewMode={viewMode}
          effectiveColumnCount={effectiveColumnCount}
          isLoading={memoLoading}
          error={memoError}
          selectionMode={selectionMode}
          sortOptions={getVisibleSortOptions(activeTab)}
          showEditDate={showEditDate}
          showBoardName={showBoardName}
          selectedBoardIds={selectedBoardIds}
          boardFilterMode={boardFilterMode}
          memos={memos || []}
          localMemos={memos || []}
          deletedMemos={deletedMemos || []}
          selectedMemo={selectedMemo}
          selectedDeletedMemo={selectedDeletedMemo}
          checkedMemos={checkedMemos}
          checkedDeletedMemos={checkedDeletedMemos}
          onToggleCheckMemo={createToggleHandler(
            checkedMemos,
            setCheckedMemos
          )}
          onToggleCheckDeletedMemo={createToggleHandler(
            checkedDeletedMemos,
            setCheckedDeletedMemos
          )}
          onSelectMemo={handleSelectMemo}
          onSelectDeletedMemo={handleSelectDeletedMemo}
        />

        {/* 一括操作ボタン */}
        <BulkActionButtons
          showDeleteButton={showDeleteButton}
          deleteButtonCount={currentDisplayCount}
          onDelete={handleLeftBulkDelete}
          deleteButtonRef={deleteButtonRef}
          isDeleting={isLeftLidOpen}
          deleteVariant={activeTab === "deleted" ? "danger" : undefined}
          showRestoreButton={
            activeTab === "deleted" &&
            (checkedDeletedMemos.size > 0 ||
              (isRestoring && currentRestoreDisplayCount > 0))
          }
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
      <CSVImportModal
        isOpen={isCsvImportModalOpen}
        onClose={() => setIsCsvImportModalOpen(false)}
      />

      {/* 右側：詳細表示エリア */}
      <RightPanel
        isOpen={memoScreenMode !== "list"}
        onClose={handleRightPanelClose}
      >
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
            onDelete={() => {
              // メモエディターの削除処理
              if (selectedMemo) {
                // 1. 蓋を開く
                setIsRightLidOpen(true);
                setTimeout(() => {
                  // 2. 削除実行
                  handleRightEditorDelete(selectedMemo);
                }, 200);
              }
            }}
            isLidOpen={isRightLidOpen}
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
              isLidOpen={isRightLidOpen}
              onDeleteClick={() => {
                // 削除済メモの削除処理
                if (selectedDeletedMemo) {
                  // 1. 蓋を開く
                  setIsRightLidOpen(true);
                  setTimeout(() => {
                    // 2. 削除確認モーダルを表示
                    deletedMemoViewerRef.current?.showDeleteConfirmation();
                  }, 200);
                }
              }}
            />
          </>
        )}
      </RightPanel>
    </div>
  );
}

export default MemoScreen;
