"use client";

// import type { Metadata } from "next";
import {
  usePathname,
  useRouter,
  useSearchParams,
  useParams,
} from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import ItemEditorFooter from "@/components/mobile/item-editor-footer";
import {
  NavigationProvider,
  useNavigation,
} from "@/src/contexts/navigation-context";
import { TeamProvider } from "@/src/contexts/team-context";
import {
  TeamDetailProvider,
  useTeamDetail as useTeamDetailContext,
} from "@/src/contexts/team-detail-context";
import { getModeFromUrl, getActiveTabFromUrl } from "@/src/utils/modeUtils";
import { useTeamDetail } from "@/src/hooks/use-team-detail";

function TeamLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  const { setScreenMode, setOptimisticMode } = useNavigation();
  const {
    selectedMemoId,
    setSelectedMemoId,
    selectedTaskId,
    isCreatingMemo,
    isCreatingTask,
    imageCount,
    commentCount,
    taskImageCount,
    taskCommentCount,
  } = useTeamDetailContext();

  // ボード詳細ページのセクション表示状態
  const [activeBoardSection, setActiveBoardSection] = useState<
    "memos" | "tasks" | "comments"
  >("memos");

  // メモ/タスクエディターのアクティブタブ状態（ボード詳細用）
  const [memoEditorActiveTab, setMemoEditorActiveTab] = useState<
    "memo" | "image" | "comment"
  >("memo");
  const [taskEditorActiveTab, setTaskEditorActiveTab] = useState<
    "task" | "image" | "comment"
  >("task");

  // URLからcustomUrlを取得
  const customUrl = Array.isArray(params.customUrl)
    ? params.customUrl[0]
    : params.customUrl || "";

  // チーム詳細を取得（customUrlが空文字列の場合はuseTeamDetailが自動的に無効化される）
  const { data: teamDetail } = useTeamDetail(customUrl || "dummy");
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
  const [lastBoardSlug, setLastBoardSlug] = useState<string | undefined>(
    undefined,
  );
  const [lastBoardName, setLastBoardName] = useState<string | undefined>(
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

  // チームボード詳細ページかどうかを判定（クエリパラメータベース）
  const isTeamBoardDetailPage =
    pathname.startsWith("/team/") &&
    searchParams.get("tab") === "board" &&
    searchParams.get("slug") !== null;

  // メモIDが変わったらタブをリセット
  useEffect(() => {
    setMemoEditorActiveTab("memo");
  }, [selectedMemoId]);

  // タスクIDが変わったらタブをリセット
  useEffect(() => {
    setTaskEditorActiveTab("task");
  }, [selectedTaskId]);

  // メモエディターのタブ切り替えイベントを監視
  useEffect(() => {
    const handleTabChange = (e: Event) => {
      const customEvent = e as CustomEvent<{
        tab: "memo" | "comment" | "image";
      }>;
      setMemoEditorActiveTab(customEvent.detail.tab);
    };
    window.addEventListener("memo-editor-tab-change", handleTabChange);
    return () =>
      window.removeEventListener("memo-editor-tab-change", handleTabChange);
  }, []);

  // タスクエディターのタブ切り替えイベントを監視
  useEffect(() => {
    const handleTabChange = (e: Event) => {
      const customEvent = e as CustomEvent<{
        tab: "task" | "comment" | "image";
      }>;
      setTaskEditorActiveTab(customEvent.detail.tab);
    };
    window.addEventListener("team-task-editor-tab-change", handleTabChange);
    return () =>
      window.removeEventListener(
        "team-task-editor-tab-change",
        handleTabChange,
      );
  }, []);

  // URL変更時の処理
  useEffect(() => {
    // URL変更時の必要な処理をここに追加可能
  }, [searchParams]);

  useEffect(() => {
    // ボード詳細タブの場合はslugを記憶
    const tab = searchParams.get("tab");
    const slug = searchParams.get("slug");

    if (tab === "board" && slug) {
      setLastBoardSlug(slug);
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
      setLastBoardName(boardName); // 最後のボード名として記憶
    };

    // チームボード名クリアイベントをリッスン（楽観的更新用）
    const handleTeamClearBoardName = () => {
      setCurrentBoardName(undefined);
    };

    // ボードセクション状態変更イベントをリッスン
    const handleBoardSectionStateChange = (event: CustomEvent) => {
      const { activeSection } = event.detail;
      setActiveBoardSection(activeSection);
    };

    // メモエディタータブ切り替えイベントをリッスン
    const handleMemoEditorTabChange = (event: CustomEvent) => {
      const { tab } = event.detail;
      if (tab === "memo" || tab === "image" || tab === "comment") {
        setMemoEditorActiveTab(tab);
      }
    };

    // タスクエディタータブ切り替えイベントをリッスン
    const handleTaskEditorTabChange = (event: CustomEvent) => {
      const { tab } = event.detail;
      if (tab === "task" || tab === "image" || tab === "comment") {
        setTaskEditorActiveTab(tab);
      }
    };

    window.addEventListener(
      "team-tab-change",
      handleTeamTabChange as EventListener,
    );

    window.addEventListener(
      "team-board-name-change",
      handleTeamBoardNameChange as EventListener,
    );

    window.addEventListener(
      "team-clear-board-name",
      handleTeamClearBoardName as EventListener,
    );

    window.addEventListener(
      "board-section-state-change",
      handleBoardSectionStateChange as EventListener,
    );

    window.addEventListener(
      "memo-editor-tab-change",
      handleMemoEditorTabChange as EventListener,
    );

    window.addEventListener(
      "team-task-editor-tab-change",
      handleTaskEditorTabChange as EventListener,
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
      window.removeEventListener(
        "team-clear-board-name",
        handleTeamClearBoardName as EventListener,
      );
      window.removeEventListener(
        "board-section-state-change",
        handleBoardSectionStateChange as EventListener,
      );
      window.removeEventListener(
        "memo-editor-tab-change",
        handleMemoEditorTabChange as EventListener,
      );
      window.removeEventListener(
        "team-task-editor-tab-change",
        handleTaskEditorTabChange as EventListener,
      );
    };
  }, [isTeamBoardDetailPage, pathname, searchParams, setScreenMode]);

  const handleTeamList = () => {
    // チーム詳細ページの場合は、team-listイベントを送信
    if (isTeamDetailPage) {
      if (isTeamBoardDetailPage) {
        // チームボード詳細ページの場合は専用イベントを発信
        window.dispatchEvent(new CustomEvent("team-list-change"));
      } else {
        // チーム詳細ページの場合
        window.dispatchEvent(
          new CustomEvent("team-mode-change", {
            detail: { mode: "team-list", pathname },
          }),
        );
      }
    } else {
      // それ以外の場合は通常通りチーム一覧ページへ遷移
      router.push("/team");
    }
  };

  // ホーム遷移ロジック：チーム詳細ページの場合はoverviewタブに移動
  const handleHome = () => {
    if (pathname.startsWith("/team/") && pathname !== "/team") {
      if (isTeamBoardDetailPage) {
        // チームボード詳細ページの場合は、チーム詳細ページ（概要）に戻る
        router.push(`/team/${pathname.split("/")[2]}`);
      } else {
        // チーム詳細ページの場合は、overviewタブに移動
        window.dispatchEvent(
          new CustomEvent("team-mode-change", {
            detail: { mode: "overview", pathname },
          }),
        );
      }
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
        new CustomEvent("team-back-to-memo-list", {
          detail: { pathname },
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
        new CustomEvent("team-memo-create", {
          detail: { pathname },
        }),
      );
    }
  };

  const handleNewTask = () => {
    // 新しいタスク作成のロジックをここに実装
  };

  const handleBoardDetail = () => {
    // 🚀 楽観的更新をクリア（ボード詳細は特殊なタブなのでnull）
    setOptimisticMode(null);

    if (lastBoardSlug) {
      const newUrl = `/team/${customUrl}?tab=board&slug=${lastBoardSlug}`;
      // シンプルに直接URLを指定
      router.replace(newUrl, { scroll: false });
    } else {
      // ボード一覧タブに移動
      if (isTeamDetailPage) {
        window.dispatchEvent(
          new CustomEvent("team-mode-change", {
            detail: { mode: "board", pathname },
          }),
        );
      }
    }
  };

  // ボード詳細からボード一覧に戻る
  const handleBackToBoardList = () => {
    if (isTeamBoardDetailPage) {
      const params = new URLSearchParams(searchParams.toString());
      const hasMemoId = params.has("memoId");
      const hasTaskId = params.has("taskId");

      // メモ/タスクが選択されている場合は、選択を解除してボード詳細に戻る
      if (hasMemoId || hasTaskId) {
        params.delete("memoId");
        params.delete("taskId");
        const newUrl = `/team/${customUrl}?${params.toString()}`;
        router.replace(newUrl, { scroll: false });
      } else {
        // 何も選択されていない場合は、ボード一覧に戻る
        setCurrentBoardName(undefined);
        params.set("tab", "boards");
        params.delete("slug");
        const newUrl = `/team/${customUrl}?${params.toString()}`;
        router.replace(newUrl, { scroll: false });
      }
    }
  };

  const handleSettings = () => {
    // チーム詳細ページの場合はチーム設定タブに移動
    if (isTeamDetailPage) {
      if (isTeamBoardDetailPage) {
        // チームボード詳細ページの場合は、チーム詳細のチーム設定タブに遷移
        const teamCustomUrl = pathname.split("/")[2];
        router.push(`/team/${teamCustomUrl}?tab=team-settings`);
      } else {
        // チーム詳細ページの場合は、チーム設定タブに切り替え
        window.dispatchEvent(
          new CustomEvent("team-mode-change", {
            detail: { mode: "team-settings", pathname },
          }),
        );
      }
    } else {
      // それ以外の場合は個人設定ページに遷移
      router.push("/settings");
    }
  };

  const handleSearch = () => {
    if (isTeamDetailPage) {
      // チーム詳細ページまたはチームボード詳細ページの場合
      if (isTeamBoardDetailPage) {
        // チームボード詳細ページの場合は専用イベントを発信
        window.dispatchEvent(new CustomEvent("team-search-change"));
      } else {
        // チーム詳細ページの場合は検索タブに切り替え
        window.dispatchEvent(
          new CustomEvent("team-mode-change", {
            detail: { mode: "search", pathname },
          }),
        );
      }
    } else {
      // それ以外の場合は通常の検索画面
      router.push("/search");
    }
  };
  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden">
      <div className="hidden md:block">
        <Header />
      </div>
      <div className="flex flex-col md:flex-row flex-1 md:pt-16 overflow-hidden">
        {/* デスクトップ用サイドバー（左） */}
        <div className="hidden md:block w-16 border-r border-gray-200 overflow-visible">
          <Sidebar
            onSelectMemo={() => setSelectedMemoId(null)}
            onShowFullList={handleShowMemoList}
            onHome={handleHome}
            onEditMemo={() => {}}
            currentMode={currentMode}
            onModeChange={handleModeChange}
            onShowTaskList={handleShowTaskList}
            onTeamList={handleTeamList}
            onBoardDetail={handleBoardDetail}
            onSettings={handleSettings}
            onSearch={handleSearch}
            showingBoardDetail={isTeamBoardDetailPage}
            currentBoardName={
              lastBoardSlug ? currentBoardName || lastBoardName : undefined
            }
            currentTeamName={teamDetail?.name}
            selectedMemoId={selectedMemoId ?? undefined}
            imageCount={imageCount}
            commentCount={commentCount}
          />
        </div>

        {/* メインコンテンツ */}
        <main className="flex-1 overflow-hidden mb-14 md:mb-0">{children}</main>

        {/* モバイル用ボトムナビ（下）：ボード詳細時は専用フッター、それ以外はSidebar */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 h-14 border-t border-gray-200 bg-white z-50">
          {isTeamBoardDetailPage ? (
            // ボード詳細ページ：メモ/タスク選択状態でフッターを切り替え
            selectedMemoId !== null && selectedMemoId !== undefined ? (
              <ItemEditorFooter
                type="memo"
                onBack={handleBackToBoardList}
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
                activeTab={memoEditorActiveTab}
                imageCount={imageCount}
                commentCount={commentCount}
              />
            ) : selectedTaskId !== null && selectedTaskId !== undefined ? (
              <ItemEditorFooter
                type="task"
                onBack={handleBackToBoardList}
                onMainClick={() =>
                  window.dispatchEvent(
                    new CustomEvent("team-task-editor-tab-change", {
                      detail: { tab: "task" },
                    }),
                  )
                }
                onCommentClick={() =>
                  window.dispatchEvent(
                    new CustomEvent("team-task-editor-tab-change", {
                      detail: { tab: "comment" },
                    }),
                  )
                }
                onImageClick={() =>
                  window.dispatchEvent(
                    new CustomEvent("team-task-editor-tab-change", {
                      detail: { tab: "image" },
                    }),
                  )
                }
                activeTab={taskEditorActiveTab}
                imageCount={taskImageCount}
                commentCount={taskCommentCount}
              />
            ) : (
              <ItemEditorFooter
                type="board"
                onBack={handleBackToBoardList}
                onMemoClick={() =>
                  window.dispatchEvent(
                    new CustomEvent("board-section-change", {
                      detail: { section: "memos" },
                    }),
                  )
                }
                onTaskClick={() =>
                  window.dispatchEvent(
                    new CustomEvent("board-section-change", {
                      detail: { section: "tasks" },
                    }),
                  )
                }
                onCommentClick={() =>
                  window.dispatchEvent(
                    new CustomEvent("board-section-change", {
                      detail: { section: "comments" },
                    }),
                  )
                }
                activeSection={activeBoardSection}
              />
            )
          ) : (
            <Sidebar
              onSelectMemo={() => setSelectedMemoId(null)}
              onSelectTask={() => {}}
              onEditTask={() => {}}
              onShowFullList={handleShowMemoList}
              onHome={handleHome}
              onEditMemo={() => {}}
              currentMode={currentMode}
              onModeChange={handleModeChange}
              onShowTaskList={handleShowTaskList}
              onTeamList={handleTeamList}
              onBoardDetail={handleBoardDetail}
              onSettings={handleSettings}
              onSearch={handleSearch}
              showingBoardDetail={isTeamBoardDetailPage}
              currentBoardName={
                lastBoardSlug ? currentBoardName || lastBoardName : undefined
              }
              currentTeamName={teamDetail?.name}
              selectedMemoId={selectedMemoId ?? undefined}
              selectedTaskId={selectedTaskId ?? undefined}
              isCreatingMemo={isCreatingMemo}
              isCreatingTask={isCreatingTask}
              imageCount={
                selectedMemoId !== null && selectedMemoId !== undefined
                  ? imageCount
                  : taskImageCount
              }
              commentCount={
                selectedMemoId !== null && selectedMemoId !== undefined
                  ? commentCount
                  : taskCommentCount
              }
              onBackToBoardList={
                isTeamBoardDetailPage ? handleBackToBoardList : undefined
              }
            />
          )}
        </div>
      </div>
    </div>
  );
}

function TeamDetailLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // チームボード詳細ページかどうかを判定
  const isTeamBoardDetailPage = pathname.includes("/board/");

  return (
    <TeamProvider>
      <NavigationProvider
        initialScreenMode={isTeamBoardDetailPage ? "board" : "home"}
        initialCurrentMode={isTeamBoardDetailPage ? "board" : "memo"}
        initialShowingBoardDetail={isTeamBoardDetailPage}
      >
        <TeamDetailProvider>
          <Suspense fallback={<div>Loading...</div>}>
            <TeamLayoutContent>{children}</TeamLayoutContent>
          </Suspense>
        </TeamDetailProvider>
      </NavigationProvider>
    </TeamProvider>
  );
}

export default function TeamDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <TeamDetailLayoutWrapper>{children}</TeamDetailLayoutWrapper>;
}
