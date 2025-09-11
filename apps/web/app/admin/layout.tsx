"use client";

import React from "react";
import { Refine } from "@refinedev/core";
import { RefineKbar, RefineKbarProvider } from "@refinedev/kbar";
import { ThemedLayoutV2, useNotificationProvider } from "@refinedev/antd";
import routerProvider from "@refinedev/nextjs-router";
import dataProvider from "@refinedev/simple-rest";
import { App as AntdApp, ConfigProvider } from "antd";
import { useAuth } from "@clerk/nextjs";

import "@refinedev/antd/dist/reset.css";

// Ant Design警告を無効化
const originalWarn = console.warn;
const originalError = console.error;

console.warn = (message: any, ...args: any[]) => {
  if (
    typeof message === "string" &&
    message.includes("[antd: Menu] `children` is deprecated")
  ) {
    return;
  }
  originalWarn(message, ...args);
};

console.error = (message: any, ...args: any[]) => {
  if (
    typeof message === "string" &&
    (message.includes("[antd: Menu] `children` is deprecated") ||
      message.includes(
        "Instance created by `useForm` is not connected to any Form element",
      ) ||
      message.includes("[antd: compatible] antd v5 support React is 16 ~ 18") ||
      message.includes("[antd: Card] `bordered` is deprecated") ||
      message.includes("[antd: Drawer] `bodyStyle` is deprecated"))
  ) {
    return;
  }
  originalError(message, ...args);
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:7594";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMounted, setIsMounted] = React.useState(false);
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);

  // 標準的なsimple-restデータプロバイダー（カスタムヘッダーなし）
  const simpleDataProvider = React.useMemo(() => {
    return dataProvider(API_URL);
  }, []);

  // クライアントサイドでのマウント状態管理と認証チェック
  React.useEffect(() => {
    setIsMounted(true);
    // セッションストレージから認証状態を確認
    const authenticated =
      sessionStorage.getItem("admin_authenticated") === "true";
    setIsAuthenticated(authenticated);
  }, []);

  // SSR時やクライアントマウント前は何も表示しない
  if (!isMounted) {
    return null;
  }

  // 認証されていない場合はログインページにリダイレクト
  if (!isAuthenticated) {
    if (typeof window !== "undefined") {
      window.location.href = "/admin/login";
    }
    return null;
  }

  const handleLogout = () => {
    sessionStorage.removeItem("admin_authenticated");
    window.location.href = "/admin/login";
  };

  return (
    <RefineKbarProvider>
      <ConfigProvider>
        <AntdApp>
          <Refine
            routerProvider={routerProvider}
            dataProvider={simpleDataProvider}
            notificationProvider={useNotificationProvider}
            resources={[
              {
                name: "users",
                list: "/admin/users",
                show: "/admin/users/show/:id",
                edit: "/admin/users/edit/:id",
                meta: {
                  canDelete: false,
                },
              },
            ]}
            options={{
              syncWithLocation: true,
              warnWhenUnsavedChanges: true,
            }}
          >
            <ThemedLayoutV2
              Header={() => (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "0 24px",
                    height: "64px",
                    background: "#fff",
                    borderBottom: "1px solid #f0f0f0",
                  }}
                >
                  <h1 style={{ margin: 0 }}>管理画面</h1>
                  <button
                    onClick={handleLogout}
                    style={{
                      padding: "4px 12px",
                      border: "1px solid #d9d9d9",
                      borderRadius: "4px",
                      background: "#fff",
                      cursor: "pointer",
                    }}
                  >
                    ログアウト
                  </button>
                </div>
              )}
            >
              {children}
            </ThemedLayoutV2>
            <RefineKbar />
          </Refine>
        </AntdApp>
      </ConfigProvider>
    </RefineKbarProvider>
  );
}
