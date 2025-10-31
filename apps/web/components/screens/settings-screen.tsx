"use client";

import SettingsIcon from "@/components/icons/settings-icon";
import BoardCategoryManager from "@/components/features/board-categories/board-category-manager";
import {
  SettingsLayout,
  SettingsMenuItem,
} from "@/components/layout/settings-layout";
import { useState } from "react";
import { Folder } from "lucide-react";

type PersonalSettingsTab = "board-categories";

function SettingsScreen() {
  const [activeTab, setActiveTab] =
    useState<PersonalSettingsTab>("board-categories");

  const menuItems: SettingsMenuItem[] = [
    {
      id: "board-categories",
      label: "ボードカテゴリー",
      icon: <Folder className="w-4 h-4 text-purple-600" />,
    },
  ];

  return (
    <SettingsLayout
      title="設定"
      subtitle="各ページの基本設定ができます"
      headerIcon={<SettingsIcon className="w-6 h-6 text-gray-600" />}
      menuItems={menuItems}
      activeTab={activeTab}
      onTabChange={(tabId) => setActiveTab(tabId as PersonalSettingsTab)}
    >
      {activeTab === "board-categories" && <BoardCategoryManager />}
    </SettingsLayout>
  );
}

export default SettingsScreen;
