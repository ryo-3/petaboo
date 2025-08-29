import { BoardItemWithContent } from "@/src/types/board";
import { Memo } from "@/src/types/memo";
import { Task } from "@/src/types/task";

export interface ExportData {
  name: string;
  description: string | null;
  createdAt: string;
  memos: {
    title: string;
    content: string | null;
    createdAt: string;
  }[];
  tasks: {
    title: string;
    description: string | null;
    status: string;
    priority: string;
    createdAt: string;
  }[];
}

export function useExport() {
  const formatAsText = (data: ExportData): string => {
    let text = `ボード名: ${data.name}\n`;
    if (data.description) {
      text += `説明: ${data.description}\n`;
    }
    text += `作成日: ${data.createdAt}\n\n`;

    if (data.memos.length > 0) {
      text += "## メモ\n";
      data.memos.forEach((memo, index: number) => {
        text += `${index + 1}. ${memo.title}\n`;
        if (memo.content) {
          text += `   ${memo.content.replace(/\n/g, "\n   ")}\n`;
        }
        text += `   作成日: ${memo.createdAt}\n\n`;
      });
    }

    if (data.tasks.length > 0) {
      text += "## タスク\n";
      data.tasks.forEach((task, index: number) => {
        const statusText =
          task.status === "completed"
            ? "完了"
            : task.status === "in_progress"
              ? "進行中"
              : "未着手";
        const priorityText =
          task.priority === "high"
            ? "高"
            : task.priority === "low"
              ? "低"
              : "中";

        text += `${index + 1}. [${statusText}] ${task.title} (優先度: ${priorityText})\n`;
        if (task.description) {
          text += `   ${task.description.replace(/\n/g, "\n   ")}\n`;
        }
        text += `   作成日: ${task.createdAt}\n\n`;
      });
    }

    return text;
  };

  const downloadAsFile = (content: string, filename: string): void => {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportBoard = (
    boardName: string,
    boardDescription: string | null,
    boardCreatedAt: number,
    memoItems: BoardItemWithContent[],
    taskItems: BoardItemWithContent[],
  ): void => {
    const exportData: ExportData = {
      name: boardName,
      description: boardDescription,
      createdAt: new Date(boardCreatedAt * 1000).toLocaleString("ja-JP"),
      memos: memoItems.map((item) => {
        const memo = item.content as Memo;
        return {
          title: memo.title,
          content: memo.content,
          createdAt: new Date((memo.createdAt as number) * 1000).toLocaleString(
            "ja-JP",
          ),
        };
      }),
      tasks: taskItems.map((item) => {
        const task = item.content as Task;
        return {
          title: task.title,
          description: task.description,
          status: task.status,
          priority: task.priority,
          createdAt: new Date((task.createdAt as number) * 1000).toLocaleString(
            "ja-JP",
          ),
        };
      }),
    };

    const textContent = formatAsText(exportData);
    downloadAsFile(textContent, `${boardName}.txt`);
  };

  return {
    exportBoard,
    formatAsText,
    downloadAsFile,
  };
}
