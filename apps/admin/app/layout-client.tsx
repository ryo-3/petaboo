"use client";

import React from "react";
import { Refine } from "@refinedev/core";
import { ThemedLayoutV2, notificationProvider } from "@refinedev/antd";
import { RefineKbar, RefineKbarProvider } from "@refinedev/kbar";
import routerProvider from "@refinedev/nextjs-router";
import dataProvider from "@refinedev/simple-rest";
import { ConfigProvider } from "antd";
import "@refinedev/antd/dist/reset.css";

// 開発環境でのAnt Design警告を無効化
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  const originalError = console.error;
  const originalWarn = console.warn;
  
  console.error = (...args) => {
    const message = args[0]?.toString() || "";
    if (
      message.includes("[antd: Menu] `children` is deprecated") ||
      message.includes("[antd: Drawer] `bodyStyle` is deprecated") ||
      message.includes("Download the React DevTools")
    ) {
      return;
    }
    originalError.apply(console, args);
  };
  
  console.warn = (...args) => {
    const message = args[0]?.toString() || "";
    if (
      message.includes("[antd: Menu] `children` is deprecated") ||
      message.includes("[antd: Drawer] `bodyStyle` is deprecated") ||
      message.includes("antd v5 support React is 16 ~ 18")
    ) {
      return;
    }
    originalWarn.apply(console, args);
  };
}

const API_URL = "/api"; // プロキシ経由でAPIアクセス

export default function RootLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMounted, setIsMounted] = React.useState(false);
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
    const authenticated = sessionStorage.getItem("admin_authenticated") === "true";
    setIsAuthenticated(authenticated);
  }, []);

  if (!isMounted) {
    return <div>Loading...</div>;
  }

  // ログイン画面の場合は認証チェックをスキップ
  if (typeof window !== "undefined" && window.location.pathname === "/login") {
    return <>{children}</>;
  }

  // 認証されていない場合はログインページにリダイレクト
  if (!isAuthenticated) {
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    return <div>Redirecting...</div>;
  }

  return (
    <RefineKbarProvider>
      <ConfigProvider>
        <Refine
          routerProvider={routerProvider}
          dataProvider={dataProvider(API_URL)}
          notificationProvider={notificationProvider}
          resources={[
            {
              name: "users",
              list: "/users",
            },
          ]}
        >
          <ThemedLayoutV2>
            {children}
          </ThemedLayoutV2>
          <RefineKbar />
        </Refine>
      </ConfigProvider>
    </RefineKbarProvider>
  );
}