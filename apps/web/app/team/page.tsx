'use client'

import MemoIcon from '@/components/icons/memo-icon'
import TaskIcon from '@/components/icons/task-icon'
import Link from 'next/link'

export default function TeamDashboard() {
  return (
    <div className="px-4 py-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          チーム用ダッシュボード
        </h2>
        <p className="text-gray-600">
          チームでメモやタスクを共有・管理できます
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* メモセクション */}
        <Link href="/team/memos">
          <div className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6 cursor-pointer border hover:border-blue-300">
            <div className="flex items-center mb-4">
              <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg">
                <MemoIcon className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="ml-3 text-lg font-medium text-gray-900">メモ</h3>
            </div>
            <p className="text-gray-600 text-sm">
              チームでメモを共有・編集
            </p>
            <div className="mt-4 text-blue-600 text-sm font-medium">
              メモ一覧を見る →
            </div>
          </div>
        </Link>

        {/* タスクセクション */}
        <Link href="/team/tasks">
          <div className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6 cursor-pointer border hover:border-green-300">
            <div className="flex items-center mb-4">
              <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-lg">
                <TaskIcon className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="ml-3 text-lg font-medium text-gray-900">タスク</h3>
            </div>
            <p className="text-gray-600 text-sm">
              チームでタスクを管理・進捗追跡
            </p>
            <div className="mt-4 text-green-600 text-sm font-medium">
              タスク一覧を見る →
            </div>
          </div>
        </Link>

        {/* プロジェクトセクション（将来用） */}
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200 opacity-60">
          <div className="flex items-center mb-4">
            <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-lg">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h3 className="ml-3 text-lg font-medium text-gray-500">プロジェクト</h3>
          </div>
          <p className="text-gray-400 text-sm">
            準備中...
          </p>
        </div>
      </div>
    </div>
  )
}