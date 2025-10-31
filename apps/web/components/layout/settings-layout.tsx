"use client";

import { ReactNode } from "react";

export interface SettingsMenuItem {
  id: string;
  label: string;
  icon: ReactNode;
}

interface SettingsLayoutProps {
  title: string;
  subtitle?: string;
  headerIcon: ReactNode;
  menuItems: SettingsMenuItem[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  children: ReactNode;
}

export function SettingsLayout({
  title,
  subtitle,
  headerIcon,
  menuItems,
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

      {/* サイドバーとメインコンテンツ */}
      <div className="flex flex-1 overflow-hidden">
        {/* サイドバー */}
        <div className="w-[180px] border-r border-gray-200 pt-3 px-3">
          <nav className="space-y-1">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  activeTab === item.id
                    ? "bg-gray-100 text-gray-900 font-medium"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                {item.icon}
                <span className="text-sm">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* メインコンテンツ */}
        <div className="flex-1 px-6 pt-4 overflow-y-auto">
          <div className="max-w-2xl">{children}</div>
        </div>
      </div>
    </div>
  );
}
