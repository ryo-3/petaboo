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
    console.log('🔄 削除完了処理開始:', { selectedMemo: selectedMemo?.id, notesCount: notes?.length });
    
    setIsBulkDeleting(false); // 一括削除状態をリセット
    setIsEditorDeleting(false); // エディター削除状態をリセット
    
    if (selectedMemo && notes) {
      const displayOrder = getMemoDisplayOrder();
      // 削除されたアイテムを除外した配列を作成
      const remainingNotes = notes.filter(note => note.id !== selectedMemo.id);
      console.log('📋 残りのメモ:', { remainingCount: remainingNotes.length });
      
      console.log('🔍 削除前データ:', { 
        selectedMemoId: selectedMemo.id, 
        displayOrder, 
        remainingNotes: remainingNotes.map(n => n.id) 
      });
      
      const nextItem = getNextItemAfterDeletion(
        notes, // 削除前の全メモを渡す
        selectedMemo,
        displayOrder
      );
      console.log('🎯 次のアイテム:', { nextItem: nextItem?.id });

      if (nextItem && nextItem.id !== selectedMemo.id) {
        console.log('✅ 次のメモを選択:', nextItem.id);
        onSelectMemo(nextItem);
        setMemoScreenMode("view");
      } else {
        console.log('❌ 次のメモなし、リストに戻る');
        setMemoScreenMode("list");
        onDeselectAndStayOnMemoList?.();
      }
    } else {
      console.log('❌ selectedMemoまたはnotesがない');
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
    onMemoDelete: (id: number) => {
      // 削除されたメモが現在選択中の場合は選択解除
      if (selectedMemo?.id === id) {
        onDeselectAndStayOnMemoList?.();
        setMemoScreenMode("list");
      }
    },
    deleteButtonRef,
    setIsDeleting: setIsBulkDeleting,
    setIsLidOpen: setIsBulkDeleteLidOpen,
    viewMode,
  });

  // 右側エディター削除処理（現在表示中のメモの単体削除）
  const handleRightEditorDelete = useCallback(async (memo: Memo) => {
    console.log('🗑️ 右側エディター削除:', memo.id);
    
    setIsEditorDeleting(true); // 右側削除アニメーション開始
    
    // 右側ゴミ箱とエディターエリアを取得
    const rightTrashButton = document.querySelector('[data-right-panel-trash]') as HTMLElement;
    const editorArea = document.querySelector('[data-memo-editor]') as HTMLElement;
    
    if (!rightTrashButton || !editorArea) {
      console.log('⚠️ アニメーション要素が見つからない、直接削除実行');
      // アニメーション要素がない場合は直接削除
      try {
        await deleteNote.mutateAsync(memo.id);
        handleDeleteComplete();
      } catch (error) {
        console.error('❌ 右側削除APIエラー:', error);
        setIsEditorDeleting(false);
      }
      return;
    }
    
    // アニメーション実行後にAPI呼び出し
    const { animateEditorContentToTrash } = await import('@/src/utils/deleteAnimation');
    animateEditorContentToTrash(editorArea, rightTrashButton, async () => {
      try {
        await deleteNote.mutateAsync(memo.id);
        console.log('🗑️ 右側削除API完了:', memo.id);
        handleDeleteComplete();
      } catch (error) {
        console.error('❌ 右側削除APIエラー:', error);
        setIsEditorDeleting(false);
      }
    });
  }, [deleteNote, handleDeleteComplete]);

  // 一括復元関連
  const { handleBulkRestore, RestoreModal } = useMemosBulkRestore({
    checkedDeletedMemos,
    setCheckedDeletedMemos,
    deletedNotes,
    onDeletedMemoRestore: (id: number) => {
      // 復元された削除済みメモが現在選択中の場合は選択解除
      if (selectedDeletedMemo?.id === id) {
        onDeselectAndStayOnMemoList?.();
        setMemoScreenMode("list");
      }
    },
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
      // console.log('復元処理開始:', { deletedMemo: deletedMemo.id, deletedNotesCount: deletedNotes?.length });

      // 復元後の削除済みメモ数を計算
      const remainingDeletedMemos = deletedNotes
        ? deletedNotes.filter((m) => m.id !== deletedMemo.id)
        : [];

      if (remainingDeletedMemos.length > 0) {
        // 他に削除済みメモがある場合は次を選択
        const nextItem = getNextDeletedItem(deletedNotes || [], deletedMemo);

        if (nextItem && nextItem.id !== deletedMemo.id) {
          // console.log('次の削除済みメモを選択:', nextItem.id);
          onSelectDeletedMemo(nextItem);
          setMemoScreenMode("view");
        } else {
          // これは通常起こらないが、念のため
          // console.log('次のメモが見つからない、通常タブに戻る');
          onSelectDeletedMemo(null);
          setActiveTab("normal");
          setMemoScreenMode("list");
          onDeselectAndStayOnMemoList?.();
        }
      } else {
        // 最後の削除済みメモを復元した場合、通常タブに戻る
        // console.log('最後の削除済みメモを復元、通常タブに戻る');
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
    <div className="flex h-[calc(100vh-64px)] bg-white">
      {/* 左側：一覧表示エリア */}
      <div
        className={`${memoScreenMode === "list" ? "w-full" : "w-1/2"} ${memoScreenMode !== "list" ? "border-r border-gray-300" : ""} pt-6 pl-6 pr-2 flex flex-col transition-all duration-300 relative`}
      >
        <DesktopUpper
          currentMode="memo"
          activeTab={activeTab as "normal" | "deleted"}
          onTabChange={(tab) => {
            // console.log('タブ切り替え:', { from: activeTab, to: tab, selectedMemo: selectedMemo?.id, selectedDeletedMemo: selectedDeletedMemo?.id });

            // タブ切り替え時に選択をクリア
            if (tab === "normal" && selectedDeletedMemo) {
              // console.log('通常タブに切り替え、削除済みメモの選択を解除');
              onSelectDeletedMemo(null);
              setMemoScreenMode("list");
            } else if (tab === "deleted" && selectedMemo) {
              // console.log('削除済みタブに切り替え、通常メモの選択を解除');
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

        {/* データ比較ログ */}
        {(() => {
          if (selectedMemo && notes) {
            const listMemo = notes.find(m => m.id === selectedMemo.id);
            if (listMemo) {
              console.log('📊 データ比較 - リスト側:', listMemo);
              console.log('📊 データ比較 - エディター側:', selectedMemo);
              console.log('📊 一致状況:', {
                title: listMemo.title === selectedMemo.title ? '✅' : '❌',
                content: listMemo.content === selectedMemo.content ? '✅' : '❌',
                updatedAt: listMemo.updatedAt === selectedMemo.updatedAt ? '✅' : '❌'
              });
              if (listMemo.title !== selectedMemo.title) {
                console.log('❌ タイトル不一致:', { リスト: listMemo.title, エディター: selectedMemo.title });
              }
              if (listMemo.content !== selectedMemo.content) {
                console.log('❌ 内容不一致:', { 
                  リスト: listMemo.content?.substring(0, 100) + '...', 
                  エディター: selectedMemo.content?.substring(0, 100) + '...' 
                });
              }
            } else {
              console.log('❌ リスト側にエディターのメモが見つからない:', selectedMemo.id);
            }
          }
          return null;
        })()}

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
            console.log('🎯 リストからメモ選択:', { id: memo.id, title: memo.title });
            onSelectMemo(memo);
            setMemoScreenMode("view");
          }}
          onSelectDeletedMemo={(memo) => {
            onSelectDeletedMemo(memo);
            setMemoScreenMode("view");
          }}
        />

        {/* 左側一括削除ボタン（チェックボックスで選択したアイテムの一括削除用） */}
        {(() => {
          const shouldShowLeftBulkDelete =
            shouldShowDeleteButton(
              activeTab,
              "deleted",
              checkedMemos,
              checkedDeletedMemos
            ) || isBulkDeleting;
          console.log("🔍 左側一括削除ボタン表示状態:", {
            shouldShow: shouldShowLeftBulkDelete,
            checkedMemosSize: checkedMemos.size,
            isBulkDeleting,
            activeTab,
          });
          return null;
        })()}
        <div
          className={`absolute bottom-6 right-6 z-10 transition-opacity duration-300 ${
            shouldShowDeleteButton(
              activeTab,
              "deleted",
              checkedMemos,
              checkedDeletedMemos
            ) || isBulkDeleting
              ? "opacity-100"
              : "opacity-0 pointer-events-none"
          }`}
        >
          <DeleteButton
            ref={deleteButtonRef}
            onDelete={handleLeftBulkDelete}
            count={getDeleteButtonCount(
              activeTab,
              "deleted",
              checkedMemos,
              checkedDeletedMemos
            )}
            isAnimating={isBulkDeleteLidOpen}
          />
        </div>


        {/* 一括復元ボタン */}
        {activeTab === "deleted" && checkedDeletedMemos.size > 0 && (
          <RestoreButton
            onRestore={handleBulkRestore}
            isRestoring={false}
            className="absolute bottom-6 left-6 z-10"
            count={checkedDeletedMemos.size}
            size="lg"
          />
        )}
      </div>

      {/* モーダル */}
      <BulkDeleteModal />
      <RestoreModal />

      {/* 右側：詳細表示エリア */}
      <RightPanel
        isOpen={memoScreenMode !== "list"}
        onClose={() => {
          // console.log('右パネルを閉じる');
          setMemoScreenMode("list");
          onDeselectAndStayOnMemoList?.(); // 選択解除してメモ一覧に留まる
        }}
      >
        {/* 右側エディター削除ボタン（現在表示中のメモの単体削除用） */}
        {memoScreenMode === "view" && selectedMemo && activeTab === "normal" && (
          <div className="absolute bottom-6 right-6 z-10">
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
        {/* {(() => {
          console.log('右パネルコンテンツレンダー:', { memoScreenMode, selectedMemo: selectedMemo?.id, selectedDeletedMemo: selectedDeletedMemo?.id });
          return null;
        })()} */}
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
            onDeleteStart={() => setIsBulkDeleting(true)}
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
