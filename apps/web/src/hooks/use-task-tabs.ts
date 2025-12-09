import { useState, useCallback, useMemo } from "react";
import {
  TASK_TABS,
  getStatusTabs,
  getTaskTab,
  isTaskTabType,
  type TaskTabType,
} from "@/src/config/taskTabConfig";

interface UseTaskTabsOptions {
  defaultTab?: TaskTabType;
  includeDeleted?: boolean;
  onTabChange?: (tab: TaskTabType) => void;
}

export function useTaskTabs({
  defaultTab = "todo",
  includeDeleted = true,
  onTabChange,
}: UseTaskTabsOptions = {}) {
  const [activeTab, setActiveTabInternal] = useState<TaskTabType>(
    isTaskTabType(defaultTab) ? defaultTab : "todo",
  );

  const setActiveTab = useCallback(
    (tab: TaskTabType) => {
      setActiveTabInternal(tab);
      onTabChange?.(tab);
    },
    [onTabChange],
  );

  const availableTabs = useMemo(() => {
    if (includeDeleted) return TASK_TABS;
    return getStatusTabs();
  }, [includeDeleted]);

  const currentTab = useMemo(() => getTaskTab(activeTab), [activeTab]);

  const isStatusTab = useMemo(
    () => currentTab?.category === "status",
    [currentTab],
  );

  const isDeletedTab = useMemo(() => activeTab === "deleted", [activeTab]);

  return {
    activeTab,
    setActiveTab,
    availableTabs,
    currentTab,
    isStatusTab,
    isDeletedTab,
  };
}
