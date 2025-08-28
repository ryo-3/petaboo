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

const API_URL = "http://localhost:8794";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { getToken } = useAuth();

  // カスタムデータプロバイダー
  const customDataProvider = {
    getApiUrl: () => API_URL,
    
    // ユーザー一覧（現在のユーザー情報のみ）
    getList: async (resource: string) => {
      const token = await getToken();
      
      if (resource === "users") {
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
      
      if (resource === "teams") {
        // チーム一覧は後で実装
        return {
          data: [],
          total: 0,
        };
      }
      
      throw new Error(`Unknown resource: ${resource}`);
    },
    
    // その他の必要なメソッド
    getOne: async () => ({ data: {} }),
    getMany: async () => ({ data: [] }),
    getManyReference: async () => ({ data: [], total: 0 }),
    create: async () => ({ data: {} }),
    update: async () => ({ data: {} }),
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