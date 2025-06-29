'use client'

import CheckIcon from '@/components/icons/check-icon'
import TrashIcon from '@/components/icons/trash-icon'
import { useCreateTask } from '@/src/hooks/use-tasks'
import { useEffect, useState, useCallback } from 'react'

interface TaskCreatorProps {
  onClose: () => void
}

function TaskCreator({ onClose }: TaskCreatorProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<'todo' | 'in_progress' | 'completed'>('todo')
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [dueDate, setDueDate] = useState<string>('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedSuccessfully, setSavedSuccessfully] = useState(false)
  const [createdTaskId, setCreatedTaskId] = useState<number | null>(null)
  const createTask = useCreateTask()

  // 手動保存処理
  const handleSave = useCallback(async () => {
    if (!title.trim()) return

    setIsSaving(true)
    setError(null)
    setSavedSuccessfully(false)
    try {
      const taskData = {
        title: title.trim(),
        description: description.trim() || undefined,
        status,
        priority,
        dueDate: dueDate ? Math.floor(new Date(dueDate).getTime() / 1000) : undefined,
      }

      // 新規タスクの作成
      const result = await createTask.mutateAsync(taskData)
      // 作成されたタスクのIDを保存
      setCreatedTaskId(result.id)
      setSavedSuccessfully(true)
      
      // 保存成功後、少し待ってから閉じる
      setTimeout(() => {
        onClose()
      }, 1000)
    } catch (error) {
      console.error('保存に失敗しました:', error)
      setError('保存に失敗しました。APIサーバーが起動していることを確認してください。')
    } finally {
      setIsSaving(false)
    }
  }, [title, description, status, priority, dueDate, createTask, onClose])

  // 入力時は保存成功状態をリセット
  useEffect(() => {
    if (savedSuccessfully) {
      setSavedSuccessfully(false)
    }
  }, [title, description, status, priority, dueDate, savedSuccessfully])

  const statusOptions = [
    { value: 'todo', label: '未着手', color: 'bg-gray-100 text-gray-800' },
    { value: 'in_progress', label: '進行中', color: 'bg-blue-100 text-blue-800' },
    { value: 'completed', label: '完了', color: 'bg-green-100 text-green-800' },
  ]

  const priorityOptions = [
    { value: 'low', label: '低', color: 'bg-green-100 text-green-800' },
    { value: 'medium', label: '中', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'high', label: '高', color: 'bg-red-100 text-red-800' },
  ]

  return (
    <div className="flex flex-col h-full bg-white p-6">
      <div className="flex justify-end items-center mb-4">
        <div className="flex items-center gap-3">
          {isSaving && (
            <span className="text-sm text-gray-500">保存中...</span>
          )}
          {savedSuccessfully && (
            <span className="text-sm text-green-600">保存しました</span>
          )}
          {error && (
            <span className="text-sm text-red-500">エラー</span>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4 flex-1">
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="タスクタイトルを入力..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="flex-1 text-lg font-medium border-b border-Green outline-none pb-2 focus:border-Green"
            autoFocus
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ステータス
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as 'todo' | 'in_progress' | 'completed')}
              className="w-full p-2 border border-gray-300 rounded-lg focus:border-blue-500 outline-none"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              優先度
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as 'low' | 'medium' | 'high')}
              className="w-full p-2 border border-gray-300 rounded-lg focus:border-blue-500 outline-none"
            >
              {priorityOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              期限日
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:border-blue-500 outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            説明
          </label>
          <textarea
            placeholder="タスクの詳細を入力..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full h-32 p-3 border border-gray-300 rounded-lg resize-none outline-none text-gray-700 leading-relaxed focus:border-blue-500"
          />
        </div>

        <div className="flex justify-start">
          <button
            onClick={handleSave}
            disabled={!title.trim() || isSaving}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors ${
              !title.trim() || isSaving
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                保存中...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                保存
              </>
            )}
          </button>
        </div>
      </div>

      {/* 右下の閉じるボタン */}
      <button
        onClick={onClose}
        className="fixed bottom-6 right-6 bg-gray-500 hover:bg-gray-600 text-white p-3 rounded-full shadow-lg transition-colors"
      >
        <TrashIcon />
      </button>
    </div>
  )
}

export default TaskCreator