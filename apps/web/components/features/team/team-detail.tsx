"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTeamDetail } from "@/src/hooks/use-team-detail";
import { useInviteToTeam } from "@/src/hooks/use-invite-to-team";
import { useUserInfo } from "@/src/hooks/use-user-info";
import MemoScreen from "@/components/screens/memo-screen";
import TaskScreen from "@/components/screens/task-screen";
import { DisplayNameModal } from "@/components/modals/display-name-modal";
import type { Memo, DeletedMemo } from "@/src/types/memo";
import type { Task, DeletedTask } from "@/src/types/task";

interface TeamDetailProps {
  customUrl: string;
}

export function TeamDetail({ customUrl }: TeamDetailProps) {
  const router = useRouter();
  const { data: team, isLoading, error } = useTeamDetail(customUrl);
  const { data: userInfo } = useUserInfo();
  const { mutate: inviteToTeam, isPending: isInviting } = useInviteToTeam();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member">("member");
  const [inviteMessage, setInviteMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [showInviteForm, setShowInviteForm] = useState(false);

  // タブ管理
  const [activeTab, setActiveTab] = useState<"overview" | "memos" | "tasks">(
    "overview",
  );
  const [selectedMemo, setSelectedMemo] = useState<Memo | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedDeletedMemo, setSelectedDeletedMemo] =
    useState<DeletedMemo | null>(null);
  const [selectedDeletedTask, setSelectedDeletedTask] =
    useState<DeletedTask | null>(null);

  // 表示名設定モーダル
  const [showDisplayNameModal, setShowDisplayNameModal] = useState(false);

  // サイドバーからのイベントをリッスン
  useEffect(() => {
    const handleTeamModeChange = (event: CustomEvent) => {
      const { mode, pathname } = event.detail;
      console.log("Received team mode change event:", { mode, pathname });

      if (mode === "memo") {
        setActiveTab("memos");
      } else if (mode === "task") {
        setActiveTab("tasks");
      }
    };

    window.addEventListener(
      "team-mode-change",
      handleTeamModeChange as EventListener,
    );

    return () => {
      window.removeEventListener(
        "team-mode-change",
        handleTeamModeChange as EventListener,
      );
    };
  }, []);

  // メモ/タスク選択ハンドラー
  const handleSelectMemo = (memo: Memo | null) => {
    setSelectedMemo(memo);
  };

  const handleSelectTask = (task: Task | null, fromFullList?: boolean) => {
    setSelectedTask(task);
  };

  const handleSelectDeletedMemo = (memo: DeletedMemo | null) => {
    setSelectedDeletedMemo(memo);
  };

  const handleSelectDeletedTask = (
    task: DeletedTask | null,
    fromFullList?: boolean,
  ) => {
    setSelectedDeletedTask(task);
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
        <div className="mb-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h1 className="text-[22px] font-bold text-gray-800">{team.name}</h1>
          </div>

          {/* タブナビゲーション */}
          <div className="flex border-b border-gray-200 mt-4">
            <button
              className={`px-4 py-2 text-sm font-medium border-b-2 ${
                activeTab === "overview"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
              onClick={() => setActiveTab("overview")}
            >
              概要
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium border-b-2 ${
                activeTab === "memos"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
              onClick={() => setActiveTab("memos")}
            >
              メモ
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium border-b-2 ${
                activeTab === "tasks"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
              onClick={() => setActiveTab("tasks")}
            >
              タスク
            </button>
          </div>
        </div>

        {/* コンテンツエリア */}
        <div className="flex-1 overflow-y-auto">
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
              {/* チーム基本情報 */}
              <div className="mb-6">
                {team.description && (
                  <p className="text-gray-600 text-sm">{team.description}</p>
                )}
              </div>

              {/* メンバー一覧 */}
              <Card className="p-4 mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-gray-900">
                    メンバー ({team.memberCount}人)
                  </h3>
                  {team.role === "admin" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowInviteForm(!showInviteForm)}
                    >
                      招待
                    </Button>
                  )}
                </div>

                {/* メンバー表示 */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-2 bg-gray-50 rounded">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                      {userInfo?.displayName
                        ? userInfo.displayName.charAt(0).toUpperCase()
                        : "Y"}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium">
                        {userInfo?.displayName || "あなた"}
                      </div>
                      <div className="text-xs text-gray-500">
                        user@example.com
                      </div>
                    </div>
                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                      {team.role === "admin" ? "管理者" : "メンバー"}
                    </span>
                  </div>
                </div>
              </Card>

              {/* 招待機能（管理者のみ） */}
              {team.role === "admin" && showInviteForm && (
                <div className="mb-6">
                  <h3 className="font-medium text-gray-900 mb-3">
                    メンバー招待
                  </h3>
                  {inviteMessage && (
                    <div
                      className={`mb-3 p-2 rounded text-sm ${
                        inviteMessage.type === "success"
                          ? "bg-green-50 text-green-700"
                          : "bg-red-50 text-red-700"
                      }`}
                    >
                      {inviteMessage.text}
                    </div>
                  )}
                  <div className="flex gap-2 mb-2">
                    <input
                      type="email"
                      placeholder="メールアドレス"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-gray-400"
                    />
                    <select
                      value={inviteRole}
                      onChange={(e) =>
                        setInviteRole(e.target.value as "admin" | "member")
                      }
                      className="px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-gray-400"
                    >
                      <option value="member">メンバー</option>
                      <option value="admin">管理者</option>
                    </select>
                  </div>
                  <Button
                    onClick={() => {
                      if (!inviteEmail || !inviteEmail.includes("@")) {
                        setInviteMessage({
                          type: "error",
                          text: "有効なメールアドレスを入力してください",
                        });
                        return;
                      }

                      inviteToTeam(
                        { customUrl, email: inviteEmail, role: inviteRole },
                        {
                          onSuccess: () => {
                            setInviteMessage({
                              type: "success",
                              text: `${inviteEmail} に招待メールを送信しました`,
                            });
                            setInviteEmail("");
                            setTimeout(() => setInviteMessage(null), 5000);
                          },
                          onError: (error) => {
                            const message =
                              error instanceof Error
                                ? error.message
                                : "招待の送信に失敗しました";
                            setInviteMessage({ type: "error", text: message });
                            setTimeout(() => setInviteMessage(null), 5000);
                          },
                        },
                      );
                    }}
                    disabled={isInviting || !inviteEmail}
                    size="sm"
                    className="w-full"
                  >
                    {isInviting ? "送信中..." : "招待送信"}
                  </Button>
                </div>
              )}
            </>
          )}

          {/* メモタブ */}
          {activeTab === "memos" && (
            <div className="h-full -mt-4 -ml-5 -mr-5">
              {/* デバッグ情報 */}
              {process.env.NODE_ENV === "development" && (
                <div className="p-2 bg-yellow-100 text-xs">
                  Debug: teamMode={String(true)}, teamId={team.id}
                </div>
              )}
              <MemoScreen
                selectedMemo={selectedMemo}
                onSelectMemo={handleSelectMemo}
                selectedDeletedMemo={selectedDeletedMemo}
                onSelectDeletedMemo={handleSelectDeletedMemo}
                onClose={() => setActiveTab("overview")}
                teamMode={true}
                teamId={team.id}
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
                onClose={() => setActiveTab("overview")}
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
      </div>
    </div>
  );
}
