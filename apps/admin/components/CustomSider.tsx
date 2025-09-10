"use client";

import React from "react";
import { Layout, Menu } from "antd";
import { useMenu } from "@refinedev/core";
import Link from "next/link";
import {
  UserOutlined,
  DashboardOutlined,
  SettingOutlined,
} from "@ant-design/icons";

const { Sider } = Layout;

export const CustomSider: React.FC = () => {
  const { menuItems, selectedKey } = useMenu();

  // menuItemsをAnt Design v5のitems形式に変換
  const items = [
    {
      key: "dashboard",
      icon: <DashboardOutlined />,
      label: <Link href="/">ダッシュボード</Link>,
    },
    {
      key: "users",
      icon: <UserOutlined />,
      label: <Link href="/users">ユーザー管理</Link>,
    },
  ];

  return (
    <Sider
      collapsible
      breakpoint="lg"
      collapsedWidth="80"
      style={{
        overflow: "auto",
        height: "100vh",
        position: "sticky",
        top: 0,
        left: 0,
      }}
    >
      <div
        style={{
          height: "64px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "18px",
          fontWeight: "bold",
          color: "#fff",
          background: "rgba(255, 255, 255, 0.2)",
        }}
      >
        PETABoo
      </div>
      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[selectedKey]}
        style={{ height: "calc(100% - 64px)", borderRight: 0 }}
        items={items}
      />
    </Sider>
  );
};
