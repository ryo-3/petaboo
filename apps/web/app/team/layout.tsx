"use client";

import type { Metadata } from "next";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";

export default function TeamLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [currentMode, setCurrentMode] = useState<"memo" | "task" | "board">(
    "memo",
  );
  const [mounted, setMounted] = useState(false);

  // /team 関連のページかどうかを判定（/team/create は除く）
  const isTeamPage =
    pathname.startsWith("/team") && !pathname.includes("/create");

  // チーム一覧ページかどうかを判定
  const isTeamListPage = pathname === "/team";

  // チーム詳細ページかどうかを判定（/team/customUrl の形式）
  const isTeamDetailPage =
    pathname.startsWith("/team/") && pathname !== "/team";

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleTeamList = () => {
    router.push("/team");
  };

  // ホーム遷移ロジック：チーム詳細ページの場合はそのチームのページに戻る
  const handleHome = () => {
    if (pathname.startsWith("/team/") && pathname !== "/team") {
      // チーム詳細ページの場合は、現在のチームページに戻る
      const segments = pathname.split("/");
      if (segments.length >= 3) {
        const customUrl = segments[2];
        router.push(`/team/${customUrl}`);
      } else {
        router.push("/");
      }
    } else {
      // それ以外は通常のホームページ
      router.push("/");
    }
  };

  // チーム詳細ページでのサイドバーハンドラー
  const handleModeChange = (mode: "memo" | "task" | "board") => {
    setCurrentMode(mode);
    // チーム詳細ページでタブを切り替える場合はメッセージを送信
    if (isTeamDetailPage) {
      console.log(`Team mode changed to: ${mode}`);
      // カスタムイベントを発行してチーム詳細コンポーネントに通知
      window.dispatchEvent(
        new CustomEvent("team-mode-change", {
          detail: { mode, pathname },
        }),
      );
    }
  };

  const handleShowMemoList = () => {
    setCurrentMode("memo");
    if (isTeamDetailPage) {
      console.log("Team memo list requested");
      window.dispatchEvent(
        new CustomEvent("team-mode-change", {
          detail: { mode: "memo", pathname },
        }),
      );
    }
  };

  const handleShowTaskList = () => {
    setCurrentMode("task");
    if (isTeamDetailPage) {
      console.log("Team task list requested");
      window.dispatchEvent(
        new CustomEvent("team-mode-change", {
          detail: { mode: "task", pathname },
        }),
      );
    }
  };

  const handleNewMemo = () => {
    console.log("New team memo requested");
    // 新しいメモ作成のロジックをここに実装
  };

  const handleNewTask = () => {
    console.log("New team task requested");
    // 新しいタスク作成のロジックをここに実装
  };
  return (
    <div className="flex h-screen bg-white overflow-hidden">
      <Header />
      <div className="flex flex-1 pt-16 overflow-hidden">
        <div className="w-16 border-r border-gray-200 overflow-visible">
          <Sidebar
            onNewMemo={handleNewMemo}
            onSelectMemo={() => {}}
            onShowFullList={handleShowMemoList}
            onHome={handleHome}
            onEditMemo={() => {}}
            isCompact={true}
            currentMode={currentMode}
            onModeChange={handleModeChange}
            onNewTask={handleNewTask}
            onShowTaskList={handleShowTaskList}
            isTeamDetailPage={mounted ? isTeamDetailPage : false}
            isTeamListPage={mounted ? isTeamListPage : false}
            isTeamHomePage={mounted ? isTeamDetailPage : false}
            onTeamList={handleTeamList}
            screenMode={mounted && isTeamDetailPage ? "team-detail" : undefined}
          />
        </div>
        <main className="flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  );
}
