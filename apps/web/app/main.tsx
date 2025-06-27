'use client'

import { useState } from "react";
import MemoList from "@/components/memo-list";
import MemoEditor from "@/components/memo-editor";
import MemoViewer from "@/components/memo-viewer";
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

function Main() {
  const [isEditing, setIsEditing] = useState(false);
  const [selectedMemo, setSelectedMemo] = useState<Memo | null>(null);

  const handleSelectMemo = (memo: Memo) => {
    setSelectedMemo(memo);
    setIsEditing(false);
  };

  const handleNewMemo = () => {
    setIsEditing(true);
    setSelectedMemo(null);
  };

  const handleClose = () => {
    setIsEditing(false);
    setSelectedMemo(null);
  };

  return (
    <main>
      <ResizablePanelGroup direction="horizontal" className="h-screen w-full">
        <ResizablePanel defaultSize={20} minSize={10} maxSize={40}>
          <MemoList 
            onNewMemo={handleNewMemo}
            onSelectMemo={handleSelectMemo}
          />
        </ResizablePanel>
        <ResizableHandle className="bg-gray-300 w-[2px]" />
        <ResizablePanel>
          {isEditing ? (
            <MemoEditor onClose={handleClose} />
          ) : selectedMemo ? (
            <MemoViewer memo={selectedMemo} onClose={handleClose} />
          ) : (
            <div className="flex flex-col items-center justify-center h-screen bg-white gap-4">
              <h1 className="text-2xl font-bold">
                ようこそ！メモ画面へようこそ 📝
              </h1>
              <p className="text-gray-600">
                左側からメモを選択するか、新規追加してください
              </p>
            </div>
          )}
        </ResizablePanel>
      </ResizablePanelGroup>
    </main>
  );
}

export default Main;
