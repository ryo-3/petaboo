"use client";

import React from "react";
import { List, useTable } from "@refinedev/antd";
import { Table, Tag } from "antd";

export default function UsersList() {
  const { tableProps } = useTable({
    resource: "users",
  });

  return (
    <List>
      <Table {...tableProps} rowKey="id">
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
      </Table>
    </List>
  );
}