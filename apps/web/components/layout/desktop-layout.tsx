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
  const topPosition = hideHeader ? "top-0" : "md:top-16 top-0";
  const paddingTop = hideHeader ? "pt-0" : "md:pt-16 pt-0";

  return (
    <div className="flex flex-col md:flex-row flex-1">
      {/* 左サイドバー（デスクトップ: 固定左サイドバー、モバイル: 下部バー） */}
      <div
        className={`fixed left-0 right-0 ${hideHeader ? "md:top-0" : "md:top-16"} bottom-0 md:bottom-auto md:w-16 w-full md:h-screen h-14 md:border-r md:border-b-0 border-t border-gray-200 overflow-visible z-10 bg-gray-50`}
      >
        {sidebarContent}
      </div>

      {/* メインコンテンツエリア */}
      <div
        className={`flex-1 md:ml-16 ml-0 h-screen overflow-hidden ${paddingTop} pt-0 md:mb-0 mb-14`}
      >
        {children}
      </div>
    </div>
  );
}

export default DesktopLayout;
