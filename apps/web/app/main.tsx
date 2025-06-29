'use client'

import { useState, useEffect } from "react";
import Sidebar from "@/components/sidebar";
import DeletedMemoList from "@/components/deleted-memo-list";
import MemoEditor from "@/components/memo-editor";
import MemoViewer from "@/components/memo-viewer";
import DeletedMemoViewer from "@/components/deleted-memo-viewer";
import FullListView from "@/components/full-list-view";
import WelcomeScreen from "@/components/welcome-screen";
import Header from "@/components/header";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import type { Memo, DeletedMemo } from "@/src/types/memo";

function Main() {
  const [isEditing, setIsEditing] = useState(false);
  const [selectedMemo, setSelectedMemo] = useState<Memo | null>(null);
  const [selectedDeletedMemo, setSelectedDeletedMemo] = useState<DeletedMemo | null>(null);
  const [showDeleted, setShowDeleted] = useState(false);
  const [showFullList, setShowFullList] = useState(false);
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
    setIsEditing(false);
    if (!fromFullList) {
      setShowFullList(false);
    }
  };

  const handleSelectDeletedMemo = (memo: DeletedMemo, fromFullList = false) => {
    setSelectedDeletedMemo(memo);
    setSelectedMemo(null);
    setIsEditing(false);
    if (!fromFullList) {
      setShowFullList(false);
    }
  };

  const handleNewMemo = () => {
    setIsEditing(true);
    setSelectedMemo(null);
    setSelectedDeletedMemo(null);
    setShowDeleted(false);
    setShowFullList(false);
  };

  const handleClose = () => {
    setIsEditing(false);
    setSelectedMemo(null);
    setSelectedDeletedMemo(null);
    setShowFullList(false);
  };


  const handleBackToNotes = () => {
    setShowDeleted(false);
    setSelectedMemo(null);
    setSelectedDeletedMemo(null);
    setIsEditing(false);
    setShowFullList(false);
  };

  const handleShowFullList = () => {
    setShowFullList(true);
    setIsEditing(false);
    setSelectedMemo(null);
    setSelectedDeletedMemo(null);
    setShowDeleted(false);
  };

  const handleHome = () => {
    setIsEditing(false);
    setSelectedMemo(null);
    setSelectedDeletedMemo(null);
    setShowDeleted(false);
    setShowFullList(false);
  };

  const handleEditMemo = (memo?: Memo) => {
    if (memo) {
      setSelectedMemo(memo);
    }
    setIsEditing(true);
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
              onSelectMemo={handleSelectMemo}
              onShowFullList={handleShowFullList}
              onHome={handleHome}
              onEditMemo={handleEditMemo}
              selectedMemoId={selectedMemo?.id}
              isCompact={false}
              currentMode={currentMode}
              onModeChange={setCurrentMode}
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
                onSelectMemo={handleSelectMemo}
                onShowFullList={handleShowFullList}
                onHome={handleHome}
                onEditMemo={handleEditMemo}
                selectedMemoId={selectedMemo?.id}
                isCompact={true}
                currentMode={currentMode}
                onModeChange={setCurrentMode}
              />
            )}
            </div>
            <div className={`flex-1 ml-16 ${isEditing || selectedMemo || selectedDeletedMemo ? 'h-[calc(100vh-64px)] pt-16' : 'pt-16'}`}>
            {showFullList ? (
              <FullListView 
                onSelectMemo={handleSelectMemo} 
                onSelectDeletedMemo={handleSelectDeletedMemo} 
                onClose={handleClose} 
                currentMode={currentMode}
                selectedMemo={selectedMemo}
                selectedDeletedMemo={selectedDeletedMemo}
                onEditMemo={handleEditMemo}
              />
            ) : isEditing ? (
              <MemoEditor onClose={handleClose} memo={selectedMemo} />
            ) : selectedMemo ? (
              <MemoViewer memo={selectedMemo} onClose={handleClose} onEdit={handleEditMemo} />
            ) : selectedDeletedMemo ? (
              <DeletedMemoViewer memo={selectedDeletedMemo} onClose={handleClose} />
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
