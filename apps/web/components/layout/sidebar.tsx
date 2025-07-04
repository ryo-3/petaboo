"use client";

import DashboardIcon from "@/components/icons/dashboard-icon";
import HomeIcon from "@/components/icons/home-icon";
import MemoIcon from "@/components/icons/memo-icon";
import PlusIcon from "@/components/icons/plus-icon";
import SearchIcon from "@/components/icons/search-icon";
import SettingsIcon from "@/components/icons/settings-icon";
import TaskIcon from "@/components/icons/task-icon";
import MemoList from "@/components/mobile/memo-list";
import TaskList from "@/components/mobile/task-list";
import SwitchTabs from "@/components/ui/base/switch-tabs";
import Tooltip from "@/components/ui/base/tooltip";
import AddItemButton from "@/components/ui/buttons/add-item-button";
import type { Memo } from "@/src/types/memo";
import type { Task } from "@/src/types/task";

interface SidebarProps {
  onNewMemo: () => void;
  onSelectMemo: (memo: Memo) => void;
  onSelectTask?: (task: Task) => void;
  onEditTask?: (task: Task) => void;
  onShowFullList: () => void;
  onShowTaskList?: () => void;
  onHome: () => void;
  onEditMemo: (memo: Memo) => void;
  onDeleteMemo?: (memo: Memo) => void;
  selectedMemoId?: number;
  selectedTaskId?: number;
  isCompact?: boolean;
  currentMode?: "memo" | "task";
  onModeChange?: (mode: "memo" | "task") => void;
  onNewTask?: () => void;
  onSettings?: () => void;
  onSearch?: () => void;
  onDashboard?: () => void;
}

function Sidebar({
  onNewMemo,
  onSelectMemo,
  onSelectTask,
  onEditTask,
  onShowFullList,
  onShowTaskList,
  onHome,
  onEditMemo,
  onDeleteMemo,
  selectedMemoId,
  selectedTaskId,
  isCompact = false,
  currentMode = "memo",
  onModeChange,
  onNewTask,
  onSettings,
  onSearch,
  onDashboard,
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

  // PC表示サイドバー
  if (isCompact) {
    return (
      <div className="flex flex-col items-center py-4 h-screen bg-gray-50 justify-between">
        <div className="flex flex-col items-center gap-y-3">
          <Tooltip text="ホーム" position="right">
            <button
              onClick={onHome}
              className="p-2 rounded-lg bg-gray-200 hover:bg-gray-300 transition-colors"
            >
              <HomeIcon className="w-5 h-5 text-gray-600" />
            </button>
          </Tooltip>

          <Tooltip text="メモ一覧" position="right">
            <button
              onClick={() => {
                onModeChange?.("memo");
                onShowFullList();
              }}
              className={`p-2 rounded-lg transition-colors ${
                currentMode === "memo"
                  ? "bg-Green text-white"
                  : "bg-gray-200 hover:bg-gray-300 text-gray-600"
              }`}
            >
              <MemoIcon className="w-5 h-5" />
            </button>
          </Tooltip>
          <Tooltip text="タスク一覧" position="right">
            <button
              onClick={() => {
                onModeChange?.("task");
                onShowTaskList?.();
              }}
              className={`p-2 rounded-lg transition-colors ${
                currentMode === "task"
                  ? "bg-DeepBlue text-white"
                  : "bg-gray-200 hover:bg-gray-300 text-gray-600"
              }`}
            >
              <TaskIcon className="w-5 h-5" />
            </button>
          </Tooltip>
          <AddItemButton
            itemType={currentMode}
            onClick={currentMode === "memo" ? onNewMemo : onNewTask!}
            position="right"
          />
          <Tooltip text="ダッシュボード" position="right">
            <button
              onClick={onDashboard}
              className="p-2 rounded-lg bg-gray-200 hover:bg-gray-300 transition-colors"
            >
              <DashboardIcon className="w-5 h-5 text-gray-600" />
            </button>
          </Tooltip>
          {/* 検索ボタン（コンパクトモード） */}
          <Tooltip text="詳細検索" position="right">
            <button
              onClick={() => {
                onSearch?.();
              }}
              className="p-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-600 transition-colors"
            >
              <SearchIcon className="w-5 h-5" />
            </button>
          </Tooltip>
          {/* 設定ボタン（コンパクトモード） */}
          <Tooltip text="設定" position="right">
            <button
              onClick={() => {
                onSettings?.();
              }}
              className="p-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-600 transition-colors"
            >
              <SettingsIcon className="w-5 h-5" />
            </button>
          </Tooltip>
        </div>
      </div>
    );
  }
  // モバイル表示メニューバー
  return (
    <div className="flex flex-col h-screen min-w-64">
      <div className="flex-shrink-0">
        {/* ホームボタンとモード切り替えスイッチ */}
        <div className="flex justify-between items-center ml-2 mr-2 mt-2">
          <div className="flex gap-2">
            {/* <HomeButton onClick={onHome} /> */}
            <button
              onClick={onHome}
              className="p-2 rounded-lg bg-gray-200 hover:bg-gray-300 transition-colors"
            >
              <HomeIcon className="w-5 h-5 text-gray-600" />
            </button>
            <button
              onClick={onDashboard}
              className="p-2 rounded-lg bg-gray-200 hover:bg-gray-300 transition-colors"
            >
              <DashboardIcon className="w-5 h-5 text-gray-600" />
            </button>
            {/* 設定ボタン */}
            <div className="flex-shrink-0 p-2 border-t border-gray-200">
              <button
                onClick={() => onSettings?.()}
                className="w-full p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors flex items-center justify-center gap-2"
              >
                <SettingsIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
          <SwitchTabs
            tabs={modeTabs}
            activeTab={currentMode}
            onTabChange={(tabId) => onModeChange?.(tabId as "memo" | "task")}
          />
        </div>

        <div className="ml-2 mr-2 mt-2 flex gap-2">
          <button
            onClick={currentMode === "memo" ? onShowFullList : onShowTaskList}
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
            onClick={currentMode === "memo" ? onNewMemo : onNewTask}
            className={`flex-1 text-center rounded-lg py-2 transition-colors flex items-center justify-center gap-1 ${
              currentMode === "memo"
                ? "bg-Green hover:bg-Green/85"
                : "bg-DeepBlue hover:bg-DeepBlue/85"
            }`}
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
          <MemoList
            onSelectMemo={onSelectMemo}
            onEditMemo={onEditMemo}
            onDeleteMemo={onDeleteMemo}
            selectedMemoId={selectedMemoId}
          />
        ) : (
          <TaskList
            onSelectTask={onSelectTask!}
            onEditTask={onEditTask!}
            selectedTaskId={selectedTaskId}
          />
        )}
      </div>
    </div>
  );
}

export default Sidebar;
