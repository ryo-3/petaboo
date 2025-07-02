import { useEffect, useRef, useState, useCallback } from 'react'
import type { Memo } from '@/src/types/memo'
import { useApiConnection } from '@/src/hooks/use-api-connection'
import { useCreateNote, useUpdateNote } from '@/src/hooks/use-notes'

interface UseMemoFormOptions {
  memo?: Memo | null
  onMemoAdd?: (memo: Memo) => void
  onMemoUpdate?: (id: number, updates: Partial<Memo>) => void
  onMemoIdUpdate?: (oldId: number, newId: number) => void
}

export function useMemoForm({ memo = null, onMemoAdd, onMemoUpdate, onMemoIdUpdate }: UseMemoFormOptions = {}) {
  const [title, setTitle] = useState(() => memo?.title || '')
  const [content, setContent] = useState(() => memo?.content || '')
  const [savedSuccessfully, setSavedSuccessfully] = useState(false)
  
  // シンプルなID管理
  const [tempId] = useState(() => `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`)
  const [realId, setRealId] = useState<number | null>(() => {
    const initialRealId = memo?.id || null;
    console.log('🔍 初期realId:', { memo: !!memo, memoId: memo?.id, initialRealId });
    return initialRealId;
  })
  const [hasAddedToList, setHasAddedToList] = useState(Boolean(memo)) // 既存メモまたはリストに追加済みか
  const hasCreatedAPIRef = useRef(Boolean(memo && memo.id > 0)) // API作成済みか
  const [tempListId, setTempListId] = useState<number | null>(null) // リストに追加した一時ID
  const tempListIdRef = useRef<number | null>(null) // 同期的にアクセス可能な一時ID
  const [hasUserEdited, setHasUserEdited] = useState(false)
  const [lastEditedAt, setLastEditedAt] = useState<number>(0)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const stateUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // オンライン/オフライン状態取得
  const { isOnline } = useApiConnection()
  
  // API操作フック
  const createNote = useCreateNote()
  const updateNote = useUpdateNote()
  
  // 保存状態管理
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [hasCreatedAPI, setHasCreatedAPI] = useState(Boolean(memo && memo.id > 0)) // API作成済みフラグ
  
  const isEditMode = Boolean(memo)

  // memoが変更された時にstateを更新（新しいメモに切り替わった場合）
  useEffect(() => {
    if (memo && memo.id !== realId) {
      setTitle(memo.title || '')
      setContent(memo.content || '')
      setRealId(memo.id)
      setHasUserEdited(false)
      setHasAddedToList(true) // 既存メモなのでリスト追加済み
    }
  }, [memo, realId])

  // オンライン時のState更新 + 裏側API送信
  const updateMemoState = useCallback(async (newTitle: string, newContent: string) => {
    if (!isOnline) return

    const memoData = {
      title: newTitle.trim(),
      content: newContent.trim(),
      updatedAt: Math.floor(Date.now() / 1000)
    }

    // 1. 即座にState更新
    console.log('🔍 分岐チェック:', { realId, hasAddedToList, hasCreatedAPI, memo: !!memo });
    if (realId && hasAddedToList) {
      // 既存メモまたは作成済みメモの更新（State側のみ）
      console.log('🔄 既存メモ更新 (State側のみ):', realId, memoData);
      onMemoUpdate?.(realId, memoData)
    } else if (!hasAddedToList) {
      // 新規作成時は一回だけリストに追加
      const currentTempId = -Date.now() // 負の一時ID
      const tempMemo: Memo = {
        id: currentTempId,
        title: memoData.title || "無題",
        content: memoData.content,
        createdAt: memoData.updatedAt,
        updatedAt: memoData.updatedAt
      }
      onMemoAdd?.(tempMemo)
      setHasAddedToList(true) // 追加済みフラグをセット
      setTempListId(tempMemo.id) // リストに実際に追加されるIDを記録
      tempListIdRef.current = tempMemo.id // 同期的にアクセス可能
      setRealId(tempMemo.id) // realIdも一時IDに設定
      console.log('📝 新規メモをリストに追加 一時ID:', tempMemo.id, 'タイトル:', tempMemo.title)
    }

    // 2. 裏側でAPI送信
    try {
      if (!hasCreatedAPI && hasAddedToList && realId && realId < 0) {
        // 新規メモの作成（一回限り、バックグラウンドで実行）
        console.log('🆕 バックグラウンドAPI作成実行');
        setHasCreatedAPI(true) // 即座にフラグを設定して重複を防ぐ
        const createdMemo = await createNote.mutateAsync({
          title: memoData.title,
          content: memoData.content || undefined
        })
        console.log('✅ バックグラウンドAPI作成完了:', createdMemo.id)
        // 本当のIDに更新 + State側も更新
        setRealId(createdMemo.id)
        if (onMemoIdUpdate && realId) {
          onMemoIdUpdate(realId, createdMemo.id)
        }
      } else if (hasCreatedAPI && realId && realId > 0) {
        // 既存メモの更新API呼び出し（API作成済みかつ正の値のIDのみ）
        console.log('🔄 既存メモAPI更新実行:', realId);
        await updateNote.mutateAsync({
          id: realId,
          data: {
            title: memoData.title,
            content: memoData.content || undefined
          }
        })
        console.log('✅ 既存メモAPI更新完了:', realId)
      } else if (hasAddedToList && realId && realId < 0) {
        // 負のIDの場合：まだAPI作成されていないため、作成待ち状態
        console.log('⏳ 負のID、API作成待ち:', realId);
      }

      setSavedSuccessfully(true)
      setSaveError(null)
      setHasUserEdited(false) // 保存後は編集フラグをリセット
      console.log('✅ State保存成功:', memoData.title || '(無題)')
      
      // 成功表示を3秒後にクリア
      setTimeout(() => setSavedSuccessfully(false), 3000)
      
    } catch (error) {
      console.error('❌ API保存失敗:', error)
      setSaveError('保存に失敗しました')
    }
  }, [isOnline, realId, hasAddedToList, hasCreatedAPI, memo, tempListId, onMemoAdd, onMemoUpdate, onMemoIdUpdate, createNote, updateNote])

  // オフライン時の保存処理
  const saveOffline = useCallback(() => {
    if (isOnline) return

    const memoData = {
      title: title.trim(),
      content: content.trim(),
      id: memo?.id || tempId,
      lastModified: Date.now(),
      lastEditedAt: Math.floor(Date.now() / 1000),
      isEditing: true
    }
    
    // ローカルストレージに保存
    const currentKey = `memo_draft_${memoData.id}`
    localStorage.setItem(currentKey, JSON.stringify(memoData))
    console.log('🔵 ローカル保存:', memoData.title || '(無題)', currentKey)
  }, [isOnline, title, content, memo, tempId])

  // 1秒デバウンス保存
  useEffect(() => {
    if (hasUserEdited && (title.trim() || content.trim()) && !isSaving) {
      setSavedSuccessfully(false)
      setSaveError(null)
      
      // 1秒後に保存実行
      const saveTimer = setTimeout(() => {
        if (isOnline) {
          updateMemoState(title, content)
        } else {
          saveOffline()
        }
      }, 1000)

      return () => clearTimeout(saveTimer)
    }
  }, [title, content, hasUserEdited, isSaving, isOnline, updateMemoState, saveOffline])

  // 0.05秒デバウンスでState更新
  const updateStateWithDebounce = useCallback((newTitle: string, newContent: string) => {
    if (stateUpdateTimeoutRef.current) {
      clearTimeout(stateUpdateTimeoutRef.current)
    }
    stateUpdateTimeoutRef.current = setTimeout(() => {
      if (isOnline && realId && onMemoUpdate) {
        onMemoUpdate(realId, {
          title: newTitle.trim(),
          content: newContent.trim(),
          updatedAt: Math.floor(Date.now() / 1000)
        })
        // console.log('⚡ 0.05秒State更新:', realId, newTitle.trim())
      }
    }, 50)
  }, [isOnline, realId, onMemoUpdate])

  // タイトル変更ハンドラー
  const handleTitleChange = useCallback((newTitle: string) => {
    setTitle(newTitle)
    setHasUserEdited(true)
    setLastEditedAt(Math.floor(Date.now() / 1000))
    
    // 0.05秒でState更新（編集時のみ）
    if (realId) {
      updateStateWithDebounce(newTitle, content)
    }
  }, [realId, content, updateStateWithDebounce])

  // コンテンツ変更ハンドラー
  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent)
    setHasUserEdited(true)
    setLastEditedAt(Math.floor(Date.now() / 1000))
    
    // 0.05秒でState更新（編集時のみ）
    if (realId) {
      updateStateWithDebounce(title, newContent)
    }
  }, [realId, title, updateStateWithDebounce])

  // 手動保存
  const handleSave = useCallback(async () => {
    if (!title.trim() && !content.trim()) return

    setIsSaving(true)
    setSaveError(null)

    try {
      if (isOnline) {
        await updateMemoState(title, content)
      } else {
        saveOffline()
      }
      setHasUserEdited(false)
    } catch (error) {
      console.error('保存エラー:', error)
      setSaveError('保存に失敗しました')
    } finally {
      setIsSaving(false)
    }
  }, [title, content, isOnline, updateMemoState, saveOffline])

  // クリーンアップ
  useEffect(() => {
    const currentTimeout = timeoutRef.current
    const currentStateTimeout = stateUpdateTimeoutRef.current
    return () => {
      if (currentTimeout) {
        clearTimeout(currentTimeout)
      }
      if (currentStateTimeout) {
        clearTimeout(currentStateTimeout)
      }
    }
  }, [])

  return {
    title,
    content,
    savedSuccessfully,
    isSaving,
    saveError,
    hasUserEdited,
    lastEditedAt,
    tempId,
    realId,
    isEditMode,
    handleTitleChange,
    handleContentChange,
    handleSave,
    setTitle,
    setContent
  }
}