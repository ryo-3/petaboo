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
  if (typeof message === 'string' && message.includes('[antd: Menu] `children` is deprecated')) {
    return;
  }
  originalWarn(message, ...args);
};

console.error = (message: any, ...args: any[]) => {
  if (typeof message === 'string' && (
    message.includes('[antd: Menu] `children` is deprecated') ||
    message.includes('Instance created by `useForm` is not connected to any Form element') ||
    message.includes('[antd: compatible] antd v5 support React is 16 ~ 18') ||
    message.includes('[antd: Card] `bordered` is deprecated')
  )) {
    return;
  }
  originalError(message, ...args);
};

const API_URL = "http://localhost:8794";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { getToken, userId, isLoaded } = useAuth();
  const [isMounted, setIsMounted] = React.useState(false);
  
  // 管理者ユーザーIDのリストを環境変数から取得（常に呼び出し）
  const ADMIN_USER_IDS = React.useMemo(() => {
    const adminIds = process.env.NEXT_PUBLIC_ADMIN_USER_IDS;
    return adminIds ? adminIds.split(',').map(id => id.trim()) : [];
  }, []);
  
  // クライアントサイドでのマウント状態管理
  React.useEffect(() => {
    setIsMounted(true);
  }, []);
  
  // SSR時やクライアントマウント前は何も表示しない
  if (!isMounted || !isLoaded) {
    return null;
  }
  
  // ログインしていない場合はリダイレクト
  if (!userId) {
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
    return null;
  }
  
  // 管理者権限をチェック
  if (!ADMIN_USER_IDS.includes(userId)) {
    return (
      <div style={{ padding: 20, textAlign: 'center' }}>
        <h2>アクセス権限がありません</h2>
        <p>管理者権限が必要です。</p>
        <a href="/">ホームに戻る</a>
      </div>
    );
  }

  // カスタムデータプロバイダー
  const customDataProvider: any = {
    getApiUrl: () => API_URL,
    
    // ユーザー一覧（現在のユーザー情報のみ）
    getList: async (resource: string | { resource: string }) => {
      const token = await getToken();
      const resourceName = typeof resource === 'string' ? resource : resource.resource;
      
      if (resourceName === "users") {
        const response = await fetch(`${API_URL}/users/me`, {
          headers: {
            Authorization: token ? `Bearer ${token}` : "",
            "Content-Type": "application/json",
          },
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const userData = await response.json();
        return {
          data: [userData], // 単一ユーザーを配列として返す
          total: 1,
        };
      }
      
      if (resourceName === "teams") {
        const response = await fetch(`${API_URL}/teams`, {
          headers: {
            Authorization: token ? `Bearer ${token}` : "",
            "Content-Type": "application/json",
          },
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const teamsData = await response.json();
        return {
          data: teamsData.teams || [],
          total: teamsData.total || teamsData.teams?.length || 0,
        };
      }
      
      throw new Error(`Unknown resource: ${resourceName}`);
    },
    
    // 単一ユーザー取得
    getOne: async (resource: string | { resource: string }, id: string) => {
      const token = await getToken();
      const resourceName = typeof resource === 'string' ? resource : resource.resource;
      
      if (resourceName === "users") {
        const response = await fetch(`${API_URL}/users/me`, {
          headers: {
            Authorization: token ? `Bearer ${token}` : "",
            "Content-Type": "application/json",
          },
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const userData = await response.json();
        return { data: userData };
      }
      
      return { data: {} };
    },
    getMany: async () => ({ data: [] }),
    getManyReference: async () => ({ data: [], total: 0 }),
    create: async (resource: string | { resource: string }, params: any) => {
      const token = await getToken();
      const resourceName = typeof resource === 'string' ? resource : resource.resource;
      
      if (resourceName === "teams") {
        const response = await fetch(`${API_URL}/teams`, {
          method: "POST",
          headers: {
            Authorization: token ? `Bearer ${token}` : "",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(params),
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        return { data: result };
      }
      
      return { data: {} };
    },
    update: async (resource: string | { resource: string }, id: string, params: any) => {
      const token = await getToken();
      const resourceName = typeof resource === 'string' ? resource : resource.resource;
      
      if (resourceName === "users") {
        const response = await fetch(`${API_URL}/users/plan`, {
          method: "PATCH",
          headers: {
            Authorization: token ? `Bearer ${token}` : "",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(params),
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        return { data: result };
      }
      
      return { data: {} };
    },
    updateMany: async () => ({ data: [] }),
    deleteOne: async () => ({ data: {} }),
    deleteMany: async () => ({ data: [] }),
    
    // カスタムリクエスト用
    custom: async ({ url, method, payload, query, headers }: {
      url: string;
      method: string;
      payload?: any;
      query?: any;
      headers?: any;
    }) => {
      const token = await getToken();
      const requestHeaders = {
        ...headers,
        Authorization: token ? `Bearer ${token}` : "",
        "Content-Type": "application/json",
      };

      const response = await fetch(url, {
        method,
        headers: requestHeaders,
        body: payload ? JSON.stringify(payload) : undefined,
      });

      return {
        data: await response.json(),
        status: response.status,
      };
    },
  };

  return (
    <RefineKbarProvider>
      <ConfigProvider>
        <AntdApp>
          <Refine
            routerProvider={routerProvider}
            dataProvider={customDataProvider}
            notificationProvider={useNotificationProvider}
            resources={[
              {
                name: "users",
                list: "/admin/users",
                show: "/admin/users/show/:id",
                edit: "/admin/users/edit/:id",
                meta: {
                  canDelete: true,
                },
              },
              {
                name: "teams",
                list: "/admin/teams",
                create: "/admin/teams/create",
                edit: "/admin/teams/edit/:id",
                show: "/admin/teams/show/:id",
                meta: {
                  canDelete: true,
                },
              },
            ]}
            options={{
              syncWithLocation: true,
              warnWhenUnsavedChanges: true,
            }}
          >
            <ThemedLayoutV2>
              {children}
            </ThemedLayoutV2>
            <RefineKbar />
          </Refine>
        </AntdApp>
      </ConfigProvider>
    </RefineKbarProvider>
  );
}