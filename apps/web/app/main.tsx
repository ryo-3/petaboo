'use client'

import { useState } from "react";
import Sidebar from "@/components/sidebar";
import DeletedMemoList from "@/components/deleted-memo-list";
import MemoEditor from "@/components/memo-editor";
import MemoViewer from "@/components/memo-viewer";
import DeletedMemoViewer from "@/components/deleted-memo-viewer";
import FullMemoList from "@/components/full-memo-list";
import WelcomeScreen from "@/components/welcome-screen";
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

  const handleSelectMemo = (memo: Memo) => {
    setSelectedMemo(memo);
    setSelectedDeletedMemo(null);
    setIsEditing(false);
    setShowFullList(false);
  };

  const handleSelectDeletedMemo = (memo: DeletedMemo) => {
    setSelectedDeletedMemo(memo);
    setSelectedMemo(null);
    setIsEditing(false);
    setShowFullList(false);
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
      <div className="flex h-screen w-full">
        <div className={`${showFullList ? 'w-16' : 'w-64'} flex-shrink-0 border-r-2 border-gray-400 transition-all duration-300 overflow-hidden`}>
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
              isCompact={showFullList}
            />
          )}
        </div>
        <div className="flex-1">
          {showFullList ? (
            <FullMemoList onSelectMemo={handleSelectMemo} onSelectDeletedMemo={handleSelectDeletedMemo} onClose={handleClose} />
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
    </main>
  );
}

export default Main;
