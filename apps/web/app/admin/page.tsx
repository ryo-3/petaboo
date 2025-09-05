"use client";

import { Card, Typography } from "antd";

const { Title, Text } = Typography;

export default function AdminPage() {
  return (
    <div>
      <Title level={2}>管理者ダッシュボード</Title>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: 16,
        }}
      >
        <Card title="ユーザー管理" extra={<a href="/admin/users">詳細</a>}>
          <Text>ユーザー情報、プラン管理</Text>
        </Card>

        <Card title="チーム管理" extra={<a href="/admin/teams">詳細</a>}>
          <Text>チーム作成、メンバー管理、チーム設定</Text>
        </Card>

        <Card title="システム統計">
          <Text>利用状況、登録数などの統計情報</Text>
        </Card>
      </div>
    </div>
  );
}
