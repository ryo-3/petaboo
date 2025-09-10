import React from "react";
import { Metadata } from "next";
import RootLayoutClient from "./layout-client";

import "@refinedev/antd/dist/reset.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "PETABoo 管理画面",
  description: "ぺたぼー管理者用ダッシュボード",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>
        <RootLayoutClient>{children}</RootLayoutClient>
      </body>
    </html>
  );
}
