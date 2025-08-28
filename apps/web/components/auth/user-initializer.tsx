"use client";

import { useEffect } from "react";
import { useAuth, useUser } from "@clerk/nextjs";

export function UserInitializer() {
  const { isSignedIn, user } = useUser();
  const { getToken } = useAuth();

  useEffect(() => {
    if (isSignedIn && user) {
      const initUser = async () => {
        try {
          const token = await getToken();
          
          // ユーザー情報を初期化（既存ユーザー対応）
          const response = await fetch("http://localhost:8794/users/me", {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          
          if (!response.ok) {
            const text = await response.text();
            console.error("API エラー:", response.status, text);
            return;
          }
          
          const data = await response.json();
          console.log("ユーザー初期化完了:", data);
        } catch (error) {
          console.error("ユーザー初期化エラー:", error);
        }
      };
      
      initUser();
    }
  }, [isSignedIn, user, getToken]);

  return null; // UIは描画しない
}