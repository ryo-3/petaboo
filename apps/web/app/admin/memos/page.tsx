"use client";

import { List, Table, Space } from "antd";
import { useList } from "@refinedev/core";
import React from "react";

export default function MemosListPage() {
  return (
    <List>
      <Table
        dataSource={[]}
        columns={[
          {
            title: "ID",
            dataIndex: "id",
            key: "id",
          },
          {
            title: "タイトル",
            dataIndex: "title",
            key: "title",
          },
          {
            title: "作成日",
            dataIndex: "createdAt",
            key: "createdAt",
            render: (value) => new Date(value).toLocaleString("ja-JP"),
          },
        ]}
      />
    </List>
  );
}