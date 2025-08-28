"use client";

import React from "react";
import { useShow } from "@refinedev/core";
import { Show } from "@refinedev/antd";
import { Typography, Card, Tag } from "antd";

const { Title, Text } = Typography;

export default function UserShow() {
  const { queryResult } = useShow();
  const { data, isLoading } = queryResult;

  const record = data?.data;

  return (
    <Show isLoading={isLoading}>
      <Card>
        <Title level={4}>ユーザー詳細</Title>
        
        <div style={{ marginBottom: 16 }}>
          <Text strong>ユーザーID: </Text>
          <Text code>{record?.userId}</Text>
        </div>
        
        <div style={{ marginBottom: 16 }}>
          <Text strong>プランタイプ: </Text>
          <Tag color={record?.planType === "premium" ? "green" : "default"}>
            {record?.planType?.toUpperCase()}
          </Tag>
        </div>
        
        <div style={{ marginBottom: 16 }}>
          <Text strong>作成日: </Text>
          <Text>{record?.createdAt ? new Date(record.createdAt * 1000).toLocaleDateString() : 'N/A'}</Text>
        </div>
      </Card>
    </Show>
  );
}