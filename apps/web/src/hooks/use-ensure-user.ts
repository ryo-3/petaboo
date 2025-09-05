import { useUser, useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:7594";

/**
 * ユーザーログイン時に自動でusersテーブルに登録するフック
 * セッション中に1回のみ実行される
 */
export function useEnsureUser() {
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();
  const [hasEnsured, setHasEnsured] = useState(false);

  useEffect(() => {
    const ensureUser = async () => {
      // 既に実行済み、またはユーザーが未ロードの場合はスキップ
      if (hasEnsured || !isLoaded || !user) {
        return;
      }

      // セッションストレージでセッション中の重複実行を防ぐ
      const sessionKey = `user-ensured-${user.id}`;
      if (sessionStorage.getItem(sessionKey)) {
        setHasEnsured(true);
        return;
      }

      try {
        // Clerkセッションからトークンを取得
        const token = await getToken();

        const response = await fetch(`${API_BASE_URL}/users/ensure-exists`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        });

        if (response.ok) {
          const data = await response.json();
          console.log("ユーザー存在確認完了:", data.message);

          // セッション中の重複実行を防ぐ
          sessionStorage.setItem(sessionKey, "true");
          setHasEnsured(true);
        } else {
          console.error("ユーザー存在確認に失敗しました:", response.status);
        }
      } catch (error) {
        console.error("ユーザー存在確認エラー:", error);
      }
    };

    ensureUser();
  }, [user, isLoaded, hasEnsured, getToken]);

  return {
    isEnsured: hasEnsured,
    user,
  };
}
