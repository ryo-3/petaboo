"use client";

import { ReactNode } from "react";

export interface SettingsTab {
  id: string;
  label: string;
  icon: ReactNode;
}

interface SettingsLayoutProps {
  title: string;
  subtitle?: string;
  headerIcon: ReactNode;
  tabs: SettingsTab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  children: ReactNode;
}

export function SettingsLayout({
  title,
  subtitle,
  headerIcon,
  tabs,
  activeTab,
  onTabChange,
  children,
}: SettingsLayoutProps) {
  return (
    <div className="bg-white flex flex-col overflow-hidden h-full">
      {/* ヘッダー */}
      <div className="border-b border-gray-200 px-5 py-3">
        <div className="flex items-center gap-2">
          {headerIcon}
          <h1 className="text-[22px] font-bold text-gray-800">{title}</h1>
          {subtitle && (
            <span className="text-sm text-gray-600 ml-4">{subtitle}</span>
          )}
        </div>
      </div>

      {/* タブナビゲーション */}
      {tabs.length > 1 && (
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-5">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === tab.id
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      )}

      {/* コンテンツエリア */}
      <div className="flex-1 overflow-auto p-5">{children}</div>
    </div>
  );
}
