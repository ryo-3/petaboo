'use client'

import { useState } from 'react'
import SwitchTabs from '@/components/ui/switch-tabs'
import MemoIcon from '@/components/icons/memo-icon'
import TaskIcon from '@/components/icons/task-icon'

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface WelcomeScreenProps {
}

function WelcomeScreen() {
  const [activeMode, setActiveMode] = useState<'memo' | 'task'>('memo')

  const tabs = [
    {
      id: 'memo',
      label: 'メモ',
      icon: <MemoIcon className="w-4 h-4" />
    },
    {
      id: 'task', 
      label: 'タスク',
      icon: <TaskIcon className="w-4 h-4" />
    }
  ]

  return (
    <div className="flex flex-col items-center justify-center h-full bg-gray-50 px-8">
      <div className="max-w-md w-full text-center space-y-8">
        {/* モード切り替えタブ */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            ようこそ！
          </h1>
          <SwitchTabs 
            tabs={tabs}
            activeTab={activeMode}
            onTabChange={(tabId) => setActiveMode(tabId as 'memo' | 'task')}
          />
        </div>

        {/* メモモード */}
        {activeMode === 'memo' && (
          <div className="space-y-4">
            <div className="flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mx-auto mb-4">
              <MemoIcon className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-800">
              メモを始めましょう
            </h2>
            <p className="text-gray-600 leading-relaxed">
              左側からメモを選択するか、新規追加ボタンでメモを作成してください
            </p>
          </div>
        )}

        {/* タスクモード */}
        {activeMode === 'task' && (
          <div className="space-y-4">
            <div className="flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mx-auto mb-4">
              <TaskIcon className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-800">
              タスク管理
            </h2>
            <p className="text-gray-600 leading-relaxed">
              左側からタスクを選択するか、新規追加でタスクを作成してください
            </p>
            <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-700 font-medium">
                タスク機能は準備中です
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default WelcomeScreen