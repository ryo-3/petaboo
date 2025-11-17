"use client";

import MemoIcon from "@/components/icons/memo-icon";
import TaskIcon from "@/components/icons/task-icon";
import HomeIcon from "@/components/icons/home-icon";
import {
  ArrowLeft,
  Mail,
  Users,
  Shield,
  Settings,
  Trash2,
  Crown,
} from "lucide-react";
import { useState } from "react";
import { usePathname } from "next/navigation";
import NotificationList from "@/components/features/notifications/notification-list";
import { useTeamContext } from "@/src/contexts/team-context";

interface WelcomeScreenProps {
  teamName?: string;
  onNavigateToTeamList?: () => void;
  onNavigateToHome?: () => void;
}

function WelcomeScreen({
  teamName = "開発チーム",
  onNavigateToTeamList,
  onNavigateToHome,
}: WelcomeScreenProps) {
  const { isTeamMode: teamMode } = useTeamContext();
  const pathname = usePathname();

  // URLからチーム名を取得（通知機能用）
  const currentTeamName =
    pathname.startsWith("/team/") && pathname !== "/team"
      ? pathname.split("/")[2]
      : teamName;

  const [currentView, setCurrentView] = useState<
    "home" | "invite" | "settings"
  >("home");
  const [settingsTab, setSettingsTab] = useState<
    "members" | "invitations" | "permissions" | "general"
  >("members");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"member" | "admin">("member");

  // モックデータ
  const mockTeamData = {
    id: 1,
    name: teamName,
    description: "メインプロダクト開発チーム",
    members: [
      {
        id: 1,
        name: "田中太郎",
        email: "tanaka@example.com",
        role: "admin",
        joinedAt: "2024-01-01",
      },
      {
        id: 2,
        name: "佐藤花子",
        email: "sato@example.com",
        role: "admin",
        joinedAt: "2024-01-15",
      },
      {
        id: 3,
        name: "鈴木次郎",
        email: "suzuki@example.com",
        role: "member",
        joinedAt: "2024-02-01",
      },
    ],
    invitations: [
      {
        id: 1,
        email: "yamada@example.com",
        role: "member",
        invitedBy: "田中太郎",
        createdAt: "2024-03-01",
        status: "pending",
      },
    ],
  };

  const handleInvite = () => {
    if (!inviteEmail.trim()) return;
    // TODO: API呼び出し
    alert(`${inviteEmail} に招待メールを送信しました`);
    setInviteEmail("");
    setCurrentView("home");
  };
  return (
    <div
      className={`h-full bg-gray-50 overflow-y-auto ${teamMode ? "pt-3 pl-5 pr-5" : "px-4 py-6 md:px-8 md:py-8 xl:px-8 xl:py-6"}`}
    >
      <div className={teamMode ? "" : "flex flex-col items-center"}>
        <div
          className={`w-full ${teamMode ? "space-y-6 max-w-none" : "space-y-5 md:space-y-6 xl:space-y-3 max-w-7xl text-center"}`}
        >
          <div className="space-y-3">
            {teamMode ? (
              <div className="mb-4">
                <div className="flex items-center justify-between">
                  <h1 className="text-[22px] font-bold text-gray-800">
                    {teamName}
                  </h1>
                  {onNavigateToHome && (
                    <button
                      onClick={onNavigateToHome}
                      className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 text-sm"
                    >
                      <HomeIcon className="w-4 h-4" />
                      個人ホームへ
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-center space-x-3 mb-2">
                  <div className="flex items-center justify-center w-10 h-10 md:w-12 md:h-12 xl:w-14 xl:h-14 bg-blue-100 rounded-full">
                    <MemoIcon className="w-5 h-5 md:w-6 md:h-6 xl:w-7 xl:h-7 text-blue-600" />
                  </div>
                  <div className="flex items-center justify-center w-10 h-10 md:w-12 md:h-12 xl:w-14 xl:h-14 bg-green-100 rounded-full">
                    <TaskIcon className="w-5 h-5 md:w-6 md:h-6 xl:w-7 xl:h-7 text-green-600" />
                  </div>
                </div>
                <h1 className="text-xl md:text-2xl xl:text-3xl font-bold text-gray-900">
                  ようこそ！
                </h1>
                <h2 className="text-base md:text-lg xl:text-xl font-semibold text-gray-800">
                  メモ＆タスク管理アプリへようこそ
                </h2>
                <p className="text-sm md:text-base xl:text-base text-gray-600 leading-relaxed">
                  左側からメモを選択するか、新規追加ボタンでメモやタスクを作成してください
                </p>
                {onNavigateToTeamList && (
                  <div className="mt-3">
                    <button
                      onClick={onNavigateToTeamList}
                      className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 mx-auto text-sm"
                    >
                      <Users className="w-4 h-4" />
                      チーム一覧へ
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {!teamMode && (
            <>
              {/* プラン比較セクション */}
              <div className="border-t border-gray-200 pt-4 md:pt-5 pb-20 md:pb-3">
                <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-4 text-center">
                  プラン選択
                </h3>
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 max-w-2xl xl:max-w-6xl mx-auto">
                  {/* フリープラン */}
                  <div className="border border-gray-200 rounded-xl p-6 bg-white shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex flex-col gap-0">
                      <div className="flex flex-col text-center mb-5 min-h-[90px]">
                        <div className="flex-shrink-0 flex flex-col">
                          <h4 className="text-lg font-bold text-gray-900 mb-1">
                            フリープラン
                          </h4>
                          <div className="text-3xl font-bold text-gray-600">
                            無料
                          </div>
                        </div>
                      </div>
                      <ul className="space-y-2 text-lg text-gray-600 mb-5">
                        <li className="flex items-start">
                          <span className="mr-2 text-green-500">✓</span>
                          <span>無制限のメモ・タスク作成</span>
                        </li>
                        <li className="flex items-start">
                          <span className="mr-2 text-green-500">✓</span>
                          <span>ボード3個まで</span>
                        </li>
                        <li className="flex items-start">
                          <span className="mr-2 text-green-500">✓</span>
                          <span>チーム参加（招待のみ）</span>
                        </li>
                      </ul>
                    </div>
                    <div className="text-center mt-auto">
                      <div className="text-base text-gray-500 py-3 px-6 border border-gray-200 rounded-lg font-medium">
                        現在のプラン
                      </div>
                    </div>
                  </div>

                  {/* チームプラン */}
                  <div className="bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-blue-300 rounded-xl p-6 flex flex-col shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex flex-col gap-0">
                      <div className="flex flex-col text-center mb-5 min-h-[90px] space-y-2">
                        <div className="flex-shrink-0 flex flex-col">
                          <h3 className="text-lg font-bold">チームプラン</h3>
                          <div className="text-3xl font-bold">
                            ¥1,980
                            <span className="text-sm text-gray-600 font-normal ml-2">
                              / 月
                            </span>
                          </div>
                          <p className="text-sm text-blue-600 font-medium">
                            1ヶ月無料トライアル
                          </p>
                        </div>
                      </div>
                      <ul className="space-y-2 text-lg mb-5">
                        <li className="flex items-center">
                          <span className="mr-2">✓</span>
                          無制限のメモ・タスク作成
                        </li>
                        <li className="flex items-center">
                          <span className="mr-2">✓</span>
                          チーム作成・管理（1チーム）
                        </li>
                        <li className="flex items-center">
                          <span className="mr-2">✓</span>
                          ボード30個まで作成可能
                        </li>
                        <li className="flex items-center">
                          <span className="mr-2">✓</span>
                          1ヶ月無料
                        </li>
                      </ul>
                    </div>

                    <div className="flex justify-center mt-auto">
                      <button
                        onClick={() => {
                          alert("プレミアムアップグレード機能は実装予定です");
                        }}
                        className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-6 py-3 text-base font-medium rounded-lg transition-colors flex items-center"
                      >
                        <Crown className="mr-2 w-5 h-5" />
                        1ヶ月無料でお試し
                      </button>
                    </div>
                  </div>

                  {/* プレミアムプラン */}
                  <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-200 rounded-xl p-6 flex flex-col shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex flex-col gap-0">
                      <div className="flex flex-col text-center mb-5 min-h-[90px] space-y-2">
                        <div className="flex-shrink-0 flex flex-col">
                          <h3 className="text-lg font-bold">
                            プレミアムプラン
                          </h3>
                          <div className="text-3xl font-bold">
                            ¥4,980
                            <span className="text-sm text-gray-600 font-normal ml-2">
                              / 月
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">
                            すべての機能が利用可能
                          </p>
                        </div>
                      </div>
                      <ul className="space-y-2 text-lg mb-5">
                        <li className="flex items-center">
                          <span className="mr-2">✓</span>
                          チームプランの全機能
                        </li>
                        <li className="flex items-center">
                          <span className="mr-2">✓</span>
                          複数チーム作成（最大3チーム）
                        </li>
                        <li className="flex items-center">
                          <span className="mr-2">✓</span>
                          ボード実質無制限（999個まで）
                        </li>
                      </ul>
                    </div>

                    <div className="flex justify-center mt-auto">
                      <button
                        onClick={() => {
                          alert("プレミアムプランは準備中です");
                        }}
                        className="bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white px-6 py-3 text-base font-medium rounded-lg transition-colors flex items-center"
                      >
                        <Crown className="mr-2 w-5 h-5" />
                        準備中
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {teamMode && currentView === "home" && (
            <div className="space-y-6">
              {/* 通知一覧 */}
              <NotificationList teamName={currentTeamName} />

              {/* ボタングループ */}
              <div className="flex gap-3">
                <button
                  onClick={() => setCurrentView("invite")}
                  className="bg-gray-800 text-white px-4 py-2 rounded text-sm hover:bg-gray-900"
                >
                  メンバー招待
                </button>
                <button
                  onClick={() => setCurrentView("settings")}
                  className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700"
                >
                  詳細設定
                </button>
              </div>

              <div className="text-center">
                <a
                  href="/"
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  個人用ワークスペースに戻る
                </a>
              </div>
            </div>
          )}

          {teamMode && currentView === "invite" && (
            <div className="space-y-4">
              <div className="bg-white rounded-lg p-4 border">
                <div className="flex items-center gap-3 mb-4">
                  <button
                    onClick={() => setCurrentView("home")}
                    className="flex items-center text-gray-600 hover:text-gray-800"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <h1 className="text-[22px] font-bold text-gray-800">
                    メンバー招待
                  </h1>
                </div>

                {/* 招待フォーム */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      メールアドレス
                    </label>
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="example@company.com"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      権限
                    </label>
                    <select
                      value={inviteRole}
                      onChange={(e) =>
                        setInviteRole(e.target.value as "member" | "admin")
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="member">メンバー</option>
                      <option value="admin">管理者</option>
                    </select>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={handleInvite}
                      className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 flex items-center gap-2"
                    >
                      <Mail className="w-4 h-4" />
                      招待メールを送信
                    </button>
                    <button
                      onClick={() => setCurrentView("home")}
                      className="bg-gray-200 text-gray-700 px-4 py-2 rounded text-sm hover:bg-gray-300"
                    >
                      キャンセル
                    </button>
                  </div>
                </div>
              </div>

              <div className="text-center">
                <a
                  href="/"
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  個人用ワークスペースに戻る
                </a>
              </div>
            </div>
          )}

          {teamMode && currentView === "settings" && (
            <div className="space-y-4">
              <div className="bg-white rounded-lg border">
                {/* ヘッダー */}
                <div className="border-b border-gray-200 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setCurrentView("home")}
                      className="flex items-center text-gray-600 hover:text-gray-800"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    <Settings className="w-5 h-5 text-gray-600" />
                    <h1 className="text-[22px] font-bold text-gray-800">
                      チーム設定
                    </h1>
                  </div>
                </div>

                {/* タブナビゲーション */}
                <div className="border-b border-gray-200">
                  <nav className="flex space-x-6 px-4">
                    {[
                      {
                        id: "members",
                        label: "メンバー",
                        icon: <Users className="w-4 h-4" />,
                      },
                      {
                        id: "invitations",
                        label: "招待管理",
                        icon: <Mail className="w-4 h-4" />,
                      },
                      {
                        id: "permissions",
                        label: "権限設定",
                        icon: <Shield className="w-4 h-4" />,
                      },
                      {
                        id: "general",
                        label: "基本設定",
                        icon: <Settings className="w-4 h-4" />,
                      },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() =>
                          setSettingsTab(tab.id as typeof settingsTab)
                        }
                        className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                          settingsTab === tab.id
                            ? "border-blue-500 text-blue-600"
                            : "border-transparent text-gray-500 hover:text-gray-700"
                        }`}
                      >
                        {tab.icon}
                        {tab.label}
                      </button>
                    ))}
                  </nav>
                </div>

                {/* コンテンツエリア */}
                <div className="p-4">
                  {settingsTab === "members" && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        メンバー一覧
                      </h3>
                      <div className="space-y-2">
                        {mockTeamData.members.map((member) => (
                          <div
                            key={member.id}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded"
                          >
                            <div>
                              <div className="font-medium text-gray-900">
                                {member.name}
                              </div>
                              <div className="text-sm text-gray-600">
                                {member.email}
                              </div>
                            </div>
                            <span
                              className={`px-2 py-1 text-xs rounded-full ${
                                member.role === "admin"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {member.role === "admin" ? "管理者" : "メンバー"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {settingsTab === "invitations" && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        保留中の招待
                      </h3>
                      {mockTeamData.invitations.length === 0 ? (
                        <p className="text-gray-500 text-sm">
                          保留中の招待はありません
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {mockTeamData.invitations.map((invitation) => (
                            <div
                              key={invitation.id}
                              className="flex items-center justify-between p-3 bg-gray-50 rounded"
                            >
                              <div>
                                <div className="font-medium text-gray-900">
                                  {invitation.email}
                                </div>
                                <div className="text-sm text-gray-600">
                                  招待者: {invitation.invitedBy}
                                </div>
                              </div>
                              <button className="text-red-600 hover:text-red-800">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {settingsTab === "permissions" && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        権限設定
                      </h3>
                      <div className="space-y-4">
                        <div className="p-3 border rounded">
                          <h4 className="font-medium text-gray-900">管理者</h4>
                          <p className="text-sm text-gray-600">
                            メンバー招待、チーム設定変更、コンテンツ管理
                          </p>
                        </div>
                        <div className="p-3 border rounded">
                          <h4 className="font-medium text-gray-900">
                            メンバー
                          </h4>
                          <p className="text-sm text-gray-600">
                            メモ・タスクの作成・編集・削除
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {settingsTab === "general" && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        チーム基本設定
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            チーム名
                          </label>
                          <input
                            type="text"
                            defaultValue={mockTeamData.name}
                            className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            チーム説明
                          </label>
                          <textarea
                            defaultValue={mockTeamData.description}
                            rows={3}
                            className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
                          設定を保存
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="text-center">
                <a
                  href="/"
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  個人用ワークスペースに戻る
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default WelcomeScreen;
