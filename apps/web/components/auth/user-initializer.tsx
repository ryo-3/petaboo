"use client";

import { useEffect } from "react";
import { useAuth, useUser } from "@clerk/nextjs";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:7594";

export function UserInitializer() {
  const { isSignedIn, user } = useUser();
  const { getToken } = useAuth();

  useEffect(() => {
    // 管理画面パスの場合はユーザー初期化をスキップ
    if (
      typeof window !== "undefined" &&
      window.location.pathname.startsWith("/admin")
    ) {
      console.log("Admin panel detected, skipping user initialization");
      return;
    }

    if (isSignedIn && user) {
      const initUser = async () => {
        try {
          const token = await getToken();

          // ログイン時にユーザー存在確認・作成
          console.log("UserInitializer: /users/ensure-existsを呼び出し中...");
          const response = await fetch(`${API_URL}/users/ensure-exists`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          });

          if (!response.ok) {
            const text = await response.text();
            console.error("API エラー:", response.status, text);
            return;
          }

          const result = await response.json();
          if (result.created) {
            console.log(`✅ 新規ユーザー作成: ${result.userId}`);
          } else {
            console.log(`🔄 既存ユーザー確認: ${result.userId}`);
          }
          console.log("UserInitializer完了:", result);
        } catch (error) {
          console.error("ユーザー初期化エラー:", error);
        }
      };

      initUser();
    }
  }, [isSignedIn, user, getToken]);

  return null; // UIは描画しない
}
