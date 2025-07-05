"use client";

import DeletedMemoViewer from "@/components/features/memo/deleted-memo-viewer";
import MemoEditor from "@/components/features/memo/memo-editor";
import { useMemosBulkDelete } from "@/components/features/memo/use-memo-bulk-delete";
import { useMemosBulkRestore } from "@/components/features/memo/use-memo-bulk-restore";
import DesktopLower from "@/components/layout/desktop-lower";
import DesktopUpper from "@/components/layout/desktop-upper";
import DeleteButton from "@/components/ui/buttons/delete-button";
import RestoreButton from "@/components/ui/buttons/restore-button";
import RightPanel from "@/components/ui/layout/right-panel";
import { useDeletedNotes, useNotes, useDeleteNote } from "@/src/hooks/use-notes";
import { useScreenState } from "@/src/hooks/use-screen-state";
import { useUserPreferences } from "@/src/hooks/use-user-preferences";
import type { DeletedMemo, Memo } from "@/src/types/memo";
import {
  getMemoDisplayOrder,
  getNextDeletedItem,
  getNextItemAfterDeletion,
} from "@/src/utils/domUtils";
import {
  getDeleteButtonCount,
  shouldShowDeleteButton,
} from "@/src/utils/screenUtils";
import { createToggleHandler } from "@/src/utils/toggleUtils";
import { DELETE_BUTTON_POSITION } from "@/src/constants/ui";
import { useCallback, useMemo, useRef, useState } from "react";

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

  // 左側一括削除のアニメーション状態
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  // 左側一括削除ボタンの蓋の開閉状態
  const [isBulkDeleteLidOpen, setIsBulkDeleteLidOpen] = useState(false);
  
  // 右側エディター削除のアニメーション状態
  const [isEditorDeleting, setIsEditorDeleting] = useState(false);

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
    setIsBulkDeleting(false); // 一括削除状態をリセット
    setIsEditorDeleting(false); // エディター削除状態をリセット
    
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


  // 削除ボタン表示判定の統一化
  const shouldShowLeftBulkDelete = useMemo(() => {
    return shouldShowDeleteButton(
      activeTab,
      "deleted",
      checkedMemos,
      checkedDeletedMemos
    ) || isBulkDeleting;
  }, [activeTab, checkedMemos, checkedDeletedMemos, isBulkDeleting]);

  const deleteButtonCount = useMemo(() => {
    return getDeleteButtonCount(
      activeTab,
      "deleted",
      checkedMemos,
      checkedDeletedMemos
    );
  }, [activeTab, checkedMemos, checkedDeletedMemos]);

  // 全選択状態の判定
  const isAllSelected = useMemo(() => {
    if (activeTab === "normal" && notes && notes.length > 0) {
      return notes.every((memo) => checkedMemos.has(memo.id));
    } else if (
      activeTab === "deleted" &&
      deletedNotes &&
      deletedNotes.length > 0
    ) {
      return deletedNotes.every((memo) => checkedDeletedMemos.has(memo.id));
    }
    return false;
  }, [activeTab, notes, deletedNotes, checkedMemos, checkedDeletedMemos]);

  // 全選択/全解除機能
  const handleSelectAll = useCallback(() => {
    if (activeTab === "normal" && notes) {
      if (isAllSelected) {
        setCheckedMemos(new Set());
      } else {
        const allMemoIds = new Set(notes.map((memo) => memo.id));
        setCheckedMemos(allMemoIds);
      }
    } else if (activeTab === "deleted" && deletedNotes) {
      if (isAllSelected) {
        setCheckedDeletedMemos(new Set());
      } else {
        const allDeletedMemoIds = new Set(deletedNotes.map((memo) => memo.id));
        setCheckedDeletedMemos(allDeletedMemoIds);
      }
    }
  }, [
    activeTab,
    notes,
    deletedNotes,
    isAllSelected,
    setCheckedMemos,
    setCheckedDeletedMemos,
  ]);

  // 選択解除処理の統一化
  const handleItemDeselect = useCallback((id: number) => {
    if (selectedMemo?.id === id || selectedDeletedMemo?.id === id) {
      onDeselectAndStayOnMemoList?.();
      setMemoScreenMode("list");
    }
  }, [selectedMemo, selectedDeletedMemo, onDeselectAndStayOnMemoList, setMemoScreenMode]);

  // 左側一括削除関連（チェックボックスで選択したアイテムの一括削除）
  const { handleBulkDelete: handleLeftBulkDelete, DeleteModal: BulkDeleteModal } = useMemosBulkDelete({
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
    setIsDeleting: setIsBulkDeleting,
    setIsLidOpen: setIsBulkDeleteLidOpen,
    viewMode,
  });

  // 右側エディター削除処理（現在表示中のメモの単体削除）
  const handleRightEditorDelete = useCallback(async (memo: Memo) => {
    setIsEditorDeleting(true); // 右側削除アニメーション開始
    
    // 右側ゴミ箱とエディターエリアを取得
    const rightTrashButton = document.querySelector('[data-right-panel-trash]') as HTMLElement;
    const editorArea = document.querySelector('[data-memo-editor]') as HTMLElement;
    
    if (!rightTrashButton || !editorArea) {
      // アニメーション要素がない場合は直接削除
      try {
        await deleteNote.mutateAsync(memo.id);
        handleDeleteComplete();
      } catch {
        setIsEditorDeleting(false);
      }
      return;
    }
    
    // アニメーション実行後にAPI呼び出し
    const { animateEditorContentToTrash } = await import('@/src/utils/deleteAnimation');
    animateEditorContentToTrash(editorArea, rightTrashButton, async () => {
      try {
        await deleteNote.mutateAsync(memo.id);
        handleDeleteComplete();
      } catch {
        setIsEditorDeleting(false);
      }
    });
  }, [deleteNote, handleDeleteComplete]);

  // 一括復元関連
  const { handleBulkRestore, RestoreModal } = useMemosBulkRestore({
    checkedDeletedMemos,
    setCheckedDeletedMemos,
    deletedNotes,
    onDeletedMemoRestore: handleItemDeselect,
  });

  // 削除済みメモの完全削除時の次選択処理
  const handleDeletedMemoAndSelectNext = useCallback(
    (deletedMemo: DeletedMemo) => {
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
    },
    [deletedNotes, onSelectDeletedMemo, onClose, setMemoScreenMode]
  );

  // 削除済みメモの復元時の次選択処理
  const handleRestoreAndSelectNext = useCallback(
    (deletedMemo: DeletedMemo) => {
      // 復元後の削除済みメモ数を計算
      const remainingDeletedMemos = deletedNotes
        ? deletedNotes.filter((m) => m.id !== deletedMemo.id)
        : [];

      if (remainingDeletedMemos.length > 0) {
        // 他に削除済みメモがある場合は次を選択
        const nextItem = getNextDeletedItem(deletedNotes || [], deletedMemo);

        if (nextItem && nextItem.id !== deletedMemo.id) {
          onSelectDeletedMemo(nextItem);
          setMemoScreenMode("view");
        } else {
          // これは通常起こらないが、念のため
          onSelectDeletedMemo(null);
          setActiveTab("normal");
          setMemoScreenMode("list");
          onDeselectAndStayOnMemoList?.();
        }
      } else {
        // 最後の削除済みメモを復元した場合、通常タブに戻る
        onSelectDeletedMemo(null); // 削除済みメモの選択を解除
        setActiveTab("normal");
        // 少し遅延してからパネルを閉じる
        setTimeout(() => {
          setMemoScreenMode("list");
          onDeselectAndStayOnMemoList?.();
        }, 100);
      }
    },
    [
      deletedNotes,
      onSelectDeletedMemo,
      setActiveTab,
      setMemoScreenMode,
      onDeselectAndStayOnMemoList,
    ]
  );

  return (
    <div className="flex h-[calc(100vh-64px)] bg-white overflow-hidden">
      {/* 左側：一覧表示エリア */}
      <div
        className={`${memoScreenMode === "list" ? "w-full" : "w-1/2"} ${memoScreenMode !== "list" ? "border-r border-gray-300" : ""} pt-6 pl-6 pr-2 flex flex-col transition-all duration-300 relative`}
      >
        <DesktopUpper
          currentMode="memo"
          activeTab={activeTab as "normal" | "deleted"}
          onTabChange={(tab) => {
            // タブ切り替え時に選択をクリア
            if (tab === "normal" && selectedDeletedMemo) {
              onSelectDeletedMemo(null);
              setMemoScreenMode("list");
            } else if (tab === "deleted" && selectedMemo) {
              onSelectMemo(null);
              setMemoScreenMode("list");
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
          onToggleCheckMemo={createToggleHandler(checkedMemos, setCheckedMemos)}
          onToggleCheckDeletedMemo={createToggleHandler(
            checkedDeletedMemos,
            setCheckedDeletedMemos
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
        <div
          className={`absolute bottom-4 right-6 z-10 transition-opacity duration-300 ${
            shouldShowLeftBulkDelete
              ? "opacity-100"
              : "opacity-0 pointer-events-none"
          }`}
        >
          <DeleteButton
            ref={deleteButtonRef}
            onDelete={handleLeftBulkDelete}
            count={deleteButtonCount}
            isAnimating={isBulkDeleteLidOpen}
          />
        </div>


        {/* 一括復元ボタン */}
        <div className={`absolute bottom-4 left-6 z-10 transition-opacity duration-300 ${
          activeTab === "deleted" && checkedDeletedMemos.size > 0
            ? "opacity-100"
            : "opacity-0 pointer-events-none"
        }`}>
          <RestoreButton
            onRestore={handleBulkRestore}
            isRestoring={false}
            count={checkedDeletedMemos.size}
            buttonSize="size-9"
            iconSize="size-5"
            tooltipPosition="top"
          />
        </div>
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
        {memoScreenMode === "view" && selectedMemo && activeTab === "normal" && (
          <div className={`absolute ${DELETE_BUTTON_POSITION} z-10`}>
            <DeleteButton
              data-right-panel-trash
              onDelete={() => {
                // 右側エディター削除処理を実行
                if (selectedMemo) {
                  handleRightEditorDelete(selectedMemo);
                }
              }}
              isAnimating={isEditorDeleting}
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
    </div>
  );
}

export default MemoScreen;
