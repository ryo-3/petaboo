'use client'

import MemoIcon from '@/components/icons/memo-icon'
import TaskIcon from '@/components/icons/task-icon'

function WelcomeScreen() {
  return (
    <div className="flex flex-col items-center justify-center h-full bg-gray-50 px-8">
      <div className="max-w-lg w-full text-center space-y-8">
        <div className="space-y-4">
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
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center mb-2">
              <MemoIcon className="w-5 h-5 text-blue-600 mr-2" />
              <h3 className="font-medium text-gray-900">メモ機能</h3>
            </div>
            <p className="text-sm text-gray-600">
              アイデアや重要な情報を記録・整理
            </p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center mb-2">
              <TaskIcon className="w-5 h-5 text-green-600 mr-2" />
              <h3 className="font-medium text-gray-900">タスク機能</h3>
            </div>
            <p className="text-sm text-gray-600">
              やることリストの管理と進捗追跡
            </p>
          </div>
        </div>
        
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
      </div>
    </div>
  )
}

export default WelcomeScreen