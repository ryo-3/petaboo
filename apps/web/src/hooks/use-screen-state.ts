import { useState, useEffect } from 'react'
// UserPreferences型を直接定義（一時的）
type UserPreferences = {
  memoViewMode?: 'card' | 'list'
  memoColumnCount?: number
  taskViewMode?: 'card' | 'list'
  taskColumnCount?: number
}

interface UseScreenStateConfig {
  type: 'memo' | 'task'
  defaultActiveTab: string
  defaultColumnCount: number
}

interface ScreenStateReturn<T extends string> {
  // Screen mode
  screenMode: T
  setScreenMode: (mode: T) => void
  
  // Tab state
  activeTab: string
  setActiveTab: (tab: string) => void
  
  // View settings
  viewMode: 'card' | 'list'
  setViewMode: (mode: 'card' | 'list') => void
  columnCount: number
  setColumnCount: (count: number) => void
  
  // Selection state
  checkedItems: Set<number>
  setCheckedItems: (items: Set<number>) => void
  checkedDeletedItems: Set<number>
  setCheckedDeletedItems: (items: Set<number>) => void
  
  // Computed values
  effectiveColumnCount: number
}

export function useScreenState<T extends string>(
  config: UseScreenStateConfig,
  initialScreenMode: T,
  selectedItem?: any,
  selectedDeletedItem?: any,
  preferences?: UserPreferences
): ScreenStateReturn<T> {
  // Basic state
  const [screenMode, setScreenMode] = useState<T>(initialScreenMode)
  const [activeTab, setActiveTab] = useState(config.defaultActiveTab)
  const [viewMode, setViewMode] = useState<'card' | 'list'>('list')
  const [columnCount, setColumnCount] = useState(config.defaultColumnCount)
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set())
  const [checkedDeletedItems, setCheckedDeletedItems] = useState<Set<number>>(new Set())

  // 設定値が変更されたらローカル状態を更新
  useEffect(() => {
    if (preferences) {
      const viewModeKey = `${config.type}ViewMode` as keyof UserPreferences
      const columnCountKey = `${config.type}ColumnCount` as keyof UserPreferences
      
      const newViewMode = (preferences[viewModeKey] as 'card' | 'list') || 'list'
      const newColumnCount = (preferences[columnCountKey] as number) || config.defaultColumnCount
      
      setViewMode(newViewMode)
      setColumnCount(newColumnCount)
    }
  }, [preferences, config.type, config.defaultColumnCount])

  // アイテムが選択されている場合は表示モードに
  useEffect(() => {
    if ((selectedItem || selectedDeletedItem) && screenMode === 'list' as T) {
      setScreenMode('view' as T)
    }
  }, [selectedItem, selectedDeletedItem, screenMode])

  // 右側パネル表示時は列数を調整
  const effectiveColumnCount =
    screenMode !== ('list' as T)
      ? columnCount <= 2
        ? columnCount
        : 2
      : columnCount

  return {
    screenMode,
    setScreenMode,
    activeTab,
    setActiveTab,
    viewMode,
    setViewMode,
    columnCount,
    setColumnCount,
    checkedItems,
    setCheckedItems,
    checkedDeletedItems,
    setCheckedDeletedItems,
    effectiveColumnCount
  }
}