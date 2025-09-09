"use client";

// import type { Metadata } from "next";
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
  const [activeTab, setActiveTab] = useState<
    "overview" | "memos" | "tasks" | "boards" | "team-list"
  >("overview");
  const [currentBoardName, setCurrentBoardName] = useState<string | undefined>(
    undefined,
  );
  const [lastBoardUrl, setLastBoardUrl] = useState<string | undefined>(
    undefined,
  );

  // /team 関連のページかどうかを判定（/team/create は除く）
  // const isTeamPage =
  //   pathname.startsWith("/team") && !pathname.includes("/create");

  // チーム詳細ページかどうかを判定（/team/customUrl の形式）
  const isTeamDetailPage =
    pathname.startsWith("/team/") && pathname !== "/team";

  // チーム一覧ページかどうかを判定
  // チーム詳細ページでteam-listタブを表示している場合もtrueにする
  const isTeamListPage =
    pathname === "/team" || (isTeamDetailPage && activeTab === "team-list");

  // チームボード詳細ページかどうかを判定
  const isTeamBoardDetailPage =
    pathname.includes("/team/") && pathname.includes("/board/");

  useEffect(() => {
    setMounted(true);

    // チームボード詳細ページの場合はボードモードに設定し、URLを記憶
    if (isTeamBoardDetailPage) {
      setCurrentMode("board");
      setLastBoardUrl(pathname);
    }

    // チーム詳細ページのタブ変更イベントをリッスン
    const handleTeamTabChange = (event: CustomEvent) => {
      const { activeTab } = event.detail;
      setActiveTab(activeTab);
    };

    // チームボード名変更イベントをリッスン
    const handleTeamBoardNameChange = (event: CustomEvent) => {
      const { boardName } = event.detail;
      setCurrentBoardName(boardName);
    };

    window.addEventListener(
      "team-tab-change",
      handleTeamTabChange as EventListener,
    );

    window.addEventListener(
      "team-board-name-change",
      handleTeamBoardNameChange as EventListener,
    );

    return () => {
      window.removeEventListener(
        "team-tab-change",
        handleTeamTabChange as EventListener,
      );
      window.removeEventListener(
        "team-board-name-change",
        handleTeamBoardNameChange as EventListener,
      );
    };
  }, [isTeamBoardDetailPage, pathname]);

  const handleTeamList = () => {
    // チーム詳細ページの場合は、team-listタブとして表示
    if (isTeamDetailPage) {
      setActiveTab("team-list");
      window.dispatchEvent(
        new CustomEvent("team-mode-change", {
          detail: { mode: "team-list", pathname },
        }),
      );
    } else {
      // それ以外の場合は通常通りチーム一覧ページへ遷移
      router.push("/team");
    }
  };

  // ホーム遷移ロジック：チーム詳細ページの場合はoverviewタブに移動
  const handleHome = () => {
    if (pathname.startsWith("/team/") && pathname !== "/team") {
      // チーム詳細ページまたはチームボード詳細ページの場合は、overviewタブに移動
      window.dispatchEvent(
        new CustomEvent("team-mode-change", {
          detail: { mode: "overview", pathname },
        }),
      );
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
      window.dispatchEvent(
        new CustomEvent("team-mode-change", {
          detail: { mode: "task", pathname },
        }),
      );
    }
  };

  const handleNewMemo = () => {
    if (isTeamDetailPage) {
      // チーム詳細ページでメモ作成イベントを送信
      window.dispatchEvent(
        new CustomEvent("team-new-memo", {
          detail: { pathname },
        }),
      );
    }
  };

  const handleNewTask = () => {
    // 新しいタスク作成のロジックをここに実装
  };

  const handleBoardDetail = () => {
    // すでにボード詳細ページにいる場合は何もしない
    if (isTeamBoardDetailPage) {
      return;
    }

    // 最後に見ていたボード詳細ページがある場合はそこに戻る
    if (lastBoardUrl) {
      router.push(lastBoardUrl);
    } else {
      // ない場合はボード一覧ページに移動
      if (isTeamDetailPage) {
        window.dispatchEvent(
          new CustomEvent("team-mode-change", {
            detail: { mode: "board", pathname },
          }),
        );
      }
    }
  };
  return (
    <div className="flex h-screen bg-white overflow-hidden">
      <Header />
      <div className="flex flex-1 pt-16 overflow-hidden">
        <div className="w-16 border-r border-gray-200 overflow-visible">
          <Sidebar
            onSelectMemo={() => {}}
            onShowFullList={handleShowMemoList}
            onHome={handleHome}
            onEditMemo={() => {}}
            isCompact={true}
            currentMode={mounted ? currentMode : "memo"}
            onModeChange={handleModeChange}
            onShowTaskList={handleShowTaskList}
            isTeamDetailPage={mounted ? isTeamDetailPage : false}
            isTeamListPage={mounted ? isTeamListPage : pathname === "/team"}
            onTeamList={handleTeamList}
            onBoardDetail={handleBoardDetail}
            screenMode={
              !mounted
                ? "loading"
                : isTeamBoardDetailPage
                  ? "board"
                  : isTeamDetailPage
                    ? activeTab === "overview"
                      ? "home"
                      : undefined
                    : undefined
            }
            showingBoardDetail={mounted ? isTeamBoardDetailPage : false}
            currentBoardName={
              currentBoardName || (lastBoardUrl ? "最後のボード" : undefined)
            }
            isBoardActive={mounted ? currentMode === "board" : false}
          />
        </div>
        <main className="flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  );
}
