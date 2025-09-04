"use client";

import { Button } from "antd";
import { useAuth, useUser } from "@clerk/nextjs";
import { useState } from "react";

export default function SimpleAdminPage() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const [loading, setLoading] = useState(false);

  const testApi = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const response = await fetch("http://localhost:8794/users/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      alert(`成功: ${JSON.stringify(data, null, 2)}`);
    } catch (error) {
      console.error("API Test Error:", error);
      alert(`エラー: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>シンプル管理画面テスト</h1>
      <p>User: {user?.emailAddresses[0]?.emailAddress}</p>
      <Button type="primary" onClick={testApi} loading={loading}>
        API接続テスト
      </Button>
    </div>
  );
}
