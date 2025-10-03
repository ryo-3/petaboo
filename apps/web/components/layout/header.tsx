"use client";

import { Bell } from "lucide-react";
import DashboardEditIcon from "@/components/icons/dashboard-edit-icon";
import EditIcon from "@/components/icons/edit-icon";
import CheckCircleIcon from "@/components/icons/check-circle-icon";
import { useMyJoinRequests } from "@/src/hooks/use-my-join-requests";
import { useSimpleTeamNotifier } from "@/src/hooks/use-simple-team-notifier";
import { usePersonalNotifier } from "@/src/hooks/use-personal-notifier";
import { useQueryClient } from "@tanstack/react-query";
import { UserButton } from "@clerk/nextjs";
import { usePathname, useSearchParams } from "next/navigation";
import { usePageVisibility } from "@/src/contexts/PageVisibilityContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

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

  // ページ種別の判定
  const isTeamBoardPage = pathname.includes("/board/");
  const isTeamMemoListPage =
    teamName && pathname === `/team/${teamName}` && currentTab === "memos";
  const isTeamTaskListPage =
    teamName && pathname === `/team/${teamName}` && currentTab === "tasks";

  // ボード名の状態管理
  const [boardTitle, setBoardTitle] = useState<string | null>(null);

  // チームボード名の変更イベントをリッスン
  useEffect(() => {
    const handleBoardNameChange = (event: CustomEvent) => {
      const { boardName } = event.detail;
      setBoardTitle(boardName);
    };

    window.addEventListener(
      "team-board-name-change",
      handleBoardNameChange as EventListener,
    );

    return () => {
      window.removeEventListener(
        "team-board-name-change",
        handleBoardNameChange as EventListener,
      );
    };
  }, []);

  // ボード詳細ページから離れる時はボードタイトルをクリア
  useEffect(() => {
    if (!isTeamBoardPage) {
      setBoardTitle(null);
    }
  }, [isTeamBoardPage]);

  const isPersonalPage = pathname === "/" || !teamName;

  // Page Visibility & マウス状態を取得
  const { isVisible, isMouseActive } = usePageVisibility();

  // デバッグ: 状態値を確認
  // console.log(
  //   `🔍 [Header] isVisible: ${isVisible}, isMouseActive: ${isMouseActive}, teamName: ${teamName}`,
  // );

  // チーム専用通知（チームページでのみ使用）
  const teamNotifier = useSimpleTeamNotifier(teamName, isVisible);

  // 個人用通知（個人ホームページでのみ使用）
  const personalNotifier = usePersonalNotifier();

  // 通知カウントを決定
  const notificationCount = isPersonalPage
    ? personalNotifier.data?.counts.approvedRequests || 0
    : teamNotifier.data?.counts.teamRequests || 0;

  const { data: myJoinRequests } = useMyJoinRequests();
  const queryClient = useQueryClient();

  // 通知クリック時にホームタブに切り替え（既読機能無効化）
  const handleNotificationClick = () => {
    if (teamName && pathname.startsWith("/team/")) {
      // チームページでホームタブに切り替え
      const baseTeamUrl = `/team/${teamName}`;
      router.replace(baseTeamUrl);
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 h-16 border-b border-gray-200 bg-white flex items-center pl-[14px] pr-8 z-10">
      <div className="flex items-center gap-5 flex-1">
        <div className="flex items-center gap-4">
          {/* ロゴ */}
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ${
              isTeamBoardPage && boardTitle
                ? "bg-light-Blue"
                : isTeamTaskListPage
                  ? "bg-DeepBlue"
                  : isTeamMemoListPage
                    ? "bg-Green"
                    : "bg-Green"
            }`}
          >
            {isTeamBoardPage && boardTitle ? (
              <DashboardEditIcon className="w-6 h-6 text-white" />
            ) : isTeamTaskListPage ? (
              <CheckCircleIcon className="w-6 h-6 text-white" />
            ) : isTeamMemoListPage ? (
              <EditIcon className="w-6 h-6 text-white" />
            ) : (
              <span className="text-white font-bold text-base">ぺ</span>
            )}
          </div>

          {/* タイトルとキャッチコピー */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-gray-800 tracking-wide">
                {isTeamBoardPage && boardTitle
                  ? boardTitle
                  : isTeamMemoListPage
                    ? "メモ一覧"
                    : isTeamTaskListPage
                      ? "タスク一覧"
                      : "ぺたぼー"}
              </h1>
              {/* チームメモ一覧の新規追加ボタン */}
              {isTeamMemoListPage && (
                <button
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent("team-memo-create"));
                  }}
                  className="p-2 bg-Green hover:bg-Green/90 rounded-lg transition-colors"
                >
                  <svg
                    className="w-3.5 h-3.5 text-white"
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
            {!isTeamBoardPage && !isTeamMemoListPage && !isTeamTaskListPage && (
              <span className="text-sm text-gray-600 mt-0.5">
                - 日々のメモやタスクをひとまとめに
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 通知アイコン & ユーザーメニュー */}
      <div className="flex items-center gap-2">
        {/* 通知アイコン - チームページでのみ表示 */}
        {!isPersonalPage && (
          <button
            className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
            onClick={handleNotificationClick}
          >
            <Bell className="w-5 h-5 text-gray-600" />
            {notificationCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
                {notificationCount > 99 ? "99+" : notificationCount}
              </span>
            )}
          </button>
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
