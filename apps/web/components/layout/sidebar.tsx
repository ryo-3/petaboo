"use client";

import React, { useState, useEffect } from "react";
import { useNavigation } from "@/contexts/navigation-context";
import { useTeamDetail } from "@/src/contexts/team-detail-context";
import { useClerk } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
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
import ItemEditorFooter from "@/components/mobile/item-editor-footer";
import { LogOut } from "lucide-react";
import type { Memo } from "@/src/types/memo";
import type { Task } from "@/src/types/task";

interface SidebarProps {
  onSelectMemo: (memo: Memo) => void;
  onSelectTask?: (task: Task) => void;
  onEditTask?: (task: Task) => void;
  onShowFullList: () => void;
  onShowTaskList?: () => void;
  onHome: () => void;
  onEditMemo: (memo?: Memo) => void;
  onDeleteMemo?: (memo: Memo) => void;
  selectedMemoId?: number;
  selectedTaskId?: number;
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
  imageCount?: number;
  commentCount?: number;
  isCreatingMemo?: boolean;
  isCreatingTask?: boolean;
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
  imageCount = 0,
  commentCount = 0,
  isCreatingMemo: isCreatingMemoProp,
  isCreatingTask: isCreatingTaskProp,
}: SidebarProps) {
  // NavigationContextから統一されたiconStatesと楽観的更新を取得
  const { iconStates, setOptimisticMode } = useNavigation();
  // pathnameを取得してチームモード判定
  const pathname = usePathname();
  const isTeamMode = pathname?.startsWith("/team/") ?? false;
  // 新規作成状態を取得（propsまたはTeamDetailContext）
  let isCreatingMemo = isCreatingMemoProp ?? false;
  let isCreatingTask = isCreatingTaskProp ?? false;

  // チームモードの場合はTeamDetailContextからも取得
  if (isTeamMode) {
    try {
      const teamDetail = useTeamDetail();
      isCreatingMemo = teamDetail.isCreatingMemo;
      isCreatingTask = teamDetail.isCreatingTask ?? false;
    } catch {
      // チームモード外では無視
    }
  }
  // Clerkのログアウト機能
  const { signOut } = useClerk();
  // 通知数を取得（一時的に0に設定）
  const notificationCount = 0;
  const markNotificationsAsRead = () => {}; // 空の関数

  // モバイルメニュー開閉状態
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  // ログアウト確認モーダル
  const [showLogoutModal, setShowLogoutModal] = React.useState(false);
  // タスクエディターのアクティブタブ
  const [taskEditorTab, setTaskEditorTab] = React.useState<
    "task" | "comment" | "image"
  >("task");

  // モバイル版メモエディターのアクティブタブ管理
  const [memoEditorTab, setMemoEditorTab] = useState<
    "memo" | "comment" | "image"
  >("memo");

  // CustomEventでメモエディターのタブ切り替えを監視
  useEffect(() => {
    const handleTabChange = (e: Event) => {
      const customEvent = e as CustomEvent<{
        tab: "memo" | "comment" | "image";
      }>;
      setMemoEditorTab(customEvent.detail.tab);
    };

    window.addEventListener("memo-editor-tab-change", handleTabChange);
    return () => {
      window.removeEventListener("memo-editor-tab-change", handleTabChange);
    };
  }, []);

  // CustomEventでタスクエディターのタブ切り替えを監視（個人・チーム両対応）
  useEffect(() => {
    const handleTabChange = (e: Event) => {
      const customEvent = e as CustomEvent<{
        tab: "task" | "comment" | "image";
      }>;
      setTaskEditorTab(customEvent.detail.tab);
    };

    const eventName = isTeamMode
      ? "team-task-editor-tab-change"
      : "task-editor-tab-change";
    window.addEventListener(eventName, handleTabChange);
    return () => {
      window.removeEventListener(eventName, handleTabChange);
    };
  }, [isTeamMode]);

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

  // モバイルでメモエディターが開いている場合は専用フッターを表示
  // 新規作成時（selectedMemoId === null かつ isCreatingMemo === true）も含む
  const isShowingMemoEditor = selectedMemoId !== undefined || isCreatingMemo;

  // モバイルでタスクエディターが開いている場合は専用フッターを表示
  // 新規作成時も含む
  const isShowingTaskEditor = selectedTaskId !== undefined || isCreatingTask;

  // モバイルフッター（PCでは非表示、モバイルでメモ/タスク選択時のみ表示）
  const mobileFooter = isShowingTaskEditor ? (
    <div className="md:hidden w-full h-full">
      <ItemEditorFooter
        type="task"
        onBack={() => {
          const backEventName = isTeamMode
            ? "team-task-editor-mobile-back-requested"
            : "task-editor-mobile-back-requested";
          window.dispatchEvent(new CustomEvent(backEventName));
        }}
        onMainClick={() => {
          const eventName = isTeamMode
            ? "team-task-editor-tab-change"
            : "task-editor-tab-change";
          window.dispatchEvent(
            new CustomEvent(eventName, {
              detail: { tab: "task" },
            }),
          );
        }}
        onImageClick={() => {
          const eventName = isTeamMode
            ? "team-task-editor-tab-change"
            : "task-editor-tab-change";
          window.dispatchEvent(
            new CustomEvent(eventName, {
              detail: { tab: "image" },
            }),
          );
        }}
        onCommentClick={() => {
          const eventName = isTeamMode
            ? "team-task-editor-tab-change"
            : "task-editor-tab-change";
          window.dispatchEvent(
            new CustomEvent(eventName, {
              detail: { tab: "comment" },
            }),
          );
        }}
        activeTab={taskEditorTab}
        imageCount={imageCount}
        commentCount={commentCount}
        hideComment={!isTeamMode}
      />
    </div>
  ) : isShowingMemoEditor ? (
    <div className="md:hidden w-full h-full">
      <ItemEditorFooter
        type="memo"
        onBack={() => {
          console.log(
            "🔙 Sidebar: memo-editor-mobile-back-requested イベント発火",
          );
          window.dispatchEvent(
            new CustomEvent("memo-editor-mobile-back-requested"),
          );
        }}
        onMainClick={() =>
          window.dispatchEvent(
            new CustomEvent("memo-editor-tab-change", {
              detail: { tab: "memo" },
            }),
          )
        }
        onCommentClick={() =>
          window.dispatchEvent(
            new CustomEvent("memo-editor-tab-change", {
              detail: { tab: "comment" },
            }),
          )
        }
        onImageClick={() =>
          window.dispatchEvent(
            new CustomEvent("memo-editor-tab-change", {
              detail: { tab: "image" },
            }),
          )
        }
        activeTab={memoEditorTab}
        imageCount={imageCount}
        commentCount={commentCount}
        hideComment={!isTeamMode}
      />
    </div>
  ) : null;

  // 統一サイドバー（レスポンシブ対応）
  return (
    <>
      {/* モバイルフッター（モバイル・メモ選択時のみ表示） */}
      {mobileFooter}

      {/* デスクトップサイドバー（PCでは常に表示、モバイルでメモ選択時は非表示） */}
      <div
        className={`flex md:flex-col flex-row items-center md:py-4 py-0 md:h-screen h-14 bg-gray-50 md:justify-between justify-center w-full ${isShowingMemoEditor ? "hidden md:flex" : "flex"}`}
      >
        <div className="flex md:flex-col flex-row items-center md:gap-y-3 gap-x-2 md:w-auto justify-center md:justify-start">
          {/* ボード詳細時はホームの代わりに戻るボタンを表示（モバイルのみ） */}
          {onBackToBoardList && showingBoardDetail ? (
            <>
              {/* モバイル：戻るボタン */}
              <div className="md:hidden">
                <Tooltip text="ボード一覧に戻る" position="right">
                  <button
                    onClick={() => {
                      setOptimisticMode(null); // optimisticModeをクリア
                      onBackToBoardList?.();
                    }}
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
                    onClick={() => {
                      setOptimisticMode(null); // optimisticModeをクリア
                      onHome();
                    }}
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
                onClick={() => {
                  setOptimisticMode(null); // optimisticModeをクリア
                  onHome();
                }}
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
                setOptimisticMode("memo"); // 即座にアイコン切り替え
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
                setOptimisticMode("task"); // 即座にアイコン切り替え
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
                setOptimisticMode("board"); // 即座にアイコン切り替え
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

          {/* ボード詳細 (選択中のボードがある場合のみ表示) */}
          {currentBoardName && (
            <Tooltip text={`${currentBoardName}詳細`} position="right">
              <button
                onClick={() => {
                  setOptimisticMode(null); // optimisticModeをクリア
                  onBoardDetail?.();
                }}
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
          )}

          {/* 検索ボタン（コンパクトモード） */}
          <Tooltip text="詳細検索" position="right">
            <button
              onClick={() => {
                setOptimisticMode(null); // optimisticModeをクリア
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
          {/* デスクトップ: チーム一覧と設定を個別表示 */}
          <div className="hidden md:contents">
            {/* チーム一覧ボタン（コンパクトモード） */}
            <Tooltip text={currentTeamName || "チーム"} position="right">
              <button
                onClick={() => {
                  setOptimisticMode(null); // optimisticModeをクリア
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
                  setOptimisticMode(null); // optimisticModeをクリア
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

          {/* モバイル: メニューボタン（...） */}
          <div className="md:hidden relative">
            <Tooltip text="メニュー" position="right">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className={`p-2 rounded-lg transition-colors ${
                  iconStates.team || iconStates.settings
                    ? "bg-slate-500 text-white"
                    : "bg-gray-200 hover:bg-gray-300 text-gray-600"
                }`}
              >
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <circle cx="5" cy="12" r="2" />
                  <circle cx="12" cy="12" r="2" />
                  <circle cx="19" cy="12" r="2" />
                </svg>
              </button>
            </Tooltip>

            {/* ドロップダウンメニュー */}
            {isMobileMenuOpen && (
              <>
                {/* 背景オーバーレイ */}
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsMobileMenuOpen(false)}
                />
                {/* メニュー */}
                <div className="absolute bottom-full right-0 mb-4 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                  <button
                    onClick={() => {
                      markNotificationsAsRead();
                      if (onTeamList) {
                        onTeamList();
                      } else {
                        window.location.href = "/team";
                      }
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2 text-gray-700"
                  >
                    <TeamIcon className="w-5 h-5" />
                    <span>{currentTeamName || "チーム一覧"}</span>
                    {notificationCount > 0 && (
                      <NotificationBadge count={notificationCount} size="sm" />
                    )}
                  </button>
                  <button
                    onClick={() => {
                      onSettings?.();
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2 text-gray-700"
                  >
                    <SettingsIcon className="w-5 h-5" />
                    <span>設定</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowLogoutModal(true);
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2 text-gray-700"
                  >
                    <LogOut className="w-5 h-5" />
                    <span>ログアウト</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ログアウト確認モーダル */}
        {showLogoutModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-80 max-w-[90vw]">
              <h3 className="text-lg font-medium mb-4">ログアウト確認</h3>
              <p className="text-gray-600 mb-6">ログアウトしますか？</p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowLogoutModal(false)}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors"
                >
                  キャンセル
                </button>
                <button
                  onClick={() => {
                    signOut();
                    setShowLogoutModal(false);
                  }}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                >
                  ログアウト
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default Sidebar;
