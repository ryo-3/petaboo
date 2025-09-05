"use client";

import React from "react";
import { List, useTable } from "@refinedev/antd";
import { Table, Tag, Button, Space } from "antd";
import { EyeOutlined, EditOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";

export default function UsersList() {
  const { tableProps } = useTable({
    resource: "users",
  });
  
  const router = useRouter();

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