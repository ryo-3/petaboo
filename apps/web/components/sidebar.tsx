'use client'

import MemoIcon from "@/components/icons/memo-icon";
import TaskIcon from "@/components/icons/task-icon";
import PlusIcon from "@/components/icons/plus-icon";
import SwitchTabs from "@/components/ui/switch-tabs";
import SidebarMemoList from "@/components/sidebar-memo-list";
import LogoutButton from "./button/logout-button";
import HomeButton from "./button/home-button";
import type { Memo } from "@/src/types/memo";
import { useState } from "react";

interface SidebarProps {
  onNewMemo: () => void;
  onSelectMemo: (memo: Memo) => void;
  onShowFullList: () => void;
  onHome: () => void;
  onEditMemo: (memo: Memo) => void;
}

function Sidebar({ onNewMemo, onSelectMemo, onShowFullList, onHome, onEditMemo }: SidebarProps) {
  const [currentMode, setCurrentMode] = useState<'memo' | 'task'>('memo')

  const modeTabs = [
    {
      id: 'memo',
      label: 'メモ',
      icon: <MemoIcon className="w-3 h-3" />
    },
    {
      id: 'task',
      label: 'タスク',
      icon: <TaskIcon className="w-3 h-3" />
    }
  ]

  return (
    <div className="flex flex-col justify-between h-screen">
      <div>
        {/* ホームボタンとモード切り替えスイッチ */}
        <div className="flex justify-between items-center mx-2 mt-2">
          <HomeButton onClick={onHome} />
          <SwitchTabs 
            tabs={modeTabs}
            activeTab={currentMode}
            onTabChange={(tabId) => setCurrentMode(tabId as 'memo' | 'task')}
          />
        </div>
        
        <div className="mx-2 mt-2 flex gap-2">
          <button
            onClick={onShowFullList}
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-center rounded-lg py-2 transition-colors flex items-center justify-center gap-1"
          >
            {currentMode === 'memo' ? (
              <MemoIcon className="w-4 h-4 text-gray-600" />
            ) : (
              <TaskIcon className="w-4 h-4 text-gray-600" />
            )}
            <span className="text-gray-600 font-medium text-sm">{currentMode === 'memo' ? 'メモ' : 'タスク'}一覧</span>
          </button>
          <button
            onClick={onNewMemo}
            className="flex-1 bg-emerald-200 hover:bg-emerald-300 text-center rounded-lg py-2 transition-colors flex items-center justify-center gap-1"
          >
            <PlusIcon className="w-4 h-4 text-slate-600" />
            <span className="text-slate-600 font-medium text-sm">新規{currentMode === 'memo' ? 'メモ' : 'タスク'}</span>
          </button>
        </div>

        
        <div className="mx-2 mt-4">
          {currentMode === 'memo' ? (
            <SidebarMemoList 
              onSelectMemo={onSelectMemo}
              onEditMemo={onEditMemo}
            />
          ) : (
            <div className="text-center py-4 text-gray-400 text-sm">
              タスク機能は準備中です
            </div>
          )}
        </div>
      </div>
      <div className="flex justify-start px-2 pb-4">
        <LogoutButton />
      </div>
    </div>
  );
}

export default Sidebar;
