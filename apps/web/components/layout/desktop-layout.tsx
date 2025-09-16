"use client";

import { ReactNode } from "react";

interface DesktopLayoutProps {
  sidebarContent: ReactNode;
  children: ReactNode;
  hideHeader?: boolean;
  teamMode?: boolean;
}

function DesktopLayout({
  sidebarContent,
  children,
  hideHeader = false,
}: DesktopLayoutProps) {
  const topPosition = hideHeader ? "top-0" : "top-16";
  const paddingTop = hideHeader ? "pt-0" : "pt-16";

  return (
    <div className="flex flex-1">
      {/* 左サイドバー */}
      <div
        className={`fixed left-0 ${topPosition} w-16 h-screen border-r border-gray-200 overflow-visible z-10`}
      >
        {sidebarContent}
      </div>

      {/* メインコンテンツエリア */}
      <div className={`flex-1 ml-16 h-screen ${paddingTop}`}>{children}</div>
    </div>
  );
}

export default DesktopLayout;
