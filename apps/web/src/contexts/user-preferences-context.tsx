"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";

export interface UserPreferences {
  userId: number;
  memoColumnCount: number;
  taskColumnCount: number;
  memoViewMode: "card" | "list";
  taskViewMode: "card" | "list";
  memoHideControls: boolean;
  taskHideControls: boolean;
  hideHeader: boolean;
  createdAt: number;
  updatedAt: number;
}

interface UserPreferencesContextType {
  preferences: UserPreferences | null;
  loading: boolean;
  error: string | null;
  updatePreferences: (
    updates: Partial<
      Pick<
        UserPreferences,
        | "memoColumnCount"
        | "taskColumnCount"
        | "memoViewMode"
        | "taskViewMode"
        | "memoHideControls"
        | "taskHideControls"
        | "hideHeader"
      >
    >,
  ) => Promise<UserPreferences>;
  refreshPreferences: () => Promise<void>;
}

const UserPreferencesContext = createContext<UserPreferencesContextType | null>(
  null,
);

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:7594";

interface UserPreferencesProviderProps {
  children: ReactNode;
  userId?: number;
  initialPreferences?: UserPreferences | null;
}

export const UserPreferencesProvider: React.FC<
  UserPreferencesProviderProps
> = ({
  children,
  userId = 1, // デフォルトユーザーID
  initialPreferences = null,
}) => {
  const [preferences, setPreferences] = useState<UserPreferences | null>(
    initialPreferences,
  );
  const [loading, setLoading] = useState(!initialPreferences);
  const [error, setError] = useState<string | null>(null);

  // デフォルト設定値
  const getDefaultPreferences = useCallback(
    (): UserPreferences => ({
      userId,
      memoColumnCount: 4,
      taskColumnCount: 2,
      memoViewMode: "list",
      taskViewMode: "list",
      memoHideControls: false,
      taskHideControls: false,
      hideHeader: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }),
    [userId],
  );

  // ユーザー設定を取得（管理画面では常にデフォルト値を使用）
  const fetchPreferences = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // 管理画面では常にデフォルト設定を使用（APIコールなし）
      setPreferences(getDefaultPreferences());
    } catch (err) {
      console.warn("Error initializing user preferences:", err);
      setPreferences(getDefaultPreferences());
      setError(null);
    } finally {
      setLoading(false);
    }
  }, [getDefaultPreferences]);

  // ユーザー設定を更新
  const updatePreferences = useCallback(
    async (
      updates: Partial<
        Pick<
          UserPreferences,
          | "memoColumnCount"
          | "taskColumnCount"
          | "memoViewMode"
          | "taskViewMode"
          | "memoHideControls"
          | "taskHideControls"
          | "hideHeader"
        >
      >,
    ): Promise<UserPreferences> => {
      try {
        setError(null);

        // Admin Token取得
        const adminToken = process.env.NEXT_PUBLIC_ADMIN_TOKEN;
        const headers: HeadersInit = {
          "Content-Type": "application/json",
        };
        if (adminToken) {
          headers["x-admin-token"] = adminToken;
        }

        const response = await fetch(`${API_BASE}/user-preferences/${userId}`, {
          method: "PUT",
          headers,
          body: JSON.stringify(updates),
        });

        if (!response.ok) {
          throw new Error("Failed to update user preferences");
        }

        const updatedData = await response.json();
        setPreferences(updatedData);
        return updatedData;
      } catch (err) {
        console.error("Error updating user preferences:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
        throw err;
      }
    },
    [userId],
  );

  // 設定を再取得
  const refreshPreferences = useCallback(async () => {
    await fetchPreferences();
  }, [fetchPreferences]);

  // 初期化
  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  const contextValue: UserPreferencesContextType = {
    preferences,
    loading,
    error,
    updatePreferences,
    refreshPreferences,
  };

  return (
    <UserPreferencesContext.Provider value={contextValue}>
      {children}
    </UserPreferencesContext.Provider>
  );
};

// カスタムフック
export const useUserPreferencesContext = (): UserPreferencesContextType => {
  const context = useContext(UserPreferencesContext);
  if (!context) {
    throw new Error(
      "useUserPreferencesContext must be used within UserPreferencesProvider",
    );
  }
  return context;
};

export default UserPreferencesContext;
