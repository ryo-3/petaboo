"use client";

import DeletedMemoList from "@/components/features/memo/deleted-memo-list";
import DeletedMemoViewer from "@/components/features/memo/deleted-memo-viewer";
import MemoCreator from "@/components/features/memo/memo-creator";
import MemoEditor from "@/components/features/memo/memo-editor";
import TaskCreator from "@/components/features/task/task-creator";
import TaskEditor from "@/components/features/task/task-editor";
import DesktopLayout from "@/components/layout/desktop-layout";
import DesktopListView from "@/components/layout/desktop-list-view";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import CreateScreen from "@/components/screens/create-screen";
import MemoScreen from "@/components/screens/memo-screen";
import SettingsScreen from "@/components/screens/settings-screen";
import TaskScreen from "@/components/screens/task-screen";
import WelcomeScreen from "@/components/screens/welcome-screen";
import { useNotes } from "@/src/hooks/use-notes";
import type { DeletedMemo, Memo } from "@/src/types/memo";
import type { DeletedTask, Task } from "@/src/types/task";
import { useEffect, useState } from "react";

// type ScreenMode = 'home' | 'list' | 'edit' | 'view' | 'settings';
type ScreenMode = 'home' | 'memo' | 'task' | 'create' | 'settings';

function Main() {
  const [screenMode, setScreenMode] = useState<ScreenMode>('home');
  const [selectedMemo, setSelectedMemo] = useState<Memo | null>(null);
  const [selectedDeletedMemo, setSelectedDeletedMemo] =
    useState<DeletedMemo | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedDeletedTask, setSelectedDeletedTask] =
    useState<DeletedTask | null>(null);
  const [showDeleted, setShowDeleted] = useState(false);
  const [currentMode, setCurrentMode] = useState<"memo" | "task">("memo");
  const [windowWidth, setWindowWidth] = useState(0);

  const { data: notes } = useNotes();

  // API同期フック（一時的に無効化 - 挙動整理のため）
  // Removed unused imports: useApiSync, syncStatus
  const errors: string[] = [];
  const clearErrors = () => {};

  useEffect(() => {
    const updateWindowWidth = () => {
      setWindowWidth(window.innerWidth);
    };

    updateWindowWidth();
    window.addEventListener("resize", updateWindowWidth);
    return () => window.removeEventListener("resize", updateWindowWidth);
  }, []);

  const isMobile = windowWidth <= 768;

  const handleSelectMemo = (memo: Memo, fromFullList = false) => {
    setSelectedMemo(memo);
    setSelectedDeletedMemo(null);
    setSelectedTask(null);
    setSelectedDeletedTask(null);
    setScreenMode('memo');
  };

  // メモ削除後に次のメモを選択するためのハンドラー
  const handleDeleteMemo = (nextMemo: Memo) => {
    setSelectedMemo(nextMemo);
    setSelectedDeletedMemo(null);
    setSelectedTask(null);
    setSelectedDeletedTask(null);
    setScreenMode('memo');
  };

  // エディターからメモ削除時に次のメモを選択するハンドラー
  const handleDeleteAndSelectNext = (deletedMemo: Memo) => {
    // ソート済み配列を取得（表示と同じ順序）
    const getSortedMemos = () => {
      const allMemos = [...(notes || [])];
      
      return allMemos.sort((a, b) => {
        const getLatestTime = (memo: Memo) => {
          if (memo.id < 0) {
            return memo.updatedAt || memo.createdAt;
          }

          const localData = localStorage.getItem(`memo_draft_${memo.id}`);
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

    const sortedMemos = getSortedMemos();
    
    if (sortedMemos.length > 1) {
      const deletedIndex = sortedMemos.findIndex((m) => m.id === deletedMemo.id);
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
        setSelectedMemo(nextMemo);
        setSelectedDeletedMemo(null);
        setSelectedTask(null);
        setSelectedDeletedTask(null);
        setScreenMode('memo');
      } else {
        handleClose();
      }
    } else {
      handleClose();
    }
  };

  const handleSelectDeletedMemo = (memo: DeletedMemo, fromFullList = false) => {
    setSelectedDeletedMemo(memo);
    setSelectedMemo(null);
    setSelectedTask(null);
    setSelectedDeletedTask(null);
    setScreenMode('memo');
  };

  const handleSelectTask = (task: Task | null, fromFullList = false) => {
    setSelectedTask(task);
    setSelectedMemo(null);
    setSelectedDeletedMemo(null);
    setSelectedDeletedTask(null);
    setScreenMode('task');
  };

  const handleSelectDeletedTask = (task: DeletedTask, fromFullList = false) => {
    setSelectedDeletedTask(task);
    setSelectedTask(null);
    setSelectedMemo(null);
    setSelectedDeletedMemo(null);
    setScreenMode('task');
  };

  const handleNewMemo = () => {
    setSelectedMemo(null);
    setSelectedDeletedMemo(null);
    setSelectedTask(null);
    setSelectedDeletedTask(null);
    setShowDeleted(false);
    setScreenMode('create');
  };

  const handleNewTask = () => {
    setSelectedMemo(null);
    setSelectedDeletedMemo(null);
    setSelectedTask(null);
    setSelectedDeletedTask(null);
    setShowDeleted(false);
    setScreenMode('create');
  };

  const handleClose = () => {
    setSelectedMemo(null);
    setSelectedDeletedMemo(null);
    setSelectedTask(null);
    setSelectedDeletedTask(null);
    setScreenMode('home');
  };

  const handleBackToNotes = () => {
    setShowDeleted(false);
    setSelectedMemo(null);
    setSelectedDeletedMemo(null);
    setSelectedTask(null);
    setSelectedDeletedTask(null);
    setScreenMode('home');
  };

  const handleShowFullList = () => {
    setSelectedMemo(null);
    setSelectedDeletedMemo(null);
    setSelectedTask(null);
    setSelectedDeletedTask(null);
    setShowDeleted(false);
    setScreenMode('memo');
  };

  const handleShowTaskList = () => {
    setSelectedMemo(null);
    setSelectedDeletedMemo(null);
    setSelectedTask(null);
    setSelectedDeletedTask(null);
    setShowDeleted(false);
    setScreenMode('task');
  };

  const handleHome = () => {
    setSelectedMemo(null);
    setSelectedDeletedMemo(null);
    setSelectedTask(null);
    setSelectedDeletedTask(null);
    setShowDeleted(false);
    setScreenMode('home');
  };

  const handleEditMemo = (memo?: Memo) => {
    if (memo) {
      setSelectedMemo(memo);
    }
    setScreenMode('memo');
  };

  const handleEditTask = (task?: Task) => {
    if (task) {
      setSelectedTask(task);
    }
    setScreenMode('task');
  };

  const handleSettings = () => {
    setSelectedMemo(null);
    setSelectedDeletedMemo(null);
    setSelectedTask(null);
    setSelectedDeletedTask(null);
    setShowDeleted(false);
    setScreenMode('settings');
  };

  // Removed unused function: handleBackFromSettings

  return (
    <main>
      {/* API同期エラー表示 */}
      {errors.length > 0 && (
        <div className="fixed top-4 right-4 z-50 space-y-2">
          {errors.map((error, index) => (
            <div
              key={index}
              className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded shadow-lg max-w-sm"
            >
              <div className="flex justify-between items-start">
                <span className="text-sm">{error}</span>
                <button
                  onClick={clearErrors}
                  className="ml-2 text-red-500 hover:text-red-700"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {isMobile ? (
        // モバイル: サイドバー100%
        <div className="h-screen w-full">
          {showDeleted ? (
            <DeletedMemoList
              onBackToNotes={handleBackToNotes}
              onSelectDeletedMemo={handleSelectDeletedMemo}
            />
          ) : (
            <Sidebar
              onNewMemo={handleNewMemo}
              onNewTask={handleNewTask}
              onSelectMemo={handleSelectMemo}
              onSelectTask={handleSelectTask}
              onEditTask={handleEditTask}
              onShowFullList={handleShowFullList}
              onHome={handleHome}
              onEditMemo={handleEditMemo}
              onDeleteMemo={handleDeleteMemo}
              selectedMemoId={selectedMemo?.id}
              selectedTaskId={selectedTask?.id}
              isCompact={false}
              currentMode={currentMode}
              onModeChange={setCurrentMode}
              onSettings={handleSettings}
            />
          )}
        </div>
      ) : (
        // デスクトップ: ヘッダー + レイアウト
        <div className="flex flex-col h-screen w-full">
          <Header currentMode={currentMode} />
          <DesktopLayout
            sidebarContent={
              <Sidebar
                onNewMemo={handleNewMemo}
                onNewTask={handleNewTask}
                onSelectMemo={handleSelectMemo}
                onSelectTask={handleSelectTask}
                onEditTask={handleEditTask}
                onShowFullList={handleShowFullList}
                onShowTaskList={handleShowTaskList}
                onHome={handleHome}
                onEditMemo={handleEditMemo}
                onDeleteMemo={handleDeleteMemo}
                selectedMemoId={selectedMemo?.id}
                selectedTaskId={selectedTask?.id}
                isCompact={true}
                currentMode={currentMode}
                onModeChange={setCurrentMode}
                onSettings={handleSettings}
              />
            }
          >
            {/* 旧バージョン（コメントアウト） */}
            {/*
            {screenMode === 'settings' && (
              <SettingsScreen />
            )}
            {screenMode === 'list' && (
              <DesktopListView
                onSelectMemo={handleSelectMemo}
                onSelectDeletedMemo={handleSelectDeletedMemo}
                onSelectTask={handleSelectTask}
                onSelectDeletedTask={handleSelectDeletedTask}
                onDeleteAndSelectNext={handleDeleteAndSelectNext}
                currentMode={currentMode}
                selectedMemo={selectedMemo}
                selectedDeletedMemo={selectedDeletedMemo}
                selectedTask={selectedTask}
                selectedDeletedTask={selectedDeletedTask}
              />
            )}
            {screenMode === 'edit' && (
              currentMode === "memo" ? (
                <MemoCreator onClose={handleClose} memo={selectedMemo} />
              ) : selectedTask ? (
                <TaskEditor
                  task={selectedTask}
                  onClose={handleClose}
                  onSelectTask={handleSelectTask}
                />
              ) : (
                <TaskCreator onClose={handleClose} />
              )
            )}
            {screenMode === 'view' && (
              selectedMemo ? (
                <MemoEditor
                  memo={selectedMemo}
                  onClose={handleClose}
                  onDeleteAndSelectNext={handleDeleteAndSelectNext}
                />
              ) : selectedTask ? (
                <TaskEditor
                  task={selectedTask}
                  onClose={handleClose}
                  onSelectTask={handleSelectTask}
                />
              ) : selectedDeletedMemo ? (
                <DeletedMemoViewer
                  memo={selectedDeletedMemo}
                  onClose={handleClose}
                />
              ) : selectedDeletedTask ? (
                <div className="p-6">削除済みタスクビューアー（未実装）</div>
              ) : null
            )}
            {screenMode === 'home' && (
              <WelcomeScreen />
            )}
            */}

            {/* 新バージョン（アイコンベース） */}
            {screenMode === 'settings' && (
              <SettingsScreen />
            )}
            {screenMode === 'home' && (
              <WelcomeScreen />
            )}
            {screenMode === 'memo' && (
              <MemoScreen
                selectedMemo={selectedMemo}
                selectedDeletedMemo={selectedDeletedMemo}
                onSelectMemo={handleSelectMemo}
                onSelectDeletedMemo={handleSelectDeletedMemo}
                onDeleteAndSelectNext={handleDeleteAndSelectNext}
                onClose={handleClose}
              />
            )}
            {screenMode === 'task' && (
              <TaskScreen
                selectedTask={selectedTask}
                selectedDeletedTask={selectedDeletedTask}
                onSelectTask={handleSelectTask}
                onSelectDeletedTask={handleSelectDeletedTask}
                onClose={handleClose}
              />
            )}
            {screenMode === 'create' && (
              <CreateScreen
                initialMode={currentMode}
                onClose={handleClose}
                onModeChange={setCurrentMode}
                onShowMemoList={handleShowFullList}
                onShowTaskList={handleShowTaskList}
              />
            )}
          </DesktopLayout>
        </div>
      )}
    </main>
  );
}

export default Main;
