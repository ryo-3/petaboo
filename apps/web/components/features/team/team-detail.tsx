"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CopyIcon, RefreshCcwIcon, TrashIcon } from "lucide-react";
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
import MemoScreen from "@/components/screens/memo-screen";
import TaskScreen from "@/components/screens/task-screen";
import BoardScreen from "@/components/screens/board-screen";
import { DisplayNameModal } from "@/components/modals/display-name-modal";
import { TeamWelcome } from "@/components/features/team/team-welcome";
import type { Memo, DeletedMemo } from "@/src/types/memo";
import type { Task, DeletedTask } from "@/src/types/task";

interface TeamDetailProps {
  customUrl: string;
}

export function TeamDetail({ customUrl }: TeamDetailProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: team, isLoading, error } = useTeamDetail(customUrl);

  // ユーザーIDから色を生成する関数
  const getAvatarColor = (userId: string) => {
    const colors = [
      "bg-blue-500",
      "bg-green-500",
      "bg-purple-500",
      "bg-pink-500",
      "bg-indigo-500",
      "bg-yellow-500",
      "bg-red-500",
      "bg-teal-500",
      "bg-orange-500",
      "bg-cyan-500",
      "bg-violet-500",
      "bg-fuchsia-500",
      "bg-rose-500",
      "bg-amber-500",
      "bg-lime-500",
      "bg-emerald-500",
      "bg-sky-500",
      "bg-slate-600",
      "bg-gray-600",
      "bg-zinc-600",
      "bg-stone-600",
      "bg-neutral-600",
      "bg-blue-600",
      "bg-green-600",
      "bg-purple-600",
      "bg-pink-600",
      "bg-indigo-600",
      "bg-red-600",
      "bg-teal-600",
      "bg-orange-600",
    ];
    // userIdをハッシュして色のインデックスを決める
    const hash = userId
      .split("")
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };
  const { data: userInfo } = useUserInfo();
  const { data: existingInviteUrl, isLoading: isLoadingInviteUrl } =
    useGetInviteUrl(customUrl);
  const { mutate: generateInviteCode, isPending: isGenerating } =
    useGenerateInviteCode();
  const { mutate: deleteInviteUrl, isPending: isDeleting } =
    useDeleteInviteUrl();
  const { data: joinRequests, isLoading: isLoadingJoinRequests } =
    useJoinRequests(customUrl);
  const {
    approve,
    reject,
    isApproving,
    isRejecting,
    approveError,
    rejectError,
  } = useManageJoinRequest(customUrl);

  const [showInvitePanel, setShowInvitePanel] = useState(false);
  const [inviteMessage, setInviteMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // 選択状態の管理
  const [selectedMemo, setSelectedMemo] = useState<Memo | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedDeletedMemo, setSelectedDeletedMemo] =
    useState<DeletedMemo | null>(null);
  const [selectedDeletedTask, setSelectedDeletedTask] =
    useState<DeletedTask | null>(null);

  // 表示名設定モーダル
  const [showDisplayNameModal, setShowDisplayNameModal] = useState(false);

  // URLのクエリパラメータからタブとアイテムIDを取得
  const getTabFromURL = () => {
    const tab = searchParams.get("tab");
    if (
      tab === "memos" ||
      tab === "tasks" ||
      tab === "boards" ||
      tab === "team-list"
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
    "overview" | "memos" | "tasks" | "boards" | "team-list"
  >(getTabFromURL());

  // URLのパラメータが変更された時にタブとアイテムを更新
  useEffect(() => {
    const newTab = getTabFromURL();
    if (newTab !== activeTab) {
      setActiveTab(newTab);
    }

    // メモIDがURLにある場合、メモを選択状態にする
    const memoId = getMemoIdFromURL();
    if (memoId && !selectedMemo) {
      // APIからメモを取得する実装は各画面コンポーネント側で行う
      // ここでは状態の同期のみ
    }

    // タスクIDがURLにある場合、タスクを選択状態にする
    const taskId = getTaskIdFromURL();
    if (taskId && !selectedTask) {
      // APIからタスクを取得する実装は各画面コンポーネント側で行う
      // ここでは状態の同期のみ
    }
    // searchParams以外の依存を追加しない（無限ループを防ぐ）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.toString()]);

  // タブを変更する関数（URLも更新）
  const handleTabChange = useCallback(
    (tab: "overview" | "memos" | "tasks" | "boards" | "team-list") => {
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
      const { mode, pathname } = event.detail;

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
    setSelectedTask(task);

    // URLを更新
    const params = new URLSearchParams(searchParams.toString());
    if (task) {
      params.set("task", task.id.toString());
      // タスク選択時は必ずtasksタブに
      params.set("tab", "tasks");
    } else {
      params.delete("task");
    }
    const newUrl = params.toString() ? `?${params.toString()}` : "";
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
      router.push("/team");
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
      <div className="w-full pt-3 pl-5 pr-5 flex flex-col">
        {/* ヘッダー */}
        {activeTab === "overview" && (
          <div className="mb-4 flex-shrink-0">
            <div className="flex items-center gap-4">
              {showInvitePanel && (
                <BackButton onClick={() => setShowInvitePanel(false)} />
              )}
              <h1 className="text-[22px] font-bold text-gray-800">
                {showInvitePanel ? "チーム招待" : team.name}
              </h1>
              {showInvitePanel && (
                <span className="text-gray-600 font-medium">{team.name}</span>
              )}
            </div>
          </div>
        )}

        {/* コンテンツエリア */}
        <div
          className={`${activeTab === "overview" ? "flex-1 overflow-y-auto" : "h-full"}`}
        >
          {/* 表示名未設定メッセージ */}
          {userInfo && !userInfo.displayName && (
            <div className="mb-4 px-3 py-1 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">
                  チーム機能を使うには表示名の設定が必要です
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowDisplayNameModal(true)}
                >
                  設定
                </Button>
              </div>
            </div>
          )}

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
                                onSuccess: (data) => {
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
                                    {existingInviteUrl.url}
                                  </code>
                                </div>
                              </div>
                              <Button
                                size="sm"
                                onClick={() => {
                                  navigator.clipboard.writeText(
                                    existingInviteUrl.url,
                                  );
                                  setInviteMessage({
                                    type: "success",
                                    text: "コピーしました",
                                  });
                                  setTimeout(
                                    () => setInviteMessage(null),
                                    1500,
                                  );
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
                                      onSuccess: (data) => {
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
                /* 通常のチーム概要表示 */
                <>
                  {/* チーム基本情報 */}
                  <div className="mb-6">
                    {team.description && (
                      <p className="text-gray-600 text-sm">
                        {team.description}
                      </p>
                    )}
                  </div>

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
                                    申請:{" "}
                                    {new Date(
                                      request.createdAt * 1000,
                                    ).toLocaleString("ja-JP", {
                                      month: "numeric",
                                      day: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </div>
                                </div>

                                <div className="flex gap-2 ml-4">
                                  <Button
                                    size="sm"
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                    onClick={() => approve(request.id)}
                                    disabled={isApproving || isRejecting}
                                  >
                                    {isApproving ? "承認中..." : "承認"}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-red-600 border-red-300 hover:bg-red-50"
                                    onClick={() => reject(request.id)}
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
                      {/* 招待ボタン（管理者のみ） */}
                      {team.role === "admin" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setShowInvitePanel(true)}
                        >
                          招待
                        </Button>
                      )}
                    </div>

                    {/* メンバー表示 */}
                    <div className="space-y-3">
                      {(team.members || []).map((member) => (
                        <div
                          key={member.userId}
                          className="flex items-center gap-3 p-2 bg-gray-50 rounded"
                        >
                          <div
                            className={`w-8 h-8 ${getAvatarColor(member.userId)} rounded-full flex items-center justify-center text-white text-sm font-medium`}
                          >
                            {member.displayName
                              ? member.displayName.charAt(0).toUpperCase()
                              : member.userId.charAt(10).toUpperCase()}
                          </div>
                          <div className="flex-1">
                            <div className="text-sm font-medium">
                              {member.displayName ||
                                `ユーザー${member.userId.slice(-4)}`}
                              {member.userId === userInfo?.userId &&
                                " (あなた)"}
                            </div>
                            <div className="text-xs text-gray-500">
                              {new Date(
                                member.joinedAt * 1000,
                              ).toLocaleDateString("ja-JP")}
                              に参加
                            </div>
                          </div>
                          <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                            {member.role === "admin" ? "管理者" : "メンバー"}
                          </span>
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
                onClose={() => handleTabChange("overview")}
                teamMode={true}
                teamId={team.id}
                initialMemoId={getMemoIdFromURL()}
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
                teamMode={true}
                teamId={team.id}
                initialTaskId={getTaskIdFromURL()}
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
            <div className="h-full -mt-4 -ml-5 -mr-5">
              <TeamWelcome />
            </div>
          )}
        </div>

        {/* 表示名設定モーダル */}
        <DisplayNameModal
          isOpen={showDisplayNameModal}
          onClose={() => setShowDisplayNameModal(false)}
          currentDisplayName={userInfo?.displayName}
        />
      </div>
    </div>
  );
}
