'use client'

import { useState } from "react";
import MemoList from "@/components/memo-list";
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

type Memo = {
  id: number
  title: string
  content: string | null
  createdAt: number
}

type DeletedMemo = {
  id: number
  originalId: number
  title: string
  content: string | null
  createdAt: number
  deletedAt: number
}

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

  const handleShowDeleted = () => {
    setShowDeleted(true);
    setSelectedMemo(null);
    setSelectedDeletedMemo(null);
    setIsEditing(false);
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

  return (
    <main>
      <ResizablePanelGroup direction="horizontal" className="h-screen w-full">
        <ResizablePanel defaultSize={20} minSize={10} maxSize={40}>
          {showDeleted ? (
            <DeletedMemoList 
              onBackToNotes={handleBackToNotes}
              onSelectDeletedMemo={handleSelectDeletedMemo}
            />
          ) : (
            <MemoList 
              onNewMemo={handleNewMemo}
              onSelectMemo={handleSelectMemo}
              onShowDeleted={handleShowDeleted}
              onShowFullList={handleShowFullList}
              onSelectDeletedMemo={handleSelectDeletedMemo}
              onHome={handleHome}
            />
          )}
        </ResizablePanel>
        <ResizableHandle className="bg-gray-300 w-[2px]" />
        <ResizablePanel>
          {showFullList ? (
            <FullMemoList onSelectMemo={handleSelectMemo} onSelectDeletedMemo={handleSelectDeletedMemo} onClose={handleClose} />
          ) : isEditing ? (
            <MemoEditor onClose={handleClose} />
          ) : selectedMemo ? (
            <MemoViewer memo={selectedMemo} onClose={handleClose} />
          ) : selectedDeletedMemo ? (
            <DeletedMemoViewer memo={selectedDeletedMemo} onClose={handleClose} />
          ) : (
            <WelcomeScreen />
          )}
        </ResizablePanel>
      </ResizablePanelGroup>
    </main>
  );
}

export default Main;
