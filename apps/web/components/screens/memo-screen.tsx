"use client";

import DeletedMemoViewer from "@/components/features/memo/deleted-memo-viewer";
import MemoCreator from "@/components/features/memo/memo-creator";
import MemoEditor from "@/components/features/memo/memo-editor";
import DesktopLower from "@/components/layout/desktop-lower";
import DesktopUpper from "@/components/layout/desktop-upper";
import DeleteButton from "@/components/ui/buttons/delete-button";
import RightPanel from "@/components/ui/layout/right-panel";
import { BulkDeleteConfirmation } from "@/components/ui/modals";
import { useDeletedNotes, useNotes } from "@/src/hooks/use-notes";
import { useMemosBulkDelete } from "@/components/features/memo/use-memo-bulk-delete";
import { useUserPreferences } from "@/src/hooks/use-user-preferences";
import type { DeletedMemo, Memo } from "@/src/types/memo";
import { useEffect, useState, useCallback } from "react";
import { useApiConnection } from "@/src/hooks/use-api-connection";
import { 
  getMemoDisplayOrder, 
  createNextSelectionHandler, 
  createDeletedNextSelectionHandler 
} from "@/src/utils/domUtils";
import { createToggleHandler } from "@/src/utils/toggleUtils";

type MemoScreenMode = "list" | "view" | "create" | "edit";

interface MemoScreenProps {
  selectedMemo?: Memo | null;
  selectedDeletedMemo?: DeletedMemo | null;
  onSelectMemo: (memo: Memo) => void;
  onSelectDeletedMemo: (memo: DeletedMemo) => void;
  onClose: () => void;
  onClearSelection?: () => void; // 選択状態だけクリアする関数
}

function MemoScreen({
  selectedMemo,
  selectedDeletedMemo,
  onSelectMemo,
  onSelectDeletedMemo,
  onClose,
  onClearSelection,
}: MemoScreenProps) {
  const [memoScreenMode, setMemoScreenMode] = useState<MemoScreenMode>("list");
  const [activeTab, setActiveTab] = useState<"normal" | "deleted">("normal");
  const [viewMode, setViewMode] = useState<"card" | "list">("list");
  const [columnCount, setColumnCount] = useState(4);
  const [checkedMemos, setCheckedMemos] = useState<Set<number>>(new Set());
  const [checkedDeletedMemos, setCheckedDeletedMemos] = useState<Set<number>>(
    new Set()
  );
  const [displayMemos, setDisplayMemos] = useState<Memo[]>([]);
  const [initialized, setInitialized] = useState(false);

  // データ取得
  const { data: notes, isLoading: memoLoading, error: memoError } = useNotes();
  const { data: deletedNotes } = useDeletedNotes();
  const { preferences } = useUserPreferences(1);
  const { isOnline } = useApiConnection();

  // 一括削除関連
  const { handleBulkDelete, bulkDeleteState } = useMemosBulkDelete({
    activeTab,
    checkedMemos,
    checkedDeletedMemos,
    setCheckedMemos,
    setCheckedDeletedMemos,
    notes,
    deletedNotes,
    localMemos: displayMemos
  });

  // 設定値が変更されたらローカル状態を更新
  useEffect(() => {
    if (preferences) {
      const newViewMode = preferences.memoViewMode || "list";
      const newColumnCount = preferences.memoColumnCount || 4;
      setViewMode(newViewMode);
      setColumnCount(newColumnCount);
    }
  }, [preferences]);

  // メモが選択されている場合は表示モードに
  useEffect(() => {
    if (selectedMemo && memoScreenMode === "list") {
      setMemoScreenMode("view");
    }
    if (selectedDeletedMemo && memoScreenMode === "list") {
      setMemoScreenMode("view");
    }
  }, [selectedMemo, selectedDeletedMemo, memoScreenMode]);


  // オンライン時の初期化（一回限り）
  useEffect(() => {
    if (isOnline && !initialized && notes) {
      setDisplayMemos(notes);
      setInitialized(true);
      console.log('🟢 オンライン初期化完了:', notes.length, '件');
    }
  }, [isOnline, initialized, notes]);

  // メモ操作ハンドラー
  const addMemo = useCallback((memo: Memo) => {
    setDisplayMemos(prev => [memo, ...prev]);
    
    // 新規作成時は作成したメモを自動選択
    onSelectMemo(memo);
    console.log('📝 新規メモ作成&選択:', memo.title);
  }, [onSelectMemo]);

  const updateMemo = useCallback((id: number, updates: Partial<Memo>) => {
    // console.log('🔄 updateMemo呼び出し:', id, updates);
    setDisplayMemos(prev => {
      const updated = prev.map(m => 
        m.id === id ? { ...m, ...updates } : m
      );
      // console.log('📋 リスト更新後:', updated.find(m => m.id === id));
      return updated;
    });
    
    // 選択中メモも同時に更新
    if (selectedMemo && selectedMemo.id === id) {
      const updatedMemo = { ...selectedMemo, ...updates };
      // console.log('✅ 選択中メモ更新:', updatedMemo);
      onSelectMemo(updatedMemo);
    }
  }, [selectedMemo, onSelectMemo]);

  // IDのみ更新（API呼び出しなし）
  const updateMemoId = useCallback((oldId: number, newId: number) => {
    setDisplayMemos(prev => prev.map(m => 
      m.id === oldId ? { ...m, id: newId } : m
    ));
    
    // 選択中メモのIDも更新
    if (selectedMemo && selectedMemo.id === oldId) {
      const updatedMemo = { ...selectedMemo, id: newId };
      onSelectMemo(updatedMemo);
    }
    
    console.log('🔄 UI側ID更新:', oldId, '→', newId);
  }, [selectedMemo, onSelectMemo]);

  // オフライン時のローカルストレージ管理
  const [localMemos, setLocalMemos] = useState<Memo[]>([]);
  
  useEffect(() => {
    if (!isOnline) {
      const updateLocalMemos = () => {
        const localMemosList: Memo[] = [];
        
        Object.keys(localStorage).forEach((key) => {
          if (key.startsWith("memo_draft_")) {
            try {
              const data = JSON.parse(localStorage.getItem(key) || "{}");
              if (
                typeof data.id === "string" &&
                data.id.startsWith("new_") &&
                (data.title?.trim() || data.content?.trim())
              ) {
                const now = Math.floor(Date.now() / 1000);
                const normalizeTime = (timestamp: number) => {
                  if (!timestamp) return now;
                  return timestamp > 9999999999
                    ? Math.floor(timestamp / 1000)
                    : Math.floor(timestamp);
                };
                const hashId = -Math.abs(
                  data.id.split("").reduce((a: number, b: string) => {
                    a = (a << 5) - a + b.charCodeAt(0);
                    return a & a;
                  }, 0)
                );
                localMemosList.push({
                  id: hashId,
                  title: data.title || "無題",
                  content: data.content || "",
                  createdAt: normalizeTime(data.lastModified),
                  updatedAt: normalizeTime(
                    data.lastEditedAt || data.lastModified
                  ),
                  tempId: data.id,
                });
              }
            } catch (error) {
              console.error("ローカルメモの解析エラー:", key, error);
            }
          }
        });
        
        setLocalMemos(localMemosList);
      };

      updateLocalMemos();
      const interval = setInterval(updateLocalMemos, 1000);
      return () => clearInterval(interval);
    }
  }, [isOnline]);

  // 表示用メモリストの決定
  const effectiveMemos = isOnline ? displayMemos : localMemos;

  // 表示順序での次のメモを選択するハンドラー（実際の画面表示順序に基づく）
  const handleDeleteAndSelectNextInOrder = (deletedMemo: Memo) => {
    const allMemos = effectiveMemos;
    const displayOrder = getMemoDisplayOrder();
    
    createNextSelectionHandler(
      allMemos,
      deletedMemo,
      displayOrder,
      onSelectMemo,
      onClose,
      setMemoScreenMode
    );
  };

  // 削除済みメモでの次のメモ選択ハンドラー
  const handleDeletedMemoAndSelectNext = (deletedMemo: DeletedMemo) => {
    if (!deletedNotes) return;
    
    createDeletedNextSelectionHandler(
      deletedNotes,
      deletedMemo,
      onSelectDeletedMemo,
      onClose,
      setMemoScreenMode
    );
  };

  // 右側パネル表示時は列数を調整
  const effectiveColumnCount =
    memoScreenMode !== "list"
      ? columnCount <= 2
        ? columnCount
        : 2
      : columnCount;

  return (
    <div className="flex h-[calc(100vh-64px)] bg-white">
      {/* 左側：一覧表示エリア */}
      <div
        className={`${memoScreenMode === "list" ? "w-full" : "w-1/2"} ${memoScreenMode !== "list" ? "border-r border-gray-300" : ""} pt-6 pl-6 pr-2 flex flex-col transition-all duration-300 relative`}
      >
        <DesktopUpper
          currentMode="memo"
          activeTab={activeTab}
          onTabChange={(tab) => setActiveTab(tab as "normal" | "deleted")}
          onCreateNew={() => setMemoScreenMode("create")}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          columnCount={columnCount}
          onColumnCountChange={setColumnCount}
          rightPanelMode={memoScreenMode === "list" ? "hidden" : "view"}
          normalCount={effectiveMemos.length}
          deletedNotesCount={deletedNotes?.length || 0}
        />

        <DesktopLower
          currentMode="memo"
          activeTab={activeTab}
          viewMode={viewMode}
          effectiveColumnCount={effectiveColumnCount}
          isLoading={memoLoading}
          error={memoError}
          notes={notes || []}
          localMemos={effectiveMemos}
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
        {(() => {
          const shouldShow =
            (activeTab === "normal" && checkedMemos.size > 0) ||
            (activeTab === "deleted" && checkedDeletedMemos.size > 0);
          return shouldShow;
        })() && (
          <DeleteButton
            onDelete={handleBulkDelete}
            className="absolute bottom-6 right-6 z-10"
            count={
              activeTab === "deleted"
                ? checkedDeletedMemos.size
                : checkedMemos.size
            }
          />
        )}
      </div>

      {/* 右側：詳細表示エリア */}
      <RightPanel
        isOpen={memoScreenMode !== "list"}
        onClose={() => {
          setMemoScreenMode("list");
          onClearSelection?.(); // 選択状態のみクリア（画面は変更しない）
        }}
      >
        {memoScreenMode === "create" && (
          <MemoCreator 
            onClose={() => {
              setMemoScreenMode("list");
            }}
            onMemoAdd={addMemo}
            onMemoUpdate={updateMemo}
            onMemoIdUpdate={updateMemoId}
          />
        )}
        {memoScreenMode === "view" && selectedMemo && (
          <MemoEditor
            memo={selectedMemo}
            onClose={() => setMemoScreenMode("list")}
            onDeleteAndSelectNext={handleDeleteAndSelectNextInOrder}
            onMemoAdd={addMemo}
            onMemoUpdate={updateMemo}
          />
        )}
        {memoScreenMode === "view" && selectedDeletedMemo && (
          <DeletedMemoViewer
            memo={selectedDeletedMemo}
            onClose={() => setMemoScreenMode("list")}
            onDeleteAndSelectNext={handleDeletedMemoAndSelectNext}
          />
        )}
        {memoScreenMode === "edit" && selectedMemo && (
          <MemoEditor
            memo={selectedMemo}
            onClose={() => setMemoScreenMode("view")}
            onDeleteAndSelectNext={handleDeleteAndSelectNextInOrder}
            onMemoAdd={addMemo}
            onMemoUpdate={updateMemo}
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
