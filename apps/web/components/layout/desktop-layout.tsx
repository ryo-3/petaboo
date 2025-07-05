"use client";

import { ReactNode } from "react";

interface DesktopLayoutProps {
  sidebarContent: ReactNode;
  children: ReactNode;
}

function DesktopLayout({ sidebarContent, children }: DesktopLayoutProps) {
  return (
    <div className="flex flex-1">
      {/* 左サイドバー */}
      <div className="fixed left-0 top-16 w-16 h-[calc(100vh-64px)] border-r-2 border-gray-400 overflow-visible z-10">
        {sidebarContent}
      </div>

      {/* メインコンテンツエリア */}
      <div className="flex-1 ml-16 h-[calc(100vh-64px)] pt-16">{children}</div>
    </div>
  );
}

export default DesktopLayout;
