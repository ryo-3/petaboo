"use client";

// import type { Metadata } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import {
  NavigationProvider,
  useNavigation,
} from "@/contexts/navigation-context";
import { getModeFromUrl, getActiveTabFromUrl } from "@/src/utils/modeUtils";

function TeamLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setScreenMode } = useNavigation();
  // URLベースでcurrentModeを取得（フォールバック用の状態も保持）
  const [fallbackMode, setFallbackMode] = useState<"memo" | "task" | "board">(
    "memo",
  );
  const urlBasedMode = getModeFromUrl(pathname, searchParams);
  const currentMode =
    urlBasedMode === "memo" ||
    urlBasedMode === "task" ||
    urlBasedMode === "board"
      ? urlBasedMode
      : fallbackMode;
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
  const isTeamListPage = pathname === "/team";

  // URLから統一的にactiveTabを取得
  const activeTab = getActiveTabFromUrl(pathname, searchParams);

  // チームボード詳細ページかどうかを判定
  const isTeamBoardDetailPage =
    pathname.includes("/team/") && pathname.includes("/board/");

  useEffect(() => {
    // チームボード詳細ページの場合はURLを記憶
    if (isTeamBoardDetailPage) {
      setLastBoardUrl(pathname);
    }

    // URLから統一的にscreenModeを設定
    const newScreenMode = getModeFromUrl(pathname, searchParams);
    setScreenMode(newScreenMode);

    // チーム詳細ページのタブ変更イベントをリッスン
    const handleTeamTabChange = (event: CustomEvent) => {
      // activeTabはURL経由で管理されるため、特に処理不要
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
  }, [isTeamBoardDetailPage, pathname, searchParams, setScreenMode]);

  const handleTeamList = () => {
    // チーム詳細ページの場合は、team-listイベントを送信
    if (isTeamDetailPage) {
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
    // フォールバックモードを更新（URLがない場合の補助）
    setFallbackMode(mode);

    // チーム詳細ページでタブを切り替える場合はメッセージを送信
    if (isTeamDetailPage) {
      window.dispatchEvent(
        new CustomEvent("team-mode-change", {
          detail: { mode, pathname },
        }),
      );
    }
  };

  const handleShowMemoList = () => {
    setFallbackMode("memo");
    if (isTeamDetailPage) {
      window.dispatchEvent(
        new CustomEvent("team-mode-change", {
          detail: { mode: "memo", pathname },
        }),
      );
    }
  };

  const handleShowTaskList = () => {
    setFallbackMode("task");
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

  const handleSettings = () => {
    // チーム詳細ページの場合は設定イベントを送信
    if (isTeamDetailPage) {
      window.dispatchEvent(
        new CustomEvent("team-mode-change", {
          detail: { mode: "settings", pathname },
        }),
      );
    } else {
      // それ以外の場合は設定ページに遷移
      router.push("/settings");
    }
  };

  const handleSearch = () => {
    if (isTeamDetailPage) {
      // チーム詳細ページの場合は検索タブに切り替え
      window.dispatchEvent(
        new CustomEvent("team-mode-change", {
          detail: { mode: "search", pathname },
        }),
      );
    } else {
      // それ以外の場合は通常の検索画面
      router.push("/search");
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
            currentMode={currentMode}
            onModeChange={handleModeChange}
            onShowTaskList={handleShowTaskList}
            onTeamList={handleTeamList}
            onBoardDetail={handleBoardDetail}
            onSettings={handleSettings}
            onSearch={handleSearch}
            showingBoardDetail={isTeamBoardDetailPage}
            currentBoardName={
              currentBoardName || (lastBoardUrl ? "最後のボード" : undefined)
            }
          />
        </div>
        <main className="flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  );
}

export default function TeamDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <NavigationProvider initialScreenMode="home">
      <Suspense fallback={<div>Loading...</div>}>
        <TeamLayoutContent>{children}</TeamLayoutContent>
      </Suspense>
    </NavigationProvider>
  );
}
