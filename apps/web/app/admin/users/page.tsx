"use client";

import React from "react";
import { List, useTable, ShowButton, EditButton } from "@refinedev/antd";
import { Table, Tag, Space } from "antd";
import type { BaseRecord } from "@refinedev/core";

interface User extends BaseRecord {
  id: string;
  userId: string;
  planType: "free" | "premium";
  createdAt: number;
}

export default function UsersList() {
  const { tableProps } = useTable<User>({
    resource: "users",
  });

  const columns = [
    {
      title: "ユーザーID",
      dataIndex: "userId",
      key: "userId",
      render: (value: string) => (
        <span style={{ fontFamily: "monospace", fontSize: "12px" }}>
          {value.substring(0, 25)}...
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
      render: (value: number) => new Date(value * 1000).toLocaleDateString("ja-JP"),
    },
    {
      title: "操作",
      key: "actions",
      render: (_, record: User) => (
        <Space>
          <ShowButton hideText size="small" recordItemId={record.id} />
          <EditButton hideText size="small" recordItemId={record.id} />
        </Space>
      ),
    },
  ];

  return (
    <List>
      <Table {...tableProps} columns={columns} rowKey="id" />
    </List>
  );
}
