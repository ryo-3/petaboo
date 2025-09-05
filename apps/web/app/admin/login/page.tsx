"use client";

import React, { useState } from "react";
import { Card, Form, Input, Button, message } from "antd";
import { Lock } from "lucide-react";
import { useRouter } from "next/navigation";

export default function AdminLogin() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const onFinish = async (values: { password: string }) => {
    setLoading(true);
    
    // 環境変数のパスワードと比較
    const adminPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD;
    
    if (values.password === adminPassword) {
      // セッションストレージにフラグを設定
      sessionStorage.setItem("admin_authenticated", "true");
      message.success("ログイン成功");
      router.push("/admin/users");
    } else {
      message.error("パスワードが間違っています");
    }
    
    setLoading(false);
  };

  return (
    <div style={{ 
      display: "flex", 
      justifyContent: "center", 
      alignItems: "center", 
      minHeight: "100vh",
      backgroundColor: "#f0f2f5" 
    }}>
      <Card title="管理者ログイン" style={{ width: 400 }}>
        <Form onFinish={onFinish} layout="vertical">
          <Form.Item
            name="password"
            label="パスワード"
            rules={[{ required: true, message: "パスワードを入力してください" }]}
          >
            <Input.Password
              prefix={<Lock size={16} />}
              placeholder="管理者パスワード"
              size="large"
            />
          </Form.Item>
          
          <Form.Item>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={loading}
              size="large"
              block
            >
              ログイン
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}