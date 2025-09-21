"use client";

import CSVImportModal from "@/components/shared/csv-import-modal";
import { useImportTasks } from "@/src/hooks/use-tasks";

interface TaskCsvData {
  title: string;
  description?: string;
  status?: "todo" | "in_progress" | "completed";
  priority?: "low" | "medium" | "high";
}

interface TaskCsvImportProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * タスクCSVのパース関数
 */
const parseTaskCsv = (csvText: string): TaskCsvData[] => {
  const lines = csvText.trim().split("\n");
  if (lines.length < 2) return [];

  const header = lines[0]?.toLowerCase() || "";
  if (!header.includes("title")) return [];

  const results: TaskCsvData[] = [];

  for (let i = 1; i < Math.min(lines.length, 6); i++) {
    // 最初の5行のみプレビュー
    const line = lines[i]?.trim() || "";
    if (!line) continue;

    const values = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));

    if (values.length >= 1 && values[0]) {
      // status の正規化
      const normalizeStatus = (
        status: string,
      ): "todo" | "in_progress" | "completed" | undefined => {
        const s = status?.toLowerCase();
        if (s === "todo" || s === "未着手") return "todo";
        if (s === "in_progress" || s === "進行中") return "in_progress";
        if (s === "completed" || s === "完了") return "completed";
        return undefined;
      };

      // priority の正規化
      const normalizePriority = (
        priority: string,
      ): "low" | "medium" | "high" | undefined => {
        const p = priority?.toLowerCase();
        if (p === "low" || p === "低") return "low";
        if (p === "medium" || p === "中") return "medium";
        if (p === "high" || p === "高") return "high";
        return undefined;
      };

      results.push({
        title: values[0],
        description: values[1] || undefined,
        status: normalizeStatus(values[2] || ""),
        priority: normalizePriority(values[3] || ""),
      });
    }
  }

  return results;
};

/**
 * タスク用CSVインポートモーダル
 */
export function TaskCsvImport({ isOpen, onClose }: TaskCsvImportProps) {
  const columns = [
    { key: "title" as const, label: "タイトル" },
    { key: "description" as const, label: "説明" },
    { key: "status" as const, label: "ステータス" },
    { key: "priority" as const, label: "優先度" },
  ];

  const getStatusLabel = (status?: "todo" | "in_progress" | "completed") => {
    switch (status) {
      case "todo":
        return "未着手";
      case "in_progress":
        return "進行中";
      case "completed":
        return "完了";
      default:
        return "未着手";
    }
  };

  const getPriorityLabel = (priority?: "low" | "medium" | "high") => {
    switch (priority) {
      case "low":
        return "低";
      case "medium":
        return "中";
      case "high":
        return "高";
      default:
        return "中";
    }
  };

  const renderPreviewItem = (item: TaskCsvData, index: number) => (
    <tr key={index} className="hover:bg-gray-50">
      <td className="px-3 py-2 text-gray-900">{item.title}</td>
      <td className="px-3 py-2 text-gray-600">
        {item.description ? (
          <span className="line-clamp-2">{item.description}</span>
        ) : (
          <span className="text-gray-400 italic">説明なし</span>
        )}
      </td>
      <td className="px-3 py-2 text-gray-600">{getStatusLabel(item.status)}</td>
      <td className="px-3 py-2 text-gray-600">
        {getPriorityLabel(item.priority)}
      </td>
    </tr>
  );

  return (
    <CSVImportModal<TaskCsvData>
      isOpen={isOpen}
      onClose={onClose}
      itemType="task"
      parseFunction={parseTaskCsv}
      importHook={useImportTasks}
      formatDescription="1列目: タイトル（必須）、2列目: 説明（オプション）、3列目: ステータス（todo/in_progress/completed）、4列目: 優先度（low/medium/high）"
      previewColumns={columns}
      renderPreviewItem={renderPreviewItem}
    />
  );
}

export default TaskCsvImport;
