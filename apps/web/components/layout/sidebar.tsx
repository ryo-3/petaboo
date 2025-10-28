"use client";

import React from "react";
import { useNavigation } from "@/contexts/navigation-context";
import DashboardIcon from "@/components/icons/dashboard-icon";
import DashboardEditIcon from "@/components/icons/dashboard-edit-icon";
import HomeIcon from "@/components/icons/home-icon";
import MemoIcon from "@/components/icons/memo-icon";
import SearchIcon from "@/components/icons/search-icon";
import SettingsIcon from "@/components/icons/settings-icon";
import TaskIcon from "@/components/icons/task-icon";
import TeamIcon from "@/components/icons/team-icon";
import MemoList from "@/components/mobile/memo-list";
import TaskList from "@/components/mobile/task-list";
import SwitchTabs from "@/components/ui/base/switch-tabs";
import Tooltip from "@/components/ui/base/tooltip";
import NotificationBadge from "@/components/ui/base/notification-badge";
import type { Memo } from "@/src/types/memo";
import type { Task } from "@/src/types/task";

interface SidebarProps {
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
  currentMode?: "memo" | "task" | "board";
  onModeChange?: (mode: "memo" | "task" | "board") => void;
  onSettings?: () => void;
  onSearch?: () => void;
  onDashboard?: () => void;
  onBoardDetail?: () => void;
  currentBoardName?: string;
  showingBoardDetail?: boolean;
  onTeamList?: () => void;
  onTeamCreate?: () => void;
  currentTeamName?: string;
  onBackToBoardList?: () => void;
}

function Sidebar({
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
  onSettings,
  onSearch,
  onDashboard,
  onBoardDetail,
  currentBoardName,
  showingBoardDetail = false,
  onTeamList,
  onTeamCreate,
  currentTeamName,
  onBackToBoardList,
}: SidebarProps) {
  // NavigationContextから統一されたiconStatesを取得
  const { iconStates } = useNavigation();
  // 通知数を取得（一時的に0に設定）
  const notificationCount = 0;
  const markNotificationsAsRead = () => {}; // 空の関数

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
      <div className="flex md:flex-col flex-row items-center md:py-4 py-0 md:h-screen h-14 bg-gray-50 md:justify-between justify-center w-full">
        <div className="flex md:flex-col flex-row items-center md:gap-y-3 gap-x-4 md:w-auto justify-center md:justify-start">
          {/* ボード詳細時はホームの代わりに戻るボタンを表示（モバイルのみ） */}
          {onBackToBoardList && showingBoardDetail ? (
            <>
              {/* モバイル：戻るボタン */}
              <div className="md:hidden">
                <Tooltip text="ボード一覧に戻る" position="right">
                  <button
                    onClick={onBackToBoardList}
                    className="p-2 rounded-lg transition-colors bg-gray-200 hover:bg-gray-300 text-gray-600"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 19l-7-7m0 0l7-7m-7 7h18"
                      />
                    </svg>
                  </button>
                </Tooltip>
              </div>
              {/* デスクトップ：通常のホームボタン */}
              <div className="hidden md:block">
                <Tooltip text="ホーム" position="right">
                  <button
                    onClick={onHome}
                    className={`p-2 rounded-lg transition-colors ${
                      iconStates.home
                        ? "bg-slate-500 text-white"
                        : "bg-gray-200 hover:bg-gray-300 text-gray-600"
                    }`}
                  >
                    <HomeIcon
                      className={`w-5 h-5 ${
                        iconStates.home ? "text-white" : "text-gray-600"
                      }`}
                    />
                  </button>
                </Tooltip>
              </div>
            </>
          ) : (
            <Tooltip text="ホーム" position="right">
              <button
                onClick={onHome}
                className={`p-2 rounded-lg transition-colors ${
                  iconStates.home
                    ? "bg-slate-500 text-white"
                    : "bg-gray-200 hover:bg-gray-300 text-gray-600"
                }`}
              >
                <HomeIcon
                  className={`w-5 h-5 ${
                    iconStates.home ? "text-white" : "text-gray-600"
                  }`}
                />
              </button>
            </Tooltip>
          )}

          <Tooltip text="メモ一覧" position="right">
            <button
              onClick={() => {
                onModeChange?.("memo");
                onShowFullList();
              }}
              className={`p-2 rounded-lg transition-colors ${
                iconStates.memo
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
                iconStates.task
                  ? "bg-DeepBlue text-white"
                  : "bg-gray-200 hover:bg-gray-300 text-gray-600"
              }`}
            >
              <TaskIcon className="w-5 h-5" />
            </button>
          </Tooltip>
          <Tooltip text="ボード一覧" position="right">
            <button
              onClick={() => {
                // チーム詳細ページかどうかをURLで判定
                const isTeamDetailPage =
                  window.location.pathname.startsWith("/team/") &&
                  window.location.pathname !== "/team";
                if (isTeamDetailPage) {
                  // チーム詳細ページの場合はボードモードに切り替え
                  window.dispatchEvent(
                    new CustomEvent("team-mode-change", {
                      detail: {
                        mode: "board",
                        pathname: window.location.pathname,
                      },
                    }),
                  );
                } else {
                  // 通常ページの場合はボード一覧に移動
                  onDashboard?.();
                }
              }}
              className={`p-2 rounded-lg transition-colors ${
                iconStates.board
                  ? "bg-light-Blue text-white"
                  : "bg-gray-200 hover:bg-gray-300 text-gray-600"
              }`}
            >
              <DashboardIcon
                className={`w-5 h-5 ${iconStates.board ? "" : "text-gray-600"}`}
              />
            </button>
          </Tooltip>

          {/* ボード詳細 (選択中のボードがある場合のみ表示、デスクトップのみ) */}
          {currentBoardName && (
            <div className="hidden md:block">
              <Tooltip text={`${currentBoardName}詳細`} position="right">
                <button
                  onClick={onBoardDetail}
                  className={`p-2 rounded-lg transition-colors ${
                    iconStates.boardDetail
                      ? "bg-light-Blue text-white"
                      : "bg-gray-200 hover:bg-gray-300 text-gray-600"
                  }`}
                >
                  <DashboardEditIcon
                    className={`w-5 h-5 ${iconStates.boardDetail ? "" : "text-gray-600"}`}
                  />
                </button>
              </Tooltip>
            </div>
          )}

          {/* 検索ボタン（コンパクトモード） */}
          <Tooltip text="詳細検索" position="right">
            <button
              onClick={() => {
                onSearch?.();
              }}
              className={`p-2 rounded-lg transition-colors ${
                iconStates.search
                  ? "bg-slate-500 text-white"
                  : "bg-gray-200 hover:bg-gray-300 text-gray-600"
              }`}
            >
              <SearchIcon
                className={`w-5 h-5 ${iconStates.search ? "text-white" : ""}`}
              />
            </button>
          </Tooltip>
          {/* チーム一覧ボタン（コンパクトモード） */}
          <Tooltip text={currentTeamName || "チーム"} position="right">
            <button
              onClick={() => {
                // 通知を既読にする
                markNotificationsAsRead();
                // チーム一覧に移動
                if (onTeamList) {
                  onTeamList();
                } else {
                  window.location.href = "/team";
                }
              }}
              className={`relative p-2 rounded-lg transition-colors ${
                iconStates.team
                  ? "bg-slate-500 text-white"
                  : "bg-gray-200 hover:bg-gray-300 text-gray-600"
              }`}
            >
              <TeamIcon className="w-5 h-5" />
              <NotificationBadge count={notificationCount} size="sm" />
            </button>
          </Tooltip>
          {/* 設定ボタン（コンパクトモード） */}
          <Tooltip text="設定" position="right">
            <button
              onClick={() => {
                onSettings?.();
              }}
              className={`p-2 rounded-lg transition-colors ${
                iconStates.settings
                  ? "bg-slate-500 text-white"
                  : "bg-gray-200 hover:bg-gray-300 text-gray-600"
              }`}
            >
              <SettingsIcon
                className={`w-5 h-5 ${iconStates.settings ? "text-white" : ""}`}
              />
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
              className={`p-2 rounded-lg transition-colors ${
                iconStates.home
                  ? "bg-slate-500 text-white"
                  : "bg-gray-200 hover:bg-gray-300 text-gray-600"
              }`}
            >
              <HomeIcon
                className={`w-5 h-5 ${
                  iconStates.home ? "text-white" : "text-gray-600"
                }`}
              />
            </button>
            <button
              onClick={() => {
                // チーム詳細ページかどうかをURLで判定
                const isTeamDetailPage =
                  window.location.pathname.startsWith("/team/") &&
                  window.location.pathname !== "/team";
                if (isTeamDetailPage) {
                  // チーム詳細ページの場合はボードモードに切り替え
                  window.dispatchEvent(
                    new CustomEvent("team-mode-change", {
                      detail: {
                        mode: "board",
                        pathname: window.location.pathname,
                      },
                    }),
                  );
                } else {
                  // 通常ページの場合はボード一覧に移動
                  onDashboard?.();
                }
              }}
              className={`p-2 rounded-lg transition-colors ${
                iconStates.board
                  ? "bg-light-Blue text-white"
                  : "bg-gray-200 hover:bg-gray-300 text-gray-600"
              }`}
            >
              <DashboardIcon
                className={`w-5 h-5 ${iconStates.board ? "" : "text-gray-600"}`}
              />
            </button>
            {/* チーム一覧ボタン */}
            <div className="flex-shrink-0 p-2 border-t border-gray-200">
              <button
                onClick={() => {
                  // 通知を既読にする
                  markNotificationsAsRead();
                  // チーム一覧に移動
                  if (onTeamList) {
                    onTeamList();
                  } else {
                    window.location.href = "/team";
                  }
                }}
                className={`relative w-full p-2 rounded-lg transition-colors flex items-center justify-center gap-2 ${
                  iconStates.team
                    ? "bg-slate-500 text-white"
                    : "bg-gray-100 hover:bg-gray-200 text-gray-600"
                }`}
              >
                <TeamIcon className="w-5 h-5" />
                <span className="text-sm font-medium">チーム</span>
                <NotificationBadge
                  count={notificationCount}
                  size="sm"
                  className="-top-1 -right-1"
                />
              </button>
            </div>
            {/* 設定ボタン */}
            <div className="flex-shrink-0 p-2">
              <button
                onClick={() => onSettings?.()}
                className={`w-full p-2 rounded-lg transition-colors flex items-center justify-center gap-2 ${
                  iconStates.settings
                    ? "bg-slate-500 text-white"
                    : "bg-gray-100 hover:bg-gray-200 text-gray-600"
                }`}
              >
                <SettingsIcon
                  className={`w-4 h-4 ${iconStates.settings ? "text-white" : ""}`}
                />
              </button>
            </div>
          </div>
          <SwitchTabs
            tabs={modeTabs}
            activeTab={currentMode}
            onTabChange={(tabId) => {
              const mode = tabId as "memo" | "task" | "board";
              onModeChange?.(mode);
              // タブ切り替え時にscreenModeも更新
              if (mode === "memo") {
                onShowFullList?.();
              } else if (mode === "task") {
                onShowTaskList?.();
              } else if (mode === "board") {
                onDashboard?.();
              }
            }}
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
