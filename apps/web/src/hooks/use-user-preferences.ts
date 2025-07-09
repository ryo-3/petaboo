import { useUserPreferencesContext } from '@/src/contexts/user-preferences-context';

// 型定義をコンテキストからエクスポート
export type { UserPreferences } from '@/src/contexts/user-preferences-context';

/**
 * ユーザー設定を取得・更新するフック
 * 内部的にUserPreferencesContextを使用してグローバルな設定状態を管理
 * 
 * @param _userId - 現在は使用されません（コンテキストで管理）
 * @returns 設定データと操作関数
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useUserPreferences(_userId?: number) {
  const context = useUserPreferencesContext();
  
  return {
    preferences: context.preferences,
    isLoading: context.loading,
    error: context.error,
    updatePreferences: context.updatePreferences,
    refetch: context.refreshPreferences,
  };
}