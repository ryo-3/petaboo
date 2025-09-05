"use client";

import React from "react";
import { Card, Row, Col, Statistic } from "antd";
import { UserOutlined, PlusOutlined, CheckOutlined } from "@ant-design/icons";
import { useList } from "@refinedev/core";

export default function Dashboard() {
  const { data: usersData, isLoading } = useList({
    resource: "users",
  });

  const users = usersData?.data || [];
  const totalUsers = users.length;
  const premiumUsers = users.filter(
    (user: any) => user.planType === "premium",
  ).length;
  const freeUsers = users.filter(
    (user: any) => user.planType === "free",
  ).length;

  return (
    <div style={{ padding: "24px" }}>
      <h1>ダッシュボード</h1>

      <Row gutter={16}>
        <Col span={8}>
          <Card loading={isLoading}>
            <Statistic
              title="総ユーザー数"
              value={totalUsers}
              prefix={<UserOutlined />}
              valueStyle={{ color: "#3f8600" }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card loading={isLoading}>
            <Statistic
              title="プレミアムユーザー"
              value={premiumUsers}
              prefix={<CheckOutlined />}
              valueStyle={{ color: "#cf1322" }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card loading={isLoading}>
            <Statistic
              title="フリーユーザー"
              value={freeUsers}
              prefix={<PlusOutlined />}
              valueStyle={{ color: "#1890ff" }}
            />
          </Card>
        </Col>
      </Row>

      <Card title="最近の活動" style={{ marginTop: "24px" }}>
        <p>ユーザー管理システムが正常に動作しています。</p>
        <p>APIプロキシ経由でデータを取得中...</p>
      </Card>
    </div>
  );
}
