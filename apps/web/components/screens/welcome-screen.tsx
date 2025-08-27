'use client'

import MemoIcon from '@/components/icons/memo-icon'
import TaskIcon from '@/components/icons/task-icon'
import { ArrowLeft, Mail, Users, Shield, Settings, Trash2 } from 'lucide-react'
import { useState } from 'react'

interface WelcomeScreenProps {
  teamMode?: boolean
  teamName?: string
}

function WelcomeScreen({ teamMode = false, teamName = "開発チーム" }: WelcomeScreenProps) {
  const [currentView, setCurrentView] = useState<"home" | "invite" | "settings">("home")
  const [settingsTab, setSettingsTab] = useState<"members" | "invitations" | "permissions" | "general">("members")
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<"member" | "admin">("member")

  // モックデータ
  const mockTeamData = {
    id: 1,
    name: teamName,
    description: "メインプロダクト開発チーム",
    members: [
      { id: 1, name: "田中太郎", email: "tanaka@example.com", role: "admin", joinedAt: "2024-01-01" },
      { id: 2, name: "佐藤花子", email: "sato@example.com", role: "admin", joinedAt: "2024-01-15" },
      { id: 3, name: "鈴木次郎", email: "suzuki@example.com", role: "member", joinedAt: "2024-02-01" }
    ],
    invitations: [
      { id: 1, email: "yamada@example.com", role: "member", invitedBy: "田中太郎", createdAt: "2024-03-01", status: "pending" }
    ]
  }

  const handleInvite = () => {
    if (!inviteEmail.trim()) return
    // TODO: API呼び出し
    alert(`${inviteEmail} に招待メールを送信しました`)
    setInviteEmail("")
    setCurrentView("home")
  }
  return (
    <div className={`h-full bg-gray-50 ${teamMode ? 'pt-3 pl-5 pr-5 overflow-auto' : 'flex flex-col items-center justify-center px-8'}`}>
      <div className={`w-full ${teamMode ? 'space-y-6 max-w-none' : 'space-y-8 max-w-lg text-center'}`}>
        <div className="space-y-4">
          {teamMode ? (
            <div className="mb-4">
              <h1 className="text-[22px] font-bold text-gray-800">{teamName}</h1>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-center space-x-4 mb-6">
                <div className="flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full">
                  <MemoIcon className="w-8 h-8 text-blue-600" />
                </div>
                <div className="flex items-center justify-center w-16 h-16 bg-green-100 rounded-full">
                  <TaskIcon className="w-8 h-8 text-green-600" />
                </div>
              </div>
              <h1 className="text-3xl font-bold text-gray-900">
                ようこそ！
              </h1>
              <h2 className="text-xl font-semibold text-gray-800">
                メモ＆タスク管理アプリへようこそ
              </h2>
              <p className="text-gray-600 leading-relaxed">
                左側からメモを選択するか、新規追加ボタンでメモやタスクを作成してください
              </p>
            </>
          )}
        </div>
        
        
        {!teamMode && (
          <div className="border-t border-gray-200 pt-6">
            <div className="space-y-3">
              <p className="text-sm text-gray-500">
                チームでメモやタスクを共有したい場合は
              </p>
              <a 
                href="/team"
                className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                チーム用ワークスペースを開く
              </a>
            </div>
          </div>
        )}

        {teamMode && currentView === "home" && (
          <div className="space-y-4">
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
              <a href="/" className="text-sm text-gray-500 hover:text-gray-700">
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
                <h1 className="text-[22px] font-bold text-gray-800">メンバー招待</h1>
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
                    onChange={(e) => setInviteRole(e.target.value as "member" | "admin")}
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
              <a href="/" className="text-sm text-gray-500 hover:text-gray-700">
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
                  <h1 className="text-[22px] font-bold text-gray-800">チーム設定</h1>
                </div>
              </div>

              {/* タブナビゲーション */}
              <div className="border-b border-gray-200">
                <nav className="flex space-x-6 px-4">
                  {[
                    { id: "members", label: "メンバー", icon: <Users className="w-4 h-4" /> },
                    { id: "invitations", label: "招待管理", icon: <Mail className="w-4 h-4" /> },
                    { id: "permissions", label: "権限設定", icon: <Shield className="w-4 h-4" /> },
                    { id: "general", label: "基本設定", icon: <Settings className="w-4 h-4" /> }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setSettingsTab(tab.id as typeof settingsTab)}
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
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">メンバー一覧</h3>
                    <div className="space-y-2">
                      {mockTeamData.members.map((member) => (
                        <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                          <div>
                            <div className="font-medium text-gray-900">{member.name}</div>
                            <div className="text-sm text-gray-600">{member.email}</div>
                          </div>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            member.role === "admin" ? "bg-blue-100 text-blue-800" :
                            "bg-gray-100 text-gray-800"
                          }`}>
                            {member.role === "admin" ? "管理者" : "メンバー"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {settingsTab === "invitations" && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">保留中の招待</h3>
                    {mockTeamData.invitations.length === 0 ? (
                      <p className="text-gray-500 text-sm">保留中の招待はありません</p>
                    ) : (
                      <div className="space-y-2">
                        {mockTeamData.invitations.map((invitation) => (
                          <div key={invitation.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                            <div>
                              <div className="font-medium text-gray-900">{invitation.email}</div>
                              <div className="text-sm text-gray-600">招待者: {invitation.invitedBy}</div>
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
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">権限設定</h3>
                    <div className="space-y-4">
                      <div className="p-3 border rounded">
                        <h4 className="font-medium text-gray-900">管理者</h4>
                        <p className="text-sm text-gray-600">メンバー招待、チーム設定変更、コンテンツ管理</p>
                      </div>
                      <div className="p-3 border rounded">
                        <h4 className="font-medium text-gray-900">メンバー</h4>
                        <p className="text-sm text-gray-600">メモ・タスクの作成・編集・削除</p>
                      </div>
                    </div>
                  </div>
                )}

                {settingsTab === "general" && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">チーム基本設定</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">チーム名</label>
                        <input
                          type="text"
                          defaultValue={mockTeamData.name}
                          className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">チーム説明</label>
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
              <a href="/" className="text-sm text-gray-500 hover:text-gray-700">
                個人用ワークスペースに戻る
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default WelcomeScreen