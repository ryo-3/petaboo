"use client";

import React from "react";
import { useList, useUpdate } from "@refinedev/core";
import { List, useTable, EditButton, ShowButton, DeleteButton } from "@refinedev/antd";
import { Table, Space, Tag, Button } from "antd";

export default function UsersList() {
  const { tableProps } = useTable({
    resource: "users",
    meta: {
      endpoint: "/users", // カスタムエンドポイント
    },
  });

  const { mutate: updateUser } = useUpdate();

  const changePlan = (userId: string, planType: "free" | "premium") => {
    updateUser({
      resource: "users",
      id: userId,
      values: { planType },
      meta: {
        method: "PATCH",
        endpoint: `/users/plan`,
      },
    });
  };

  const columns = [
    {
      title: "ユーザーID",
      dataIndex: "userId",
      key: "userId",
      render: (value: string) => (
        <span style={{ fontFamily: "monospace", fontSize: "12px" }}>
          {value.substring(0, 20)}...
        </span>
      ),
    },
    {
      title: "プラン",
      dataIndex: "planType",
      key: "planType",
      render: (value: string) => (
        <Tag color={value === "premium" ? "green" : "default"}>
          {value.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: "作成日",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (value: number) => new Date(value * 1000).toLocaleDateString(),
    },
    {
      title: "操作",
      key: "action",
      render: (_: any, record: any) => (
        <Space size="middle">
          <Button
            type="primary"
            size="small"
            onClick={() => changePlan(record.userId, "premium")}
            disabled={record.planType === "premium"}
          >
            Premium化
          </Button>
          <Button
            size="small"
            onClick={() => changePlan(record.userId, "free")}
            disabled={record.planType === "free"}
          >
            Free化
          </Button>
          <ShowButton hideText size="small" recordItemId={record.userId} />
          <DeleteButton hideText size="small" recordItemId={record.userId} />
        </Space>
      ),
    },
  ];

  return (
    <List>
      <Table {...tableProps} columns={columns} rowKey="userId" />
    </List>
  );
}