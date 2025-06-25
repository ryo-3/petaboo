import LogoutButton from "@/components/logout-button";
import MemoList from "@/components/memo-list";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import React from "react";

function Main() {
  return (
    <main>
      <ResizablePanelGroup direction="horizontal" className="h-screen w-full">
        <ResizablePanel defaultSize={20} minSize={10} maxSize={40}>
          <MemoList />
        </ResizablePanel>
        <ResizableHandle className="bg-gray-300 w-[2px]" />
        <ResizablePanel>
          <div className="flex flex-col items-center justify-center h-screen bg-white gap-4">
            <h1 className="text-2xl font-bold">
              ようこそ！メモ画面へようこそ 📝
            </h1>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </main>
  );
}

export default Main;
