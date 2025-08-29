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
    message.includes('[antd: Card] `bordered` is deprecated') ||
    message.includes('[antd: Drawer] `bodyStyle` is deprecated')
  )) {
    return;
  }
  originalError(message, ...args);
};

const API_URL = "http://localhost:7594";

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
  
  // カスタムデータプロバイダー
  const simpleDataProvider = React.useMemo(() => {
    return {
      getList: async ({ resource, pagination, sorters, filters }: any) => {
        const token = await getToken();
        const { current = 1, pageSize = 10 } = pagination || {};
        const start = (current - 1) * pageSize;
        const end = start + pageSize;
        
        const response = await fetch(`${API_URL}/${resource}?_start=${start}&_end=${end}`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: token ? `Bearer ${token}` : "",
          },
        });
        
        const data = await response.json();
        return {
          data: data,
          total: data.length, // 簡易的な実装
        };
      },
      
      getOne: async ({ resource, id }: any) => {
        const token = await getToken();
        // users リソースの場合は既存のエンドポイントを使用
        const url = resource === 'users' ? `${API_URL}/users/${id}` : `${API_URL}/${resource}/${id}`;
        const response = await fetch(url, {
          headers: {
            "Content-Type": "application/json",
            Authorization: token ? `Bearer ${token}` : "",
          },
        });
        if (!response.ok) {
          throw new Error(`Failed to fetch ${resource}/${id}`);
        }
        const data = await response.json();
        return { data };
      },
      
      update: async ({ resource, id, variables }: any) => {
        const token = await getToken();
        // users リソースの場合は既存のプラン変更エンドポイントを使用
        const url = resource === 'users' 
          ? `${API_URL}/users/${id}/plan`
          : `${API_URL}/${resource}/${id}`;
        const body = resource === 'users' 
          ? { planType: variables.planType }
          : variables;
          
        const response = await fetch(url, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: token ? `Bearer ${token}` : "",
          },
          body: JSON.stringify(body),
        });
        if (!response.ok) {
          throw new Error(`Failed to update ${resource}/${id}`);
        }
        const data = await response.json();
        return { data };
      },
      
      create: async () => { throw new Error("Create not implemented"); },
      deleteOne: async () => { throw new Error("Delete not implemented"); },
      getApiUrl: () => API_URL,
    } as any;
  }, [getToken]);
  
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