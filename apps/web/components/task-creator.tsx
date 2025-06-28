'use client'

import CheckIcon from '@/components/icons/check-icon'
import TrashIcon from '@/components/icons/trash-icon'
import { useCreateTask } from '@/src/hooks/use-tasks'
import { useEffect, useRef, useState, useCallback } from 'react'

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
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const createTask = useCreateTask()

  // 3秒後の自動保存処理
  const handleAutoSave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(async () => {
      if (title.trim() && !createdTaskId) {
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
          // 保存成功時は編集モードを継続（閉じない）
        } catch (error) {
          console.error('保存に失敗しました:', error)
          setError('保存に失敗しました。APIサーバーが起動していることを確認してください。')
        } finally {
          setIsSaving(false)
        }
      }
    }, 3000)
  }, [title, description, status, priority, dueDate, createdTaskId, createTask])

  // フィールドが変更されたら自動保存タイマーをリセット
  useEffect(() => {
    if (title.trim()) {
      setSavedSuccessfully(false) // 入力時は保存成功状態をリセット
      handleAutoSave()
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [title, description, status, priority, dueDate, handleAutoSave])

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
            className="flex-1 text-lg font-medium border-b border-gray-200 outline-none pb-2 focus:border-blue-500"
            autoFocus
          />
          {savedSuccessfully && !isSaving && (
            <CheckIcon className="w-5 h-5 text-green-600 flex-shrink-0" />
          )}
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

        <div className="text-xs text-gray-400 mt-auto">
          {error ? (
            <div className="text-red-500">{error}</div>
          ) : (
            '入力完了から3秒後に自動保存されます'
          )}
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