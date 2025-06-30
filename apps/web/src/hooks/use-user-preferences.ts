import { useState, useEffect, useCallback } from 'react';

export interface UserPreferences {
  userId: number;
  memoColumnCount: number;
  taskColumnCount: number;
  memoViewMode: 'card' | 'list';
  taskViewMode: 'card' | 'list';
  memoHideControls: boolean;
  taskHideControls: boolean;
  createdAt: number;
  updatedAt: number;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8794';

export function useUserPreferences(userId: number = 1) {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ユーザー設定を取得
  const fetchPreferences = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch(`${API_BASE}/user-preferences/${userId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch user preferences');
      }
      
      const data = await response.json();
      setPreferences(data);
    } catch (err) {
      console.error('Error fetching user preferences:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      // エラー時はデフォルト値を設定
      setPreferences({
        userId,
        memoColumnCount: 4,
        taskColumnCount: 2,
        memoViewMode: 'list',
        taskViewMode: 'list',
        memoHideControls: false,
        taskHideControls: false,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // ユーザー設定を更新
  const updatePreferences = async (updates: Partial<Pick<UserPreferences, 'memoColumnCount' | 'taskColumnCount' | 'memoViewMode' | 'taskViewMode' | 'memoHideControls' | 'taskHideControls'>>) => {
    try {
      setError(null);
      const response = await fetch(`${API_BASE}/user-preferences/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Failed to update user preferences');
      }

      const updatedData = await response.json();
      setPreferences(updatedData);
      return updatedData;
    } catch (err) {
      console.error('Error updating user preferences:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    }
  };

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  return {
    preferences,
    isLoading,
    error,
    updatePreferences,
    refetch: fetchPreferences,
  };
}