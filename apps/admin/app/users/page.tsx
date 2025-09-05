"use client";

import React from "react";
import { List, useTable } from "@refinedev/antd";
import { Table, Tag, Button, Space, Spin, Alert } from "antd";
import { EyeOutlined, EditOutlined, LoadingOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";

export default function UsersList() {
  const { tableProps, tableQueryResult } = useTable({
    resource: "users",
    pagination: {
      mode: "off", // ページネーションを無効化（全データを一度に取得）
    },
    queryOptions: {
      staleTime: 30000, // 30秒間はデータを新鮮とみなす
      refetchOnMount: "always", // マウント時は必ずフェッチ
    },
  });

  const router = useRouter();

  // ローディング中の表示
  if (tableQueryResult?.isLoading) {
    return (
      <List>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "300px",
            padding: "50px",
            background: "#fff",
            borderRadius: "8px",
            gap: "20px",
          }}
        >
          <Spin
            indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />}
            size="large"
          />
          <div style={{ fontSize: "16px", color: "#666" }}>
            ユーザーデータを読み込み中...
          </div>
        </div>
      </List>
    );
  }

  // エラー時の表示
  if (tableQueryResult?.isError) {
    return (
      <List>
        <Alert
          message="エラーが発生しました"
          description="データの取得に失敗しました。ページを更新してください。"
          type="error"
          showIcon
          action={
            <Button
              size="small"
              type="primary"
              onClick={() => tableQueryResult?.refetch()}
            >
              再読み込み
            </Button>
          }
        />
      </List>
    );
  }

  return (
    <List>
      <Table {...tableProps} rowKey="id" loading={tableQueryResult?.isFetching}>
        <Table.Column
          title="ユーザーID"
          dataIndex="userId"
          render={(value: string) => (
            <span style={{ fontFamily: "monospace", fontSize: "12px" }}>
              {value?.substring(0, 25)}...
            </span>
          )}
        />
        <Table.Column
          title="メールアドレス"
          dataIndex="email"
          render={(value: string) => (
            <span style={{ fontSize: "14px" }}>{value || "未設定"}</span>
          )}
        />
        <Table.Column
          title="プラン"
          dataIndex="planType"
          render={(value: string) => (
            <Tag color={value === "premium" ? "green" : "default"}>
              {value?.toUpperCase() || "FREE"}
            </Tag>
          )}
        />
        <Table.Column
          title="作成日"
          dataIndex="createdAt"
          render={(value: number) =>
            value ? new Date(value * 1000).toLocaleDateString("ja-JP") : "-"
          }
        />
        <Table.Column
          title="操作"
          render={(_, record: any) => (
            <Space>
              <Button
                icon={<EyeOutlined />}
                onClick={() => router.push(`/users/show/${record.id}`)}
              >
                表示
              </Button>
              <Button
                type="primary"
                icon={<EditOutlined />}
                onClick={() => router.push(`/users/edit/${record.id}`)}
              >
                編集
              </Button>
            </Space>
          )}
        />
      </Table>
    </List>
  );
}
