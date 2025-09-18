"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CopyIcon,
  RefreshCcwIcon,
  TrashIcon,
  Settings as SettingsIcon,
  Bell,
} from "lucide-react";
import { BackButton } from "@/components/ui/buttons/back-button";
import { useTeamDetail } from "@/src/hooks/use-team-detail";
import {
  useGenerateInviteCode,
  useGetInviteUrl,
  useDeleteInviteUrl,
} from "@/src/hooks/use-generate-invite-code";
import { useUserInfo } from "@/src/hooks/use-user-info";
import { useJoinRequests } from "@/src/hooks/use-join-requests";
import { useManageJoinRequest } from "@/src/hooks/use-manage-join-request";
import { useKickMember } from "@/src/hooks/use-kick-member";
import { useSimpleTeamNotifier } from "@/src/hooks/use-simple-team-notifier";
import MemoScreen from "@/components/screens/memo-screen";
import TaskScreen from "@/components/screens/task-screen";
import BoardScreen from "@/components/screens/board-screen";
import SettingsScreen from "@/components/screens/settings-screen";
import SearchScreen from "@/components/screens/search-screen";
import { DisplayNameModal } from "@/components/modals/display-name-modal";
import Modal from "@/components/ui/modals/modal";
import WarningIcon from "@/components/icons/warning-icon";
import { TeamSettings } from "@/components/features/team/team-settings";
import NotificationList from "@/components/features/notifications/notification-list";
import type { Memo, DeletedMemo } from "@/src/types/memo";
import type { Task, DeletedTask } from "@/src/types/task";
import { getUserAvatarColor } from "@/src/utils/userUtils";
import { usePageVisibility } from "@/src/contexts/PageVisibilityContext";
import { formatDateOnly } from "@/src/utils/formatDate";

interface TeamDetailProps {
  customUrl: string;
}

export function TeamDetail({ customUrl }: TeamDetailProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { data: team, isLoading, error } = useTeamDetail(customUrl);

  // 🛡️ ページ可視性をContextから取得
  const { isVisible: isPageVisible } = usePageVisibility();

  // 通知状態をチェック（承認待ちリスト表示制御用）
  const { data: notificationData, checkNow: recheckNotifications } =
    useSimpleTeamNotifier(customUrl, isPageVisible);

  const { data: userInfo } = useUserInfo();
  const { data: existingInviteUrl, isLoading: isLoadingInviteUrl } =
    useGetInviteUrl(customUrl);
  const { mutate: generateInviteCode, isPending: isGenerating } =
    useGenerateInviteCode();
  const { mutate: deleteInviteUrl, isPending: isDeleting } =
    useDeleteInviteUrl();
  const { data: joinRequests, isLoading: isLoadingJoinRequests } =
    useJoinRequests(
      customUrl,
      notificationData?.hasNotifications, // 通知システムから実際の値を使用
      isPageVisible, // ページ可視性
    );

  const {
    approve,
    reject,
    isApproving,
    isRejecting,
    approveError,
    rejectError,
  } = useManageJoinRequest(customUrl);

  const [showInvitePanel, setShowInvitePanel] = useState(false);
  const [previousTab, setPreviousTab] = useState<string | null>(null);
  const [inviteMessage, setInviteMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [displayInviteUrl, setDisplayInviteUrl] = useState<string>("");

  // メンバー管理用の編集モード
  const [isEditMode, setIsEditMode] = useState(false);

  // 選択状態の管理
  const [selectedMemo, setSelectedMemo] = useState<Memo | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedDeletedMemo, setSelectedDeletedMemo] =
    useState<DeletedMemo | null>(null);
  const [selectedDeletedTask, setSelectedDeletedTask] =
    useState<DeletedTask | null>(null);

  // TaskScreenの作成モード状態を監視
  const [isTaskCreateMode, setIsTaskCreateMode] = useState(false);

  // 表示名設定モーダル
  const [showDisplayNameModal, setShowDisplayNameModal] = useState(false);

  // キック機能
  const [kickConfirmModal, setKickConfirmModal] = useState<{
    userId: string;
    displayName: string;
  } | null>(null);
  const kickMutation = useKickMember();

  // 承認処理（通知即座更新付き）
  const handleApprove = (requestId: number) => {
    approve(requestId);
    // 承認後に通知システムを即座に更新（ヘッダーベルアイコン含む）
    setTimeout(() => {
      // 1. join-requestsクエリ無効化（承認リスト更新）
      queryClient.invalidateQueries(["join-requests", customUrl]);
      // 2. 通知チェックAPIを強制実行（ヘッダーベルアイコン更新）
      if (recheckNotifications) {
        recheckNotifications();
      }
      // 3. 全ての通知チェッカーを強制更新（ヘッダー含む）
      window.dispatchEvent(
        new CustomEvent("force-notification-check", {
          detail: { teamName: customUrl },
        }),
      );
    }, 500); // API処理完了後に実行
  };

  // 拒否処理（通知即座更新付き）
  const handleReject = (requestId: number) => {
    reject(requestId);
    // 拒否後に通知システムを即座に更新（ヘッダーベルアイコン含む）
    setTimeout(() => {
      // 1. join-requestsクエリ無効化（承認リスト更新）
      queryClient.invalidateQueries(["join-requests", customUrl]);
      // 2. 通知チェックAPIを強制実行（ヘッダーベルアイコン更新）
      if (recheckNotifications) {
        recheckNotifications();
      }
      // 3. 全ての通知チェッカーを強制更新（ヘッダー含む）
      window.dispatchEvent(
        new CustomEvent("force-notification-check", {
          detail: { teamName: customUrl },
        }),
      );
    }, 500); // API処理完了後に実行
  };

  const handleKickMember = () => {
    if (!kickConfirmModal) return;

    kickMutation.mutate(
      {
        customUrl: customUrl,
        userId: kickConfirmModal.userId,
      },
      {
        onSuccess: () => {
          setKickConfirmModal(null);
          setInviteMessage({
            type: "success",
            text: "メンバーを削除しました",
          });
          setTimeout(() => setInviteMessage(null), 2000);
        },
        onError: (error: any) => {
          console.error("メンバーのキックに失敗:", error);
        },
      },
    );
  };

  // URLのクエリパラメータからタブとアイテムIDを取得
  const getTabFromURL = () => {
    const tab = searchParams.get("tab");
    if (
      tab === "memos" ||
      tab === "tasks" ||
      tab === "boards" ||
      tab === "team-list" ||
      tab === "settings" ||
      tab === "team-settings" ||
      tab === "search"
    ) {
      return tab;
    }
    return "overview";
  };

  const getMemoIdFromURL = () => {
    return searchParams.get("memo");
  };

  const getTaskIdFromURL = () => {
    return searchParams.get("task");
  };

  // タブ管理（URLと同期）
  const [activeTab, setActiveTab] = useState<
    | "overview"
    | "memos"
    | "tasks"
    | "boards"
    | "team-list"
    | "settings"
    | "team-settings"
    | "search"
  >(getTabFromURL());

  // URLのパラメータが変更された時にタブとアイテムを更新
  useEffect(() => {
    console.log("🔍 [TeamDetail] useEffect実行:", {
      searchParams: searchParams.toString(),
      selectedTask: selectedTask?.id,
      isTaskCreateMode,
    });

    const newTab = getTabFromURL();
    if (newTab !== activeTab) {
      setActiveTab(newTab);
    }

    // メモIDがURLにある場合、メモを選択状態にする
    const memoId = getMemoIdFromURL();
    if (memoId && !selectedMemo) {
      console.log("🔍 [TeamDetail] メモURL同期:", { memoId, selectedMemo });
      // APIからメモを取得する実装は各画面コンポーネント側で行う
      // ここでは状態の同期のみ
    }

    // タスクIDがURLにある場合、タスクを選択状態にする（作成モード時は除く）
    const taskId = getTaskIdFromURL();
    console.log("🔍 [TeamDetail] タスクURL同期チェック:", {
      taskId,
      selectedTask: selectedTask?.id,
      isTaskCreateMode,
    });

    if (taskId && !selectedTask && !isTaskCreateMode) {
      console.log(
        "🎯 [TeamDetail] URLからタスク同期実行予定（但し実装未完了）",
      );
      // APIからタスクを取得する実装は各画面コンポーネント側で行う
      // ここでは状態の同期のみ
    } else if (taskId && isTaskCreateMode) {
      console.log("🎯 [TeamDetail] URLからタスク同期をスキップ: 作成モード中");
    } else if (taskId && selectedTask) {
      console.log("🔍 [TeamDetail] URLからタスク同期をスキップ: 既に選択済み");
    }
    // searchParams以外の依存を追加しない（無限ループを防ぐ）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.toString()]);

  // 招待URLをクライアントサイドで更新
  useEffect(() => {
    if (typeof window !== "undefined" && existingInviteUrl?.token) {
      setDisplayInviteUrl(
        `${window.location.origin}/join/${customUrl}?token=${existingInviteUrl.token}`,
      );
    }
  }, [existingInviteUrl, customUrl]);

  // タブを変更する関数（URLも更新）
  const handleTabChange = useCallback(
    (
      tab:
        | "overview"
        | "memos"
        | "tasks"
        | "boards"
        | "team-list"
        | "settings"
        | "team-settings"
        | "search",
    ) => {
      setActiveTab(tab);

      // URLを更新
      const params = new URLSearchParams(searchParams.toString());
      if (tab === "overview") {
        params.delete("tab");
      } else {
        params.set("tab", tab);
      }
      const newUrl = params.toString() ? `?${params.toString()}` : "";
      router.replace(`/team/${customUrl}${newUrl}`, { scroll: false });
    },
    [router, customUrl, searchParams],
  );

  // activeTabが変更された時にlayoutに通知
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("team-tab-change", {
        detail: { activeTab },
      }),
    );
  }, [activeTab]);

  // サイドバーからのイベントをリッスン
  useEffect(() => {
    const handleTeamModeChange = (event: CustomEvent) => {
      const { mode } = event.detail;

      if (mode === "overview") {
        handleTabChange("overview");
      } else if (mode === "memo") {
        handleTabChange("memos");
      } else if (mode === "task") {
        handleTabChange("tasks");
      } else if (mode === "board") {
        handleTabChange("boards");
      } else if (mode === "team-list") {
        handleTabChange("team-list");
      } else if (mode === "settings") {
        handleTabChange("settings");
      } else if (mode === "search") {
        handleTabChange("search");
      }
    };

    const handleTeamNewMemo = (_event: CustomEvent) => {
      handleTabChange("memos");
      // MemoScreenに新規作成モードを指示するイベント送信
      setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent("memo-create-mode", {
            detail: { action: "create" },
          }),
        );
      }, 100);
    };

    window.addEventListener(
      "team-mode-change",
      handleTeamModeChange as EventListener,
    );

    window.addEventListener(
      "team-new-memo",
      handleTeamNewMemo as EventListener,
    );

    return () => {
      window.removeEventListener(
        "team-mode-change",
        handleTeamModeChange as EventListener,
      );
      window.removeEventListener(
        "team-new-memo",
        handleTeamNewMemo as EventListener,
      );
    };
  }, [handleTabChange]);

  // メモ/タスク選択ハンドラー
  const handleSelectMemo = (memo: Memo | null) => {
    setSelectedMemo(memo);

    // URLを更新
    const params = new URLSearchParams(searchParams.toString());
    if (memo) {
      params.set("memo", memo.id.toString());
      // メモ選択時は必ずmemosタブに
      params.set("tab", "memos");
    } else {
      params.delete("memo");
    }
    const newUrl = params.toString() ? `?${params.toString()}` : "";
    router.replace(`/team/${customUrl}${newUrl}`, { scroll: false });
  };

  const handleSelectTask = (task: Task | null, _fromFullList?: boolean) => {
    console.log("🎯 [TeamDetail] handleSelectTask called:", {
      task: task ? { id: task.id } : null,
      fromFullList: _fromFullList,
    });
    setSelectedTask(task);

    // URLを更新
    const params = new URLSearchParams(searchParams.toString());
    if (task) {
      params.set("task", task.id.toString());
      // タスク選択時は必ずtasksタブに
      params.set("tab", "tasks");
    } else {
      params.delete("task");
      console.log("🎯 [TeamDetail] URLパラメーター削除: task");
    }
    const newUrl = params.toString() ? `?${params.toString()}` : "";
    console.log("🎯 [TeamDetail] URL更新:", {
      oldUrl: searchParams.toString(),
      newUrl: newUrl,
    });
    router.replace(`/team/${customUrl}${newUrl}`, { scroll: false });
  };

  const handleSelectDeletedMemo = (memo: DeletedMemo | null) => {
    setSelectedDeletedMemo(memo);

    // URLを更新
    const params = new URLSearchParams(searchParams.toString());
    if (memo) {
      params.set("memo", memo.id.toString());
      params.set("tab", "memos");
    } else {
      params.delete("memo");
    }
    const newUrl = params.toString() ? `?${params.toString()}` : "";
    router.replace(`/team/${customUrl}${newUrl}`, { scroll: false });
  };

  const handleSelectDeletedTask = (
    task: DeletedTask | null,
    _fromFullList?: boolean,
  ) => {
    setSelectedDeletedTask(task);

    // URLを更新
    const params = new URLSearchParams(searchParams.toString());
    if (task) {
      params.set("task", task.id.toString());
      params.set("tab", "tasks");
    } else {
      params.delete("task");
    }
    const newUrl = params.toString() ? `?${params.toString()}` : "";
    router.replace(`/team/${customUrl}${newUrl}`, { scroll: false });
  };

  // エラーまたはチームが見つからない場合のリダイレクト処理
  useEffect(() => {
    if (!isLoading && (error || !team)) {
      router.push("/");
    }
  }, [isLoading, error, team, router]);

  if (isLoading) {
    return (
      <div className="flex h-full bg-white overflow-hidden">
        <div className="w-full pt-3 pl-5 pr-2 flex flex-col">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !team) {
    return (
      <div className="flex h-full bg-white overflow-hidden">
        <div className="w-full pt-3 pl-5 pr-2 flex flex-col">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-white overflow-hidden">
      <div className="w-full pt-4 pl-5 pr-5 flex flex-col h-full">
        {/* ヘッダー */}
        {(activeTab === "overview" || activeTab === "team-list") && (
          <div className="mb-4 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {showInvitePanel && (
                  <BackButton
                    onClick={() => {
                      setShowInvitePanel(false);
                      if (previousTab) {
                        handleTabChange(
                          previousTab as
                            | "overview"
                            | "memos"
                            | "tasks"
                            | "boards"
                            | "team-list"
                            | "settings"
                            | "team-settings"
                            | "search",
                        );
                      }
                    }}
                  />
                )}
                <h1 className="text-[22px] font-bold text-gray-800">
                  {showInvitePanel ? "チーム招待" : team.name}
                </h1>
                {showInvitePanel && (
                  <span className="text-gray-600 font-medium">{team.name}</span>
                )}
              </div>
              {/* チーム設定ボタン（管理者のみ、招待パネル非表示時のみ） */}
              {!showInvitePanel && team.role === "admin" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleTabChange("team-settings")}
                  className="flex items-center gap-2"
                >
                  <SettingsIcon className="w-4 h-4" />
                  チーム設定
                </Button>
              )}
            </div>
          </div>
        )}

        {/* コンテンツエリア */}
        <div
          className={`${activeTab === "overview" ? "flex-1 overflow-y-auto" : "h-full"}`}
        >
          {/* タブコンテンツ */}
          {activeTab === "overview" && (
            <>
              {showInvitePanel ? (
                /* 招待パネル */
                <div>
                  <Card className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <svg
                          className="w-5 h-5 text-blue-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                          />
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          メンバー招待
                        </h3>
                        <p className="text-sm text-gray-500">
                          招待コードでチームに参加してもらう
                        </p>
                      </div>
                    </div>

                    {!existingInviteUrl && !isLoadingInviteUrl ? (
                      <div>
                        <p className="text-gray-600 text-sm mb-4">
                          招待URLを生成してメンバーと共有してください。URLは3日間有効です。
                        </p>
                        <Button
                          onClick={() => {
                            generateInviteCode(
                              { customUrl },
                              {
                                onSuccess: () => {
                                  setInviteMessage({
                                    type: "success",
                                    text: "生成完了",
                                  });
                                  setTimeout(
                                    () => setInviteMessage(null),
                                    1500,
                                  );
                                },
                                onError: () => {
                                  setInviteMessage({
                                    type: "error",
                                    text: "生成失敗",
                                  });
                                  setTimeout(
                                    () => setInviteMessage(null),
                                    2000,
                                  );
                                },
                              },
                            );
                          }}
                          disabled={isGenerating}
                          className="w-full"
                        >
                          {isGenerating ? "生成中..." : "招待URLを生成"}
                        </Button>
                      </div>
                    ) : (
                      <div>
                        {isLoadingInviteUrl ? (
                          <div className="text-center py-4">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                            <p className="text-sm text-gray-500 mt-2">
                              読み込み中...
                            </p>
                          </div>
                        ) : existingInviteUrl ? (
                          <div className="bg-gray-50 border rounded-lg p-4 mb-4">
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-gray-500 mb-1">
                                  招待URL
                                </p>
                                <div className="bg-white border rounded px-3 py-2">
                                  <code className="text-sm font-mono text-gray-800 break-all">
                                    {displayInviteUrl ||
                                      "招待URLを読み込み中..."}
                                  </code>
                                </div>
                              </div>
                              <Button
                                size="sm"
                                onClick={() => {
                                  if (displayInviteUrl) {
                                    navigator.clipboard.writeText(
                                      displayInviteUrl,
                                    );
                                    setInviteMessage({
                                      type: "success",
                                      text: "コピーしました",
                                    });
                                    setTimeout(
                                      () => setInviteMessage(null),
                                      1500,
                                    );
                                  }
                                }}
                                className="ml-2"
                              >
                                <CopyIcon className="w-4 h-4 mr-1" />
                                コピー
                              </Button>
                            </div>
                          </div>
                        ) : null}

                        {existingInviteUrl && (
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500">
                              {new Date(
                                existingInviteUrl.expiresAt,
                              ).toLocaleDateString("ja-JP")}
                              まで有効
                            </span>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  generateInviteCode(
                                    { customUrl },
                                    {
                                      onSuccess: () => {
                                        setInviteMessage({
                                          type: "success",
                                          text: "新しいURLを生成しました",
                                        });
                                        setTimeout(
                                          () => setInviteMessage(null),
                                          2000,
                                        );
                                      },
                                      onError: () => {
                                        setInviteMessage({
                                          type: "error",
                                          text: "更新に失敗しました",
                                        });
                                        setTimeout(
                                          () => setInviteMessage(null),
                                          2000,
                                        );
                                      },
                                    },
                                  );
                                }}
                                disabled={isGenerating || isDeleting}
                              >
                                <RefreshCcwIcon className="w-4 h-4 mr-1" />
                                更新
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  deleteInviteUrl(customUrl, {
                                    onSuccess: () => {
                                      setInviteMessage({
                                        type: "success",
                                        text: "招待URLを削除しました",
                                      });
                                      setTimeout(
                                        () => setInviteMessage(null),
                                        2000,
                                      );
                                    },
                                    onError: () => {
                                      setInviteMessage({
                                        type: "error",
                                        text: "削除に失敗しました",
                                      });
                                      setTimeout(
                                        () => setInviteMessage(null),
                                        2000,
                                      );
                                    },
                                  });
                                }}
                                disabled={isGenerating || isDeleting}
                                className="text-red-600 border-red-300 hover:bg-red-50"
                              >
                                <TrashIcon className="w-4 h-4 mr-1" />
                                {isDeleting ? "削除中..." : "削除"}
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </Card>

                  {/* メッセージ表示 */}
                  {inviteMessage && (
                    <div
                      className={`p-3 rounded-lg text-sm text-center ${
                        inviteMessage.type === "success"
                          ? "bg-green-50 text-green-700"
                          : "bg-red-50 text-red-700"
                      }`}
                    >
                      {inviteMessage.text}
                    </div>
                  )}
                </div>
              ) : (
                /* ダッシュボード表示 */
                <div className="space-y-6">
                  {/* 通知一覧 - 実際のデータを使用 */}
                  <NotificationList teamName={customUrl} />
                </div>
              )}
            </>
          )}

          {/* メモタブ */}
          {activeTab === "memos" && (
            <div className="h-full -mt-4 -ml-5 -mr-5">
              <MemoScreen
                selectedMemo={selectedMemo}
                onSelectMemo={handleSelectMemo}
                selectedDeletedMemo={selectedDeletedMemo}
                onSelectDeletedMemo={handleSelectDeletedMemo}
                onClose={() => {
                  // メモを閉じる時はmemoパラメータも削除してmemosタブに残る
                  setSelectedMemo(null);
                  setSelectedDeletedMemo(null);
                  const params = new URLSearchParams(searchParams.toString());
                  params.delete("memo");
                  params.set("tab", "memos");
                  const newUrl = params.toString()
                    ? `?${params.toString()}`
                    : "";
                  router.replace(`/team/${customUrl}${newUrl}`, {
                    scroll: false,
                  });
                }}
                onDeselectAndStayOnMemoList={() => {
                  // メモを閉じてリスト表示に戻る（URLからもmemoパラメータを削除）
                  setSelectedMemo(null);
                  setSelectedDeletedMemo(null);
                  const params = new URLSearchParams(searchParams.toString());
                  params.delete("memo");
                  params.set("tab", "memos");
                  const newUrl = params.toString()
                    ? `?${params.toString()}`
                    : "";
                  router.replace(`/team/${customUrl}${newUrl}`, {
                    scroll: false,
                  });
                }}
                teamMode={true}
                teamId={team.id}
                initialMemoId={selectedMemo ? getMemoIdFromURL() : null}
              />
            </div>
          )}

          {/* タスクタブ */}
          {activeTab === "tasks" && (
            <div className="h-full -mt-4 -ml-5 -mr-5">
              <TaskScreen
                selectedTask={selectedTask}
                onSelectTask={handleSelectTask}
                selectedDeletedTask={selectedDeletedTask}
                onSelectDeletedTask={handleSelectDeletedTask}
                onClose={() => handleTabChange("overview")}
                onScreenModeChange={(mode) => {
                  setIsTaskCreateMode(mode === "create");
                  console.log("🎯 [TeamDetail] TaskScreen mode changed:", mode);
                }}
                teamMode={true}
                teamId={team.id}
                initialTaskId={isTaskCreateMode ? null : getTaskIdFromURL()}
              />
            </div>
          )}

          {/* ボードタブ */}
          {activeTab === "boards" && (
            <div className="h-full -mt-4 -ml-5 -mr-5">
              <BoardScreen
                teamMode={true}
                teamId={team.id}
                onBoardSelect={(board) => {
                  // チームボード詳細ページに遷移（チーム専用URL）
                  router.push(`/team/${customUrl}/board/${board.slug}`);
                }}
              />
            </div>
          )}

          {/* チーム一覧タブ */}
          {activeTab === "team-list" && (
            <>
              {/* 通常のチーム概要表示 */}
              <>
                {/* チーム基本情報 */}
                {team.description && (
                  <div className="mb-6">
                    <p className="text-gray-600 text-sm">{team.description}</p>
                  </div>
                )}

                {/* 承認待ちリスト（管理者のみ、申請がある場合のみ表示） */}
                {team.role === "admin" &&
                  joinRequests?.requests &&
                  joinRequests.requests.length > 0 && (
                    <Card className="p-4 mb-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-medium text-gray-900 flex items-center gap-2">
                          <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></span>
                          承認待ちの申請 ({joinRequests.requests.length}件)
                        </h3>
                      </div>

                      <div className="space-y-3">
                        {joinRequests.requests.map((request) => (
                          <div
                            key={request.id}
                            className="bg-orange-50 border border-orange-200 rounded-lg p-3"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-1">
                                  <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                                    {request.displayName
                                      ? request.displayName
                                          .charAt(0)
                                          .toUpperCase()
                                      : request.email.charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <h4 className="font-medium text-gray-900">
                                      {request.displayName || "名前未設定"}
                                    </h4>
                                    <p className="text-xs text-gray-500">
                                      {request.email}
                                    </p>
                                  </div>
                                </div>

                                <div className="text-xs text-gray-400 ml-11">
                                  申請: {formatDateOnly(request.createdAt)}
                                </div>
                              </div>

                              <div className="flex gap-2 ml-4">
                                <Button
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700 text-white"
                                  onClick={() => handleApprove(request.id)}
                                  disabled={isApproving || isRejecting}
                                >
                                  {isApproving ? "承認中..." : "承認"}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-red-600 border-red-300 hover:bg-red-50"
                                  onClick={() => handleReject(request.id)}
                                  disabled={isApproving || isRejecting}
                                >
                                  {isRejecting ? "拒否中..." : "拒否"}
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}

                {/* メンバー一覧 */}
                <Card className="p-4 mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-gray-900">
                      メンバー ({team.memberCount}人)
                    </h3>
                    {/* ボタン群（管理者のみ） */}
                    {team.role === "admin" && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setPreviousTab(activeTab);
                            setShowInvitePanel(true);
                            handleTabChange("overview");
                          }}
                        >
                          招待
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setIsEditMode(!isEditMode)}
                          className={
                            isEditMode
                              ? "bg-red-50 text-red-700 border-red-200"
                              : ""
                          }
                        >
                          {isEditMode ? "完了" : "編集"}
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* メンバー表示 */}
                  <div
                    className="space-y-3 overflow-y-auto"
                    style={{ maxHeight: "calc(100vh - 250px)" }}
                  >
                    {(team.members || [])
                      .sort((a, b) => {
                        // 自分を一番上に表示
                        if (a.userId === userInfo?.userId) return -1;
                        if (b.userId === userInfo?.userId) return 1;
                        return 0;
                      })
                      .map((member) => (
                        <div
                          key={member.userId}
                          className={`flex items-center gap-3 p-2 rounded ${
                            member.userId === userInfo?.userId
                              ? "bg-blue-50"
                              : "bg-gray-50"
                          }`}
                        >
                          <div
                            className={`w-8 h-8 ${getUserAvatarColor(member.userId)} rounded-full flex items-center justify-center text-white text-sm font-medium`}
                          >
                            {member.displayName
                              ? member.displayName.charAt(0).toUpperCase()
                              : member.userId.charAt(10).toUpperCase()}
                          </div>
                          <div className="flex-1">
                            <div className="text-sm font-medium">
                              {member.displayName ||
                                `ユーザー${member.userId.slice(-4)}`}
                            </div>
                            <div className="text-xs text-gray-500">
                              {formatDateOnly(member.joinedAt)}に参加
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {/* メンバー管理ボタン（編集モード時のみ、管理者・自分以外に表示） */}
                            {isEditMode &&
                              team.role === "admin" &&
                              member.userId !== userInfo?.userId &&
                              member.role !== "admin" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-red-600 border-red-300 hover:bg-red-50 text-xs px-2 py-1 h-6"
                                  onClick={() =>
                                    setKickConfirmModal({
                                      userId: member.userId,
                                      displayName:
                                        member.displayName ||
                                        `ユーザー${member.userId.slice(-4)}`,
                                    })
                                  }
                                >
                                  削除
                                </Button>
                              )}
                          </div>
                        </div>
                      ))}
                  </div>
                </Card>

                {/* メッセージ表示エリア */}
                {inviteMessage && (
                  <div
                    className={`mb-4 p-3 rounded text-sm ${
                      inviteMessage.type === "success"
                        ? "bg-green-50 text-green-700"
                        : "bg-red-50 text-red-700"
                    }`}
                  >
                    {inviteMessage.text}
                  </div>
                )}
              </>
            </>
          )}

          {/* 設定タブ */}
          {activeTab === "settings" && (
            <div className="h-full -mt-4 -ml-5 -mr-5">
              <SettingsScreen />
            </div>
          )}

          {/* チーム設定タブ */}
          {activeTab === "team-settings" && (
            <div className="h-full -mt-4 -ml-5 -mr-5">
              <TeamSettings customUrl={customUrl} />
            </div>
          )}

          {/* 検索タブ */}
          {activeTab === "search" && (
            <div className="h-full -mt-4 -ml-5 -mr-5">
              <SearchScreen
                onSelectMemo={handleSelectMemo}
                onSelectTask={handleSelectTask}
                onSelectDeletedMemo={handleSelectDeletedMemo}
                onSelectDeletedTask={handleSelectDeletedTask}
                teamMode={true}
                teamId={team.id}
              />
            </div>
          )}
        </div>

        {/* 表示名設定モーダル */}
        <DisplayNameModal
          isOpen={showDisplayNameModal}
          onClose={() => setShowDisplayNameModal(false)}
          currentDisplayName={userInfo?.displayName}
        />

        {/* キック確認モーダル */}
        <Modal
          isOpen={!!kickConfirmModal}
          onClose={() => setKickConfirmModal(null)}
          maxWidth="md"
        >
          <div>
            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-200">
              <WarningIcon className="w-6 h-6 text-red-600" />
              <h3 className="text-lg font-semibold text-gray-900">
                メンバーを削除
              </h3>
            </div>
            <div className="mb-4 p-4 bg-red-50 border-2 border-red-300 rounded-lg">
              <p className="text-red-800 font-medium">
                <span className="font-bold text-red-900">
                  {kickConfirmModal?.displayName}
                </span>
                をチームから削除しますか？
              </p>
              <p className="text-red-600 text-sm mt-2">
                この操作は取り消せません。削除されたメンバーは再度招待する必要があります。
              </p>
            </div>
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setKickConfirmModal(null)}
                disabled={kickMutation.isPending}
              >
                キャンセル
              </Button>
              <Button
                variant="destructive"
                onClick={handleKickMember}
                disabled={kickMutation.isPending}
              >
                {kickMutation.isPending ? "削除中..." : "削除"}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
}
