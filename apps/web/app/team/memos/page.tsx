'use client'

import { useState } from 'react'
import { PremiumPlanGuard } from "@/components/features/team/premium-plan-guard"

interface TeamMemo {
  id: string
  title: string
  content: string
  author: string
  createdAt: string
  updatedAt: string
  tags: string[]
}

export default function TeamMemosPage() {
  return (
    <PremiumPlanGuard>
      <TeamMemosContent />
    </PremiumPlanGuard>
  );
}

function TeamMemosContent() {
  const [memos] = useState<TeamMemo[]>([
    {
      id: '1',
      title: 'プロジェクト企画書',
      content: '新しいプロジェクトの企画内容について...',
      author: '田中',
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-01-15T15:30:00Z',
      tags: ['企画', '重要']
    },
    {
      id: '2', 
      title: '会議議事録 - 週次ミーティング',
      content: '今週の進捗確認と来週の予定について...',
      author: '佐藤',
      createdAt: '2024-01-14T09:00:00Z',
      updatedAt: '2024-01-14T09:45:00Z',
      tags: ['会議', '議事録']
    }
  ])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">チームメモ</h1>
          <p className="text-gray-600 mt-1">チーム内で共有されているメモ一覧</p>
        </div>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
          + 新しいメモ
        </button>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="divide-y divide-gray-200">
          {memos.map((memo) => (
            <div
              key={memo.id}
              className="p-6 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {memo.title}
                  </h3>
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                    {memo.content}
                  </p>
                  
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span>作成者: {memo.author}</span>
                    <span>作成日: {formatDate(memo.createdAt)}</span>
                    {memo.updatedAt !== memo.createdAt && (
                      <span>更新日: {formatDate(memo.updatedAt)}</span>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2 mt-3">
                    {memo.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div className="ml-4 flex-shrink-0">
                  <button className="text-gray-400 hover:text-gray-600">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {memos.length === 0 && (
        <div className="text-center py-12">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">メモがありません</h3>
          <p className="mt-1 text-sm text-gray-500">
            最初のチームメモを作成してみましょう
          </p>
        </div>
      )}
    </div>
  )
}