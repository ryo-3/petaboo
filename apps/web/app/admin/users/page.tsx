"use client";

import React from "react";
import { useList } from "@refinedev/core";
import { List, ShowButton, EditButton } from "@refinedev/antd";
import { Table, Tag, Space } from "antd";

export default function UsersList() {
  const { data: userData, isLoading } = useList({
    resource: "users",
  });

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
          <ShowButton
            hideText
            size="small"
            recordItemId={record.userId}
            resource="users"
          />
          <EditButton
            hideText
            size="small"
            recordItemId={record.userId}
            resource="users"
          />
        </Space>
      ),
    },
  ];

  return (
    <List>
      <Table
        dataSource={userData?.data || []}
        columns={columns}
        rowKey="userId"
        loading={isLoading}
      />
    </List>
  );
}
