"use client";

import { Bell } from "lucide-react";
import DashboardEditIcon from "@/components/icons/dashboard-edit-icon";
import EditIcon from "@/components/icons/edit-icon";
import CheckCircleIcon from "@/components/icons/check-circle-icon";
import { useMyJoinRequests } from "@/src/hooks/use-my-join-requests";
import { useSimpleTeamNotifier } from "@/src/hooks/use-simple-team-notifier";
import { usePersonalNotifier } from "@/src/hooks/use-personal-notifier";
import {
  useNotifications,
  useMarkAllNotificationsAsRead,
  useMarkNotificationAsRead,
} from "@/src/hooks/use-notifications";
import { useQueryClient } from "@tanstack/react-query";
import { UserButton } from "@clerk/nextjs";
import { usePathname, useSearchParams } from "next/navigation";
import { usePageVisibility } from "@/src/contexts/PageVisibilityContext";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { useTeamContextSafe } from "@/src/contexts/team-context";
import { useNavigation } from "@/src/contexts/navigation-context";
import { useTeamDetailSafe } from "@/src/contexts/team-detail-context";
import NotificationPopup from "@/components/features/notifications/notification-popup";
import type { Notification } from "@/lib/api/notifications";
import { getNotificationUrl } from "@/src/utils/notificationUtils";

function Header() {
  // 現在のチーム名を取得（navigation-contextと同じロジック）
  const pathname = usePathname();
  const router = useRouter();
  const teamName =
    pathname.startsWith("/team/") && pathname !== "/team"
      ? pathname.split("/")[2]
      : undefined;

  // クエリパラメータの取得
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab");

  // 個人ページの現在モードを取得（楽観的更新対応）
  const { currentMode, iconStates, screenMode } = useNavigation();

  // チーム側のactiveTabを取得（即座に切り替えるため）
  const teamDetailContext = useTeamDetailSafe();
  const teamActiveTab = teamDetailContext?.activeTab;

  // 楽観的なチームタブ状態（イベントから即座に取得）
  const [optimisticTeamTab, setOptimisticTeamTab] = useState<string | null>(
    null,
  );

  // ボード名の状態管理
  const [boardTitle, setBoardTitle] = useState<string | null>(null);

  // 通知ポップアップの状態管理
  const [isNotificationPopupOpen, setIsNotificationPopupOpen] = useState(false);

  // ページ種別の判定（useMemoで最適化・楽観的更新対応）
  const pageStates = useMemo(() => {
    // チームボード詳細はクエリパラメータ形式に変更（/team/xxx?tab=board&slug=yyy）
    const isTeamBoardPage =
      teamName &&
      pathname === `/team/${teamName}` &&
      currentTab === "board" &&
      searchParams.get("slug") !== null;
    const isPersonalPage = pathname === "/" || !teamName;

    // 個人ページのメモ/タスク/ボード一覧は iconStates で判定（楽観的更新対応）
    const isMemoListPage = isPersonalPage && iconStates.memo;
    const isTaskListPage = isPersonalPage && iconStates.task;
    const isBoardListPage = isPersonalPage && iconStates.board;

    // チーム側は楽観的タブ状態を優先（即座に切り替え）
    const effectiveTeamTab = optimisticTeamTab || teamActiveTab;
    const isTeamMemoListPage =
      teamName &&
      pathname === `/team/${teamName}` &&
      effectiveTeamTab === "memos";
    const isTeamTaskListPage =
      teamName &&
      pathname === `/team/${teamName}` &&
      effectiveTeamTab === "tasks";
    const isTeamBoardListPage =
      teamName &&
      pathname === `/team/${teamName}` &&
      effectiveTeamTab === "boards";

    return {
      isTeamBoardPage,
      isPersonalPage,
      isTeamMemoListPage,
      isTeamTaskListPage,
      isTeamBoardListPage,
      isMemoListPage,
      isTaskListPage,
      isBoardListPage,
    };
  }, [
    pathname,
    teamName,
    teamActiveTab,
    optimisticTeamTab,
    iconStates,
    currentTab,
    searchParams,
  ]);

  const {
    isTeamBoardPage,
    isPersonalPage,
    isMemoListPage,
    isTaskListPage,
    isBoardListPage,
    isTeamMemoListPage,
    isTeamTaskListPage,
    isTeamBoardListPage,
  } = pageStates;

  // チームボード名の変更イベントをリッスン
  useEffect(() => {
    const handleBoardNameChange = (event: CustomEvent) => {
      const { boardName } = event.detail;
      setBoardTitle(boardName);
    };

    const handleClearBoardName = () => {
      setBoardTitle(null);
    };

    const handleTeamTabChange = (event: CustomEvent) => {
      const { activeTab } = event.detail;
      setOptimisticTeamTab(activeTab);
    };

    window.addEventListener(
      "team-board-name-change",
      handleBoardNameChange as EventListener,
    );

    window.addEventListener(
      "team-clear-board-name",
      handleClearBoardName as EventListener,
    );

    window.addEventListener(
      "team-tab-change",
      handleTeamTabChange as EventListener,
    );

    return () => {
      window.removeEventListener(
        "team-board-name-change",
        handleBoardNameChange as EventListener,
      );
      window.removeEventListener(
        "team-clear-board-name",
        handleClearBoardName as EventListener,
      );
      window.removeEventListener(
        "team-tab-change",
        handleTeamTabChange as EventListener,
      );
    };
  }, []);

  // ボード詳細ページから離れる時はボードタイトルをクリア
  useEffect(() => {
    if (!isTeamBoardPage) {
      setBoardTitle(null);
    }
  }, [isTeamBoardPage]);

  // Page Visibility & マウス状態を取得
  const { isVisible, isMouseActive } = usePageVisibility();

  // チーム専用通知（チームページでのみ使用）
  const teamNotifier = useSimpleTeamNotifier(teamName, isVisible);

  // 個人用通知（個人ホームページでのみ使用）
  const personalNotifier = usePersonalNotifier();

  // TeamProviderから安全にteamIdを取得（Provider外ではnull）
  const teamContext = useTeamContextSafe();
  const teamId = teamContext?.teamId || undefined;

  // コメント通知を取得（チームページでteamIdがある場合のみ）
  const { data: commentNotifications } = useNotifications(teamId);

  // 通知カウントを決定（チームページではコメント通知も含める）
  const notificationCount = isPersonalPage
    ? personalNotifier.data?.counts.approvedRequests || 0
    : (teamNotifier.data?.counts.teamRequests || 0) +
      (commentNotifications?.unreadCount || 0);

  const { data: myJoinRequests } = useMyJoinRequests();
  const queryClient = useQueryClient();

  // すべて既読にする機能
  const { mutate: markAllAsRead } = useMarkAllNotificationsAsRead(teamId);

  // 単一通知を既読にする機能
  const { mutate: markAsRead } = useMarkNotificationAsRead();

  // ベルアイコンクリック時にポップアップ開閉
  const handleBellClick = () => {
    setIsNotificationPopupOpen(!isNotificationPopupOpen);
  };

  // 通知クリック時の処理
  const handleNotificationClick = (notification: Notification) => {
    // 既読にする
    if (notification.isRead === 0) {
      markAsRead(notification.id);
    }

    // ポップアップを閉じる
    setIsNotificationPopupOpen(false);

    // 適切な画面に遷移
    const url = getNotificationUrl(notification, teamName);
    console.log("[NotificationPopup] navigate", {
      notificationId: notification.id,
      url,
    });
    if (url) {
      router.push(url);
    }
  };

  // 通知を既読にする
  const handleMarkAsRead = (notificationId: number) => {
    markAsRead(notificationId);
  };

  return (
    <header className="fixed top-0 left-0 right-0 h-12 md:h-16 border-b border-gray-200 bg-white flex items-center px-3 md:pl-[14px] md:pr-8 z-10">
      <div className="flex items-center gap-2 md:gap-5 flex-1">
        <div className="flex items-center gap-2 md:gap-4">
          {/* ロゴ */}
          <div
            className={`w-8 h-8 md:w-10 md:h-10 rounded-xl flex items-center justify-center shadow-sm ${
              isTeamBoardPage && boardTitle
                ? "bg-light-Blue"
                : isBoardListPage || isTeamBoardListPage
                  ? "bg-light-Blue"
                  : isTaskListPage || isTeamTaskListPage
                    ? "bg-DeepBlue"
                    : isMemoListPage || isTeamMemoListPage
                      ? "bg-Green"
                      : "bg-Green"
            }`}
          >
            {isTeamBoardPage && boardTitle ? (
              <DashboardEditIcon className="w-6 h-6 text-white" />
            ) : isBoardListPage || isTeamBoardListPage ? (
              <DashboardEditIcon className="w-5 h-5 md:w-6 md:h-6 text-white" />
            ) : isTaskListPage || isTeamTaskListPage ? (
              <CheckCircleIcon className="w-5 h-5 md:w-6 md:h-6 text-white" />
            ) : isMemoListPage || isTeamMemoListPage ? (
              <EditIcon className="w-5 h-5 md:w-6 md:h-6 text-white" />
            ) : (
              <span className="text-white font-bold text-sm md:text-base">
                ぺ
              </span>
            )}
          </div>

          {/* タイトルとキャッチコピー */}
          <div className="flex items-center gap-1 md:gap-3">
            <div className="flex items-center gap-1 md:gap-3">
              <h1
                className={`text-sm md:text-xl font-bold text-gray-800 tracking-wide ${
                  isMemoListPage ||
                  isTaskListPage ||
                  isBoardListPage ||
                  isTeamMemoListPage ||
                  isTeamTaskListPage ||
                  isTeamBoardListPage
                    ? "w-[95px]"
                    : ""
                }`}
              >
                {isTeamBoardPage && boardTitle
                  ? boardTitle
                  : isBoardListPage || isTeamBoardListPage
                    ? "ボード一覧"
                    : isMemoListPage || isTeamMemoListPage
                      ? "メモ一覧"
                      : isTaskListPage || isTeamTaskListPage
                        ? "タスク一覧"
                        : "ぺたぼー"}
              </h1>
              {/* メモ一覧の新規追加ボタン */}
              {(isMemoListPage || isTeamMemoListPage) && (
                <button
                  onClick={() => {
                    window.dispatchEvent(
                      new CustomEvent(
                        isTeamMemoListPage
                          ? "team-memo-create"
                          : "personal-memo-create",
                      ),
                    );
                  }}
                  className="p-1.5 md:p-2 bg-Green hover:bg-Green/90 rounded-lg transition-colors"
                >
                  <svg
                    className="w-3 h-3 md:w-3.5 md:h-3.5 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                </button>
              )}
              {/* タスク一覧の新規追加ボタン */}
              {(isTaskListPage || isTeamTaskListPage) && (
                <button
                  onClick={() => {
                    window.dispatchEvent(
                      new CustomEvent(
                        isTeamTaskListPage
                          ? "team-task-create"
                          : "personal-task-create",
                      ),
                    );
                  }}
                  className="p-1.5 md:p-2 bg-DeepBlue hover:bg-DeepBlue/90 rounded-lg transition-colors"
                >
                  <svg
                    className="w-3 h-3 md:w-3.5 md:h-3.5 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                </button>
              )}
              {/* ボード一覧の新規追加ボタン */}
              {(isBoardListPage || isTeamBoardListPage) && (
                <button
                  onClick={() => {
                    window.dispatchEvent(
                      new CustomEvent(
                        isTeamBoardListPage
                          ? "team-board-create"
                          : "personal-board-create",
                      ),
                    );
                  }}
                  className="p-1.5 md:p-2 bg-light-Blue hover:bg-light-Blue/90 rounded-lg transition-colors"
                >
                  <svg
                    className="w-3 h-3 md:w-3.5 md:h-3.5 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                </button>
              )}
            </div>
            {!isTeamBoardPage &&
              !isMemoListPage &&
              !isTaskListPage &&
              !isBoardListPage &&
              !isTeamMemoListPage &&
              !isTeamTaskListPage &&
              !isTeamBoardListPage && (
                <span className="hidden md:inline text-sm text-gray-600 mt-0.5">
                  - 日々のメモやタスクをひとまとめに -
                </span>
              )}
          </div>
        </div>
      </div>

      {/* 通知アイコン & ユーザーメニュー */}
      <div className="flex items-center gap-2">
        {/* 通知アイコン - チームページでのみ表示 */}
        {!isPersonalPage && (
          <div className="relative">
            <button
              className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
              onClick={handleBellClick}
            >
              <Bell className="w-5 h-5 text-gray-600" />
              {notificationCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
                  {notificationCount > 99 ? "99+" : notificationCount}
                </span>
              )}
            </button>

            {/* 通知ポップアップ */}
            <NotificationPopup
              notifications={commentNotifications?.notifications || []}
              isOpen={isNotificationPopupOpen}
              onClose={() => setIsNotificationPopupOpen(false)}
              onNotificationClick={handleNotificationClick}
              onMarkAsRead={handleMarkAsRead}
            />
          </div>
        )}

        {/* Clerkユーザーボタン */}
        <UserButton
          appearance={{
            elements: {
              avatarBox: "w-8 h-8",
            },
          }}
        />
      </div>
    </header>
  );
}

export default Header;
