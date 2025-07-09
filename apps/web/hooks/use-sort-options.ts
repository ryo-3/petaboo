import { useState } from "react";

export interface SortOption {
  id: "createdAt" | "updatedAt" | "priority" | "deletedAt" | "dueDate";
  label: string;
  enabled: boolean;
  direction: "asc" | "desc";
}

export function useSortOptions(mode: 'memo' | 'task' = 'memo') {
  const getMemoSortOptions = (): SortOption[] => [
    {
      id: "updatedAt" as const,
      label: "更新日順",
      enabled: false,
      direction: "desc" as const,
    },
    {
      id: "createdAt" as const,
      label: "作成日順",
      enabled: false,
      direction: "desc" as const,
    },
    {
      id: "deletedAt" as const,
      label: "削除日順",
      enabled: false,
      direction: "desc" as const,
    },
  ];

  const getTaskSortOptions = (): SortOption[] => [
    {
      id: "priority" as const,
      label: "優先度順",
      enabled: false,
      direction: "desc" as const,
    },
    {
      id: "updatedAt" as const,
      label: "更新日順",
      enabled: false,
      direction: "desc" as const,
    },
    {
      id: "createdAt" as const,
      label: "作成日順",
      enabled: false,
      direction: "desc" as const,
    },
    {
      id: "deletedAt" as const,
      label: "削除日順",
      enabled: false,
      direction: "desc" as const,
    },
  ];

  const [sortOptions, setSortOptions] = useState<SortOption[]>(
    mode === 'memo' ? getMemoSortOptions() : getTaskSortOptions()
  );

  const getVisibleSortOptions = (activeTab: string) => {
    if (activeTab === 'deleted') {
      return sortOptions;
    } else {
      return sortOptions.filter(option => option.id !== 'deletedAt');
    }
  };

  return {
    sortOptions,
    setSortOptions,
    getVisibleSortOptions,
  };
}