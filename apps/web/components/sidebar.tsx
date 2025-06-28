"use client";

import MemoIcon from "@/components/icons/memo-icon";
import PlusIcon from "@/components/icons/plus-icon";
import TaskIcon from "@/components/icons/task-icon";
import SidebarMemoList from "@/components/sidebar-memo-list";
import SwitchTabs from "@/components/ui/switch-tabs";
import Tooltip from "@/components/ui/tooltip";
import type { Memo } from "@/src/types/memo";
import HomeButton from "./button/home-button";
import HomeIcon from "./icons/home-icon";

interface SidebarProps {
  onNewMemo: () => void;
  onSelectMemo: (memo: Memo) => void;
  onShowFullList: () => void;
  onHome: () => void;
  onEditMemo: (memo: Memo) => void;
  selectedMemoId?: number;
  isCompact?: boolean;
  currentMode?: "memo" | "task";
  onModeChange?: (mode: "memo" | "task") => void;
}

function Sidebar({
  onNewMemo,
  onSelectMemo,
  onShowFullList,
  onHome,
  onEditMemo,
  selectedMemoId,
  isCompact = false,
  currentMode = "memo",
  onModeChange,
}: SidebarProps) {
  const modeTabs = [
    {
      id: "memo",
      label: "メモ",
      icon: <MemoIcon className="w-3 h-3" />,
    },
    {
      id: "task",
      label: "タスク",
      icon: <TaskIcon className="w-3 h-3" />,
    },
  ];

  if (isCompact) {
    return (
      <div className="flex flex-col items-center py-4 h-screen bg-gray-50">
        <Tooltip text="ホーム" position="right">
          <button
            onClick={onHome}
            className="mb-4 p-2 rounded-lg bg-gray-200 hover:bg-gray-300 transition-colors"
          >
            <HomeIcon className="w-5 h-5 text-gray-600" />
          </button>
        </Tooltip>
        <Tooltip text="メモ一覧" position="right">
          <button
            onClick={() => {
              onModeChange && onModeChange("memo");
              onShowFullList();
            }}
            className={`mb-2 p-2 rounded-lg transition-colors ${
              currentMode === "memo"
                ? "bg-Yellow text-white"
                : "bg-gray-200 hover:bg-gray-300 text-gray-600"
            }`}
          >
            <MemoIcon className="w-5 h-5" />
          </button>
        </Tooltip>
        <Tooltip text="タスク一覧" position="right">
          <button
            onClick={() => {
              onModeChange && onModeChange("task");
              onShowFullList();
            }}
            className={`mb-4 p-2 rounded-lg transition-colors ${
              currentMode === "task"
                ? "bg-Yellow text-white"
                : "bg-gray-200 hover:bg-gray-300 text-gray-600"
            }`}
          >
            <TaskIcon className="w-5 h-5" />
          </button>
        </Tooltip>
        <Tooltip
          text={`新規${currentMode === "memo" ? "メモ" : "タスク"}作成`}
          position="right"
        >
          <button
            onClick={onNewMemo}
            className="p-2 rounded-lg bg-Green hover:bg-Green/85 text-white transition-colors"
          >
            <PlusIcon className="w-5 h-5" />
          </button>
        </Tooltip>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen min-w-64">
      <div className="flex-shrink-0">
        {/* ホームボタンとモード切り替えスイッチ */}
        <div className="flex justify-between items-center ml-2 mr-2 mt-2">
          <HomeButton onClick={onHome} />
          <SwitchTabs
            tabs={modeTabs}
            activeTab={currentMode}
            onTabChange={(tabId) =>
              onModeChange && onModeChange(tabId as "memo" | "task")
            }
          />
        </div>

        <div className="ml-2 mr-2 mt-2 flex gap-2">
          <button
            onClick={onShowFullList}
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-center rounded-lg py-2 transition-colors flex items-center justify-center gap-1"
          >
            {currentMode === "memo" ? (
              <MemoIcon className="w-4 h-4 text-gray-600" />
            ) : (
              <TaskIcon className="w-4 h-4 text-gray-600" />
            )}
            <span className="text-gray-600 font-medium text-sm">
              {currentMode === "memo" ? "メモ" : "タスク"}一覧
            </span>
          </button>
          <button
            onClick={onNewMemo}
            className="flex-1 bg-Green hover:bg-Green/85 text-center rounded-lg py-2 transition-colors flex items-center justify-center gap-1"
          >
            <PlusIcon className="w-4 h-4 text-gray-100" />
            <span className="font-medium text-sm text-gray-100">
              新規{currentMode === "memo" ? "メモ" : "タスク"}
            </span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden ml-2 mr-[2px] mt-4 mb-2">
        {currentMode === "memo" ? (
          <SidebarMemoList
            onSelectMemo={onSelectMemo}
            onEditMemo={onEditMemo}
            selectedMemoId={selectedMemoId}
          />
        ) : (
          <div className="text-center py-4 text-gray-400 text-sm">
            タスク機能は準備中です
          </div>
        )}
      </div>
    </div>
  );
}

export default Sidebar;
