'use client'

import { useState, useEffect } from "react";
import Sidebar from "@/components/sidebar";
import DeletedMemoList from "@/components/deleted-memo-list";
import MemoForm from "@/components/memo-form";
import MemoViewer from "@/components/memo-viewer";
import DeletedMemoViewer from "@/components/deleted-memo-viewer";
import FullListView from "@/components/full-list-view";
import WelcomeScreen from "@/components/welcome-screen";
import Header from "@/components/header";
import TaskCreator from "@/components/task-creator";
import TaskEditor from "@/components/task-editor";
import TaskViewer from "@/components/task-viewer";
import SettingsScreen from "@/components/settings-screen";
import type { Memo, DeletedMemo } from "@/src/types/memo";
import type { Task, DeletedTask } from "@/src/types/task";

function Main() {
  const [isEditing, setIsEditing] = useState(false);
  const [selectedMemo, setSelectedMemo] = useState<Memo | null>(null);
  const [selectedDeletedMemo, setSelectedDeletedMemo] = useState<DeletedMemo | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedDeletedTask, setSelectedDeletedTask] = useState<DeletedTask | null>(null);
  const [showDeleted, setShowDeleted] = useState(false);
  const [showFullList, setShowFullList] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [currentMode, setCurrentMode] = useState<'memo' | 'task'>('memo');
  const [windowWidth, setWindowWidth] = useState(0);

  useEffect(() => {
    const updateWindowWidth = () => {
      setWindowWidth(window.innerWidth);
    };
    
    updateWindowWidth();
    window.addEventListener('resize', updateWindowWidth);
    return () => window.removeEventListener('resize', updateWindowWidth);
  }, []);

  const isMobile = windowWidth <= 768;

  const handleSelectMemo = (memo: Memo, fromFullList = false) => {
    setSelectedMemo(memo);
    setSelectedDeletedMemo(null);
    setSelectedTask(null);
    setSelectedDeletedTask(null);
    setIsEditing(false);
    if (!fromFullList) {
      setShowFullList(false);
    }
  };

  const handleSelectDeletedMemo = (memo: DeletedMemo, fromFullList = false) => {
    setSelectedDeletedMemo(memo);
    setSelectedMemo(null);
    setSelectedTask(null);
    setSelectedDeletedTask(null);
    setIsEditing(false);
    if (!fromFullList) {
      setShowFullList(false);
    }
  };

  const handleSelectTask = (task: Task, fromFullList = false) => {
    setSelectedTask(task);
    setSelectedMemo(null);
    setSelectedDeletedMemo(null);
    setSelectedDeletedTask(null);
    setIsEditing(false);
    if (!fromFullList) {
      setShowFullList(false);
    }
  };

  const handleSelectDeletedTask = (task: DeletedTask, fromFullList = false) => {
    setSelectedDeletedTask(task);
    setSelectedTask(null);
    setSelectedMemo(null);
    setSelectedDeletedMemo(null);
    setIsEditing(false);
    if (!fromFullList) {
      setShowFullList(false);
    }
  };

  const handleNewMemo = () => {
    setIsEditing(true);
    setSelectedMemo(null);
    setSelectedDeletedMemo(null);
    setSelectedTask(null);
    setSelectedDeletedTask(null);
    setShowDeleted(false);
    setShowFullList(false);
  };

  const handleNewTask = () => {
    setIsEditing(true);
    setSelectedMemo(null);
    setSelectedDeletedMemo(null);
    setSelectedTask(null);
    setSelectedDeletedTask(null);
    setShowDeleted(false);
    setShowFullList(false);
  };

  const handleClose = () => {
    setIsEditing(false);
    setSelectedMemo(null);
    setSelectedDeletedMemo(null);
    setSelectedTask(null);
    setSelectedDeletedTask(null);
    setShowFullList(false);
  };


  const handleBackToNotes = () => {
    setShowDeleted(false);
    setSelectedMemo(null);
    setSelectedDeletedMemo(null);
    setSelectedTask(null);
    setSelectedDeletedTask(null);
    setIsEditing(false);
    setShowFullList(false);
  };

  const handleShowFullList = () => {
    setShowFullList(true);
    setIsEditing(false);
    setSelectedMemo(null);
    setSelectedDeletedMemo(null);
    setSelectedTask(null);
    setSelectedDeletedTask(null);
    setShowDeleted(false);
    setShowSettings(false);
  };

  const handleHome = () => {
    setIsEditing(false);
    setSelectedMemo(null);
    setSelectedDeletedMemo(null);
    setSelectedTask(null);
    setSelectedDeletedTask(null);
    setShowDeleted(false);
    setShowFullList(false);
    setShowSettings(false);
  };

  const handleEditMemo = (memo?: Memo) => {
    if (memo) {
      setSelectedMemo(memo);
    }
    setIsEditing(true);
  };

  const handleEditTask = (task?: Task) => {
    if (task) {
      setSelectedTask(task);
    }
    setIsEditing(true);
  };

  const handleSettings = () => {
    setShowSettings(true);
    setIsEditing(false);
    setSelectedMemo(null);
    setSelectedDeletedMemo(null);
    setSelectedTask(null);
    setSelectedDeletedTask(null);
    setShowDeleted(false);
    setShowFullList(false);
  };

  const handleBackFromSettings = () => {
    setShowSettings(false);
  };

  return (
    <main>
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
        // デスクトップ: ヘッダー + アイコンサイドバー
        <div className="flex flex-col h-screen w-full">
          <Header 
            currentMode={currentMode}
          />
          <div className="flex flex-1">
            <div className="fixed left-0 top-16 w-16 h-[calc(100vh-64px)] border-r-2 border-gray-400 overflow-visible z-10">
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
                selectedMemoId={selectedMemo?.id}
                selectedTaskId={selectedTask?.id}
                isCompact={true}
                currentMode={currentMode}
                onModeChange={setCurrentMode}
                onSettings={handleSettings}
              />
            )}
            </div>
            <div className={`flex-1 ml-16 ${isEditing || selectedMemo || selectedDeletedMemo || selectedTask || selectedDeletedTask ? 'h-[calc(100vh-64px)] pt-16' : 'pt-16'}`}>
            {showSettings ? (
              <SettingsScreen 
                onBack={handleBackFromSettings}
              />
            ) : showFullList ? (
              <FullListView 
                onSelectMemo={handleSelectMemo} 
                onSelectDeletedMemo={handleSelectDeletedMemo}
                onSelectTask={handleSelectTask}
                onSelectDeletedTask={handleSelectDeletedTask}
                currentMode={currentMode}
                selectedMemo={selectedMemo}
                selectedDeletedMemo={selectedDeletedMemo}
                selectedTask={selectedTask}
                selectedDeletedTask={selectedDeletedTask}
                onEditMemo={handleEditMemo}
                onEditTask={handleEditTask}
              />
            ) : isEditing ? (
              currentMode === 'memo' ? (
                <MemoForm onClose={handleClose} memo={selectedMemo} />
              ) : selectedTask ? (
                <TaskEditor onClose={handleClose} task={selectedTask} />
              ) : (
                <TaskCreator onClose={handleClose} />
              )
            ) : selectedMemo ? (
              <MemoViewer memo={selectedMemo} onClose={handleClose} onEdit={handleEditMemo} />
            ) : selectedTask ? (
              <TaskViewer task={selectedTask} onClose={handleClose} onEdit={handleEditTask} />
            ) : selectedDeletedMemo ? (
              <DeletedMemoViewer memo={selectedDeletedMemo} onClose={handleClose} />
            ) : selectedDeletedTask ? (
              <div className="p-6">削除済みタスクビューアー（未実装）</div>
            ) : (
              <WelcomeScreen />
            )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default Main;
