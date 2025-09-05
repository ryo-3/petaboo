"use client";

import React, { useState, useEffect } from "react";
import { Card, Form, Input, Button, App } from "antd";
import { LockOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";

function AdminLoginForm() {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const [form] = Form.useForm();

  // 開発環境での自動ログイン
  useEffect(() => {
    const autoLogin = process.env.NEXT_PUBLIC_AUTO_LOGIN === "true";
    const isLocalhost = typeof window !== "undefined" && 
      (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
    
    if (autoLogin && isLocalhost) {
      const adminPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "admin123";
      
      // フォームに自動入力
      form.setFieldsValue({ password: adminPassword });
      
      // 自動ログインオプション: 即座にログイン
      setTimeout(() => {
        message.info("開発環境: 自動ログインを実行中...");
        onFinish({ password: adminPassword });
      }, 500);
    }
  }, [form, router, message]);

  const onFinish = async (values: { password: string }) => {
    setLoading(true);
    
    // 環境変数のパスワードと比較
    const adminPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "admin123";
    
    if (values.password === adminPassword) {
      sessionStorage.setItem("admin_authenticated", "true");
      message.success("ログイン成功");
      router.push("/users");
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
      <Card title="Petaboo 管理者ログイン" style={{ width: 400 }}>
        <Form form={form} onFinish={onFinish} layout="vertical">
          <Form.Item
            name="password"
            label="パスワード"
            rules={[{ required: true, message: "パスワードを入力してください" }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="管理者パスワード (admin123)"
              size="large"
            />
          </Form.Item>
          
          {process.env.NEXT_PUBLIC_AUTO_LOGIN === "true" && (
            <div style={{ marginBottom: 16, color: "#1890ff", fontSize: 12 }}>
              💡 開発環境: 自動ログインが有効です
            </div>
          )}
          
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

export default function AdminLogin() {
  return (
    <App>
      <AdminLoginForm />
    </App>
  );
}