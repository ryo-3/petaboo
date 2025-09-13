"use client";

import { Bell } from "lucide-react";
import { useMyJoinRequests } from "@/src/hooks/use-my-join-requests";
import { useSimpleTeamNotifier } from "@/src/hooks/use-simple-team-notifier";
import { usePersonalNotifier } from "@/src/hooks/use-personal-notifier";
import { useQueryClient } from "@tanstack/react-query";
import { UserButton } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import { usePageVisibility } from "@/src/contexts/PageVisibilityContext";
import { useRouter } from "next/navigation";

function Header() {
  // 現在のチーム名を取得（navigation-contextと同じロジック）
  const pathname = usePathname();
  const router = useRouter();
  const teamName =
    pathname.startsWith("/team/") && pathname !== "/team"
      ? pathname.split("/")[2]
      : undefined;

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

  // 通知クリック時に既読状態にしてホームタブに切り替え
  const handleNotificationClick = () => {
    if (isPersonalPage) {
      // 個人通知を既読にする
      if (personalNotifier.data?.hasUpdates) {
        personalNotifier.markAsRead();
      }
    } else if (teamName) {
      // チーム通知を既読にする（通知がない場合でも実行）
      if (teamNotifier.data?.hasUpdates) {
        const readKey = `teamNotificationRead_${teamName}`;
        localStorage.setItem(readKey, new Date().toISOString());

        // 通知チェックを再実行して即座に反映
        if (teamNotifier.checkNow) {
          teamNotifier.checkNow();
        }
      }

      // チームページでホームタブに切り替え（通知の有無に関係なく実行）
      if (pathname.startsWith("/team/")) {
        const baseTeamUrl = `/team/${teamName}`;
        router.replace(baseTeamUrl);
      }
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 h-16 border-b border-gray-200 bg-white flex items-center pl-[14px] pr-8 z-10">
      <div className="flex items-center gap-5 flex-1">
        <div className="flex items-center gap-4">
          {/* ロゴ */}
          <div className="w-10 h-10 bg-Green rounded-xl flex items-center justify-center shadow-sm">
            <span className="text-white font-bold text-base">ぺ</span>
          </div>

          {/* タイトルとキャッチコピー */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-800 tracking-wide">
                ぺたぼー
              </h1>
              <span className="text-lg font-medium text-gray-600">PETABoo</span>
            </div>
            <span className="text-sm text-gray-600 mt-0.5">
              - 日々のメモやタスクをひとまとめに
            </span>
          </div>
        </div>
      </div>

      {/* 通知アイコン & ユーザーメニュー */}
      <div className="flex items-center gap-2">
        {/* 通知アイコン */}
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
