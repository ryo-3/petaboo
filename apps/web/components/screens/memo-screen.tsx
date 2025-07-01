"use client";

import DeletedMemoViewer from "@/components/features/memo/deleted-memo-viewer";
import MemoCreator from "@/components/features/memo/memo-creator";
import MemoEditor from "@/components/features/memo/memo-editor";
import DesktopUpper from "@/components/layout/desktop-upper";
import DesktopLower from "@/components/layout/desktop-lower";
import { useDeletedNotes, useNotes } from "@/src/hooks/use-notes";
import { useUserPreferences } from "@/src/hooks/use-user-preferences";
import type { DeletedMemo, Memo } from "@/src/types/memo";
import { useEffect, useState } from "react";

type MemoScreenMode = 'list' | 'view' | 'create' | 'edit';

interface MemoScreenProps {
  selectedMemo?: Memo | null;
  selectedDeletedMemo?: DeletedMemo | null;
  onSelectMemo: (memo: Memo, fromFullList?: boolean) => void;
  onSelectDeletedMemo: (memo: DeletedMemo, fromFullList?: boolean) => void;
  onDeleteAndSelectNext?: (deletedMemo: Memo) => void;
  onClose: () => void;
}

function MemoScreen({
  selectedMemo,
  selectedDeletedMemo,
  onSelectMemo,
  onSelectDeletedMemo,
  onDeleteAndSelectNext,
  onClose,
}: MemoScreenProps) {
  const [memoScreenMode, setMemoScreenMode] = useState<MemoScreenMode>('list');
  const [activeTab, setActiveTab] = useState<"normal" | "deleted">("normal");
  const [viewMode, setViewMode] = useState<"card" | "list">("list");
  const [columnCount, setColumnCount] = useState(4);
  const [checkedMemos, setCheckedMemos] = useState<Set<number>>(new Set());
  const [checkedDeletedMemos, setCheckedDeletedMemos] = useState<Set<number>>(new Set());
  const [localMemos, setLocalMemos] = useState<Memo[]>([]);

  // データ取得
  const { data: notes, isLoading: memoLoading, error: memoError } = useNotes();
  const { data: deletedNotes } = useDeletedNotes();
  const { preferences } = useUserPreferences(1);

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
    if (selectedMemo && memoScreenMode === 'list') {
      setMemoScreenMode('view');
    }
    if (selectedDeletedMemo && memoScreenMode === 'list') {
      setMemoScreenMode('view');
    }
  }, [selectedMemo, selectedDeletedMemo, memoScreenMode]);

  // ローカルストレージから新規作成メモを取得
  useEffect(() => {
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
                updatedAt: normalizeTime(data.lastEditedAt || data.lastModified),
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
  }, []);

  // 表示順序でソートされたメモリストを取得する関数
  const getSortedMemos = () => {
    return [...(notes || []), ...localMemos]
      .sort((a, b) => {
        // ローカル編集時間も考慮してソート
        const getLatestTime = (memo: Memo) => {
          // 新規作成メモ（ID: -1）の場合
          if (memo.id === -1) {
            return memo.updatedAt || memo.createdAt;
          }

          const localData = localStorage.getItem(
            `memo_draft_${memo.id}`
          );
          let localEditTime = 0;
          if (localData) {
            try {
              const parsed = JSON.parse(localData);
              if (parsed.id === memo.id && parsed.lastEditedAt) {
                localEditTime = parsed.lastEditedAt;
              }
            } catch {
              // パースエラーは無視
            }
          }
          return Math.max(
            localEditTime,
            memo.updatedAt || 0,
            memo.createdAt
          );
        };

        return getLatestTime(b) - getLatestTime(a);
      });
  };

  // 表示順序での次のメモを選択するハンドラー
  const handleDeleteAndSelectNextInOrder = (deletedMemo: Memo) => {
    const sortedMemos = getSortedMemos();
    const deletedIndex = sortedMemos.findIndex(m => m.id === deletedMemo.id);
    let nextMemo: Memo | null = null;
    
    if (deletedIndex !== -1) {
      // 削除されたメモの次のメモを選択
      if (deletedIndex < sortedMemos.length - 1) {
        nextMemo = sortedMemos[deletedIndex + 1] || null;
      }
      // 最後のメモが削除された場合は前のメモを選択
      else if (deletedIndex > 0) {
        nextMemo = sortedMemos[deletedIndex - 1] || null;
      }
    }
    
    if (nextMemo) {
      // 次のメモを選択してビューモードに切り替え
      onSelectMemo(nextMemo, true);
      setMemoScreenMode("view");
    } else {
      // 次のメモが見つからない - リストモードに戻る
      setMemoScreenMode("list");
      onClose();
    }
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
      <div className={`${memoScreenMode === 'list' ? 'w-full' : 'w-1/2'} ${memoScreenMode !== 'list' ? 'border-r border-gray-300' : ''} pt-6 pl-6 pr-2 flex flex-col transition-all duration-300 relative`}>
        
        <DesktopUpper
          currentMode="memo"
          activeTab={activeTab}
          onTabChange={(tab) => setActiveTab(tab as "normal" | "deleted")}
          onCreateNew={() => setMemoScreenMode('create')}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          columnCount={columnCount}
          onColumnCountChange={setColumnCount}
          rightPanelMode={memoScreenMode === 'list' ? 'hidden' : 'view'}
          normalCount={(notes?.length || 0) + localMemos.length}
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
          localMemos={localMemos}
          deletedNotes={deletedNotes || []}
          tasks={[]} // 不要だがpropsで必要
          deletedTasks={[]} // 不要だがpropsで必要
          selectedMemo={selectedMemo}
          selectedDeletedMemo={selectedDeletedMemo}
          selectedTask={null}
          selectedDeletedTask={null}
          checkedMemos={checkedMemos}
          checkedDeletedMemos={checkedDeletedMemos}
          checkedTasks={new Set()} // 不要だがpropsで必要
          checkedDeletedTasks={new Set()} // 不要だがpropsで必要
          onToggleCheckMemo={(memoId) => {
            const newChecked = new Set(checkedMemos);
            if (checkedMemos.has(memoId)) {
              newChecked.delete(memoId);
            } else {
              newChecked.add(memoId);
            }
            setCheckedMemos(newChecked);
          }}
          onToggleCheckDeletedMemo={(memoId) => {
            const newChecked = new Set(checkedDeletedMemos);
            if (checkedDeletedMemos.has(memoId)) {
              newChecked.delete(memoId);
            } else {
              newChecked.add(memoId);
            }
            setCheckedDeletedMemos(newChecked);
          }}
          onToggleCheckTask={() => {}} // 不要だがpropsで必要
          onToggleCheckDeletedTask={() => {}} // 不要だがpropsで必要
          onSelectMemo={(memo) => {
            onSelectMemo(memo, true);
            setMemoScreenMode('view');
          }}
          onSelectDeletedMemo={(memo) => {
            onSelectDeletedMemo(memo, true);
            setMemoScreenMode('view');
          }}
          onSelectTask={() => {}} // 不要だがpropsで必要
          onSelectDeletedTask={() => {}} // 不要だがpropsで必要
        />
      </div>

      {/* 右側：詳細表示エリア */}
      {memoScreenMode !== 'list' && (
        <div className="w-1/2 h-full overflow-y-auto animate-slide-in-right relative">
          {/* 閉じるボタン */}
          <button
            onClick={() => {
              setMemoScreenMode('list');
              onClose();
            }}
            className="absolute -left-3 top-[40%] transform -translate-y-1/2 bg-white border border-gray-300 rounded-full p-1 text-gray-500 hover:text-gray-700 hover:border-gray-400 transition-colors z-10"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <div className="p-6">
            {memoScreenMode === 'create' && (
              <MemoCreator onClose={() => setMemoScreenMode('list')} />
            )}
            {memoScreenMode === 'view' && selectedMemo && (
              <MemoEditor
                memo={selectedMemo}
                onClose={() => setMemoScreenMode('list')}
                onDeleteAndSelectNext={handleDeleteAndSelectNextInOrder}
              />
            )}
            {memoScreenMode === 'view' && selectedDeletedMemo && (
              <DeletedMemoViewer
                memo={selectedDeletedMemo}
                onClose={() => setMemoScreenMode('list')}
              />
            )}
            {memoScreenMode === 'edit' && selectedMemo && (
              <MemoEditor
                memo={selectedMemo}
                onClose={() => setMemoScreenMode('view')}
                onDeleteAndSelectNext={handleDeleteAndSelectNextInOrder}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default MemoScreen;