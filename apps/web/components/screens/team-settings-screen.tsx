"use client";

import { Users, Mail, Settings, Shield, Trash2 } from "lucide-react";
import { useState } from "react";

type TeamSettingsTab = "members" | "invitations" | "permissions" | "general";

interface TeamSettingsScreenProps {
  teamId: number;
}

// モックデータ（後でAPIから取得）
const mockTeamData = {
  id: 1,
  name: "開発チーム",
  description: "メインプロダクト開発チーム",
  members: [
    {
      id: 1,
      name: "田中太郎",
      email: "tanaka@example.com",
      role: "owner",
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

function TeamSettingsScreen({ teamId: _teamId }: TeamSettingsScreenProps) {
  const [activeTab, setActiveTab] = useState<TeamSettingsTab>("members");
  const [teamName, setTeamName] = useState(mockTeamData.name);
  const [teamDescription, setTeamDescription] = useState(
    mockTeamData.description,
  );
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"member" | "admin">("member");

  const tabItems = [
    {
      id: "members" as const,
      label: "メンバー",
      icon: <Users className="w-4 h-4" />,
    },
    {
      id: "invitations" as const,
      label: "招待管理",
      icon: <Mail className="w-4 h-4" />,
    },
    {
      id: "permissions" as const,
      label: "権限設定",
      icon: <Shield className="w-4 h-4" />,
    },
    {
      id: "general" as const,
      label: "基本設定",
      icon: <Settings className="w-4 h-4" />,
    },
  ];

  const handleInviteMember = () => {
    if (!inviteEmail.trim()) return;
    // TODO: API呼び出し
    alert(`${inviteEmail} に招待メールを送信しました`);
    setInviteEmail("");
  };

  const handleSaveTeamSettings = () => {
    // TODO: API呼び出し
    alert("チーム設定を保存しました");
  };

  return (
    <div className="bg-white flex flex-col overflow-hidden h-full">
      {/* ヘッダー */}
      <div className="border-b border-gray-200 px-5 py-3">
        <div className="flex items-center gap-2">
          <Settings className="w-6 h-6 text-gray-600" />
          <h1 className="text-[22px] font-bold text-gray-800">チーム設定</h1>
          <span className="text-sm text-gray-600 ml-4">
            {mockTeamData.name}
          </span>
        </div>
      </div>

      {/* タブナビゲーション */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-5">
          {tabItems.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                activeTab === tab.id
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
      <div className="flex-1 overflow-auto p-5">
        {/* メンバー管理タブ */}
        {activeTab === "members" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                メンバー一覧
              </h2>
              <div className="bg-white border border-gray-200 rounded-lg">
                <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                  <div className="grid grid-cols-4 gap-4 text-sm font-medium text-gray-700">
                    <div>名前</div>
                    <div>メールアドレス</div>
                    <div>権限</div>
                    <div>参加日</div>
                  </div>
                </div>
                <div className="divide-y divide-gray-200">
                  {mockTeamData.members.map((member) => (
                    <div key={member.id} className="px-4 py-3">
                      <div className="grid grid-cols-4 gap-4 items-center">
                        <div className="text-sm text-gray-900">
                          {member.name}
                        </div>
                        <div className="text-sm text-gray-600">
                          {member.email}
                        </div>
                        <div>
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              member.role === "owner"
                                ? "bg-purple-100 text-purple-800"
                                : member.role === "admin"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {member.role === "owner"
                              ? "オーナー"
                              : member.role === "admin"
                                ? "管理者"
                                : "メンバー"}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600">
                          {member.joinedAt}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 招待管理タブ */}
        {activeTab === "invitations" && (
          <div className="space-y-6">
            {/* 新規招待フォーム */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                新しいメンバーを招待
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
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
              </div>
              <button
                onClick={handleInviteMember}
                className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                招待メールを送信
              </button>
            </div>

            {/* 保留中の招待一覧 */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                保留中の招待
              </h3>
              {mockTeamData.invitations.length === 0 ? (
                <p className="text-gray-500 text-sm">
                  保留中の招待はありません
                </p>
              ) : (
                <div className="bg-white border border-gray-200 rounded-lg">
                  <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                    <div className="grid grid-cols-5 gap-4 text-sm font-medium text-gray-700">
                      <div>メールアドレス</div>
                      <div>権限</div>
                      <div>招待者</div>
                      <div>送信日</div>
                      <div>操作</div>
                    </div>
                  </div>
                  <div className="divide-y divide-gray-200">
                    {mockTeamData.invitations.map((invitation) => (
                      <div key={invitation.id} className="px-4 py-3">
                        <div className="grid grid-cols-5 gap-4 items-center">
                          <div className="text-sm text-gray-900">
                            {invitation.email}
                          </div>
                          <div>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              {invitation.role === "admin"
                                ? "管理者"
                                : "メンバー"}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600">
                            {invitation.invitedBy}
                          </div>
                          <div className="text-sm text-gray-600">
                            {invitation.createdAt}
                          </div>
                          <div>
                            <button className="text-red-600 hover:text-red-800 text-sm">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 権限設定タブ */}
        {activeTab === "permissions" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                権限設定
              </h2>
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium text-gray-900">オーナー</h3>
                    <p className="text-sm text-gray-600">
                      チームの完全な管理権限
                    </p>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">管理者</h3>
                    <p className="text-sm text-gray-600">
                      メンバー招待、コンテンツ管理
                    </p>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">メンバー</h3>
                    <p className="text-sm text-gray-600">
                      メモ・タスクの閲覧・編集
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 基本設定タブ */}
        {activeTab === "general" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                チーム基本設定
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    チーム名
                  </label>
                  <input
                    type="text"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    チーム説明
                  </label>
                  <textarea
                    value={teamDescription}
                    onChange={(e) => setTeamDescription(e.target.value)}
                    rows={3}
                    className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <button
                  onClick={handleSaveTeamSettings}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  設定を保存
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default TeamSettingsScreen;
