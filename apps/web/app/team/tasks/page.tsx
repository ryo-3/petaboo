"use client";

import { useState } from "react";
import { PremiumPlanGuard } from "@/components/features/team/premium-plan-guard";

interface TeamTask {
  id: string;
  title: string;
  description: string;
  status: "todo" | "in_progress" | "completed";
  priority: "low" | "medium" | "high";
  assignee: string;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
}

export default function TeamTasksPage() {
  return (
    <PremiumPlanGuard>
      <TeamTasksContent />
    </PremiumPlanGuard>
  );
}

function TeamTasksContent() {
  const [tasks] = useState<TeamTask[]>([
    {
      id: "1",
      title: "API設計ドキュメント作成",
      description: "新機能のAPI仕様書を作成する",
      status: "in_progress",
      priority: "high",
      assignee: "田中",
      dueDate: "2024-01-20T00:00:00Z",
      createdAt: "2024-01-15T10:00:00Z",
      updatedAt: "2024-01-16T14:30:00Z",
      tags: ["開発", "API"],
    },
    {
      id: "2",
      title: "デザインレビュー",
      description: "UIデザインの最終確認とフィードバック",
      status: "todo",
      priority: "medium",
      assignee: "佐藤",
      dueDate: "2024-01-18T00:00:00Z",
      createdAt: "2024-01-14T09:00:00Z",
      updatedAt: "2024-01-14T09:00:00Z",
      tags: ["デザイン", "レビュー"],
    },
    {
      id: "3",
      title: "テストケース作成",
      description: "新機能のテストケースを作成し実行する",
      status: "completed",
      priority: "medium",
      assignee: "鈴木",
      createdAt: "2024-01-12T15:00:00Z",
      updatedAt: "2024-01-15T11:20:00Z",
      tags: ["テスト", "QA"],
    },
  ]);

  const getStatusBadge = (status: TeamTask["status"]) => {
    const styles = {
      todo: "bg-gray-100 text-gray-800",
      in_progress: "bg-blue-100 text-blue-800",
      completed: "bg-green-100 text-green-800",
    };
    const labels = {
      todo: "未着手",
      in_progress: "進行中",
      completed: "完了",
    };
    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}
      >
        {labels[status]}
      </span>
    );
  };

  const getPriorityBadge = (priority: TeamTask["priority"]) => {
    const styles = {
      low: "bg-green-100 text-green-800",
      medium: "bg-yellow-100 text-yellow-800",
      high: "bg-red-100 text-red-800",
    };
    const labels = {
      low: "低",
      medium: "中",
      high: "高",
    };
    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[priority]}`}
      >
        優先度: {labels[priority]}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ja-JP", {
      month: "short",
      day: "numeric",
    });
  };

  const isOverdue = (dueDate?: string) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  return (
    <div className="px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">チームタスク</h1>
          <p className="text-gray-600 mt-1">チーム内のタスク管理</p>
        </div>
        <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
          + 新しいタスク
        </button>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="divide-y divide-gray-200">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="p-6 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-medium text-gray-900">
                      {task.title}
                    </h3>
                    {getStatusBadge(task.status)}
                    {getPriorityBadge(task.priority)}
                  </div>

                  <p className="text-gray-600 text-sm mb-3">
                    {task.description}
                  </p>

                  <div className="flex items-center space-x-4 text-sm text-gray-500 mb-3">
                    <span>担当者: {task.assignee}</span>
                    {task.dueDate && (
                      <span
                        className={
                          isOverdue(task.dueDate)
                            ? "text-red-600 font-medium"
                            : ""
                        }
                      >
                        期限: {formatDate(task.dueDate)}
                        {isOverdue(task.dueDate) && " (期限切れ)"}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    {task.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="ml-4 flex-shrink-0">
                  <button className="text-gray-400 hover:text-gray-600">
                    <svg
                      className="w-5 h-5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {tasks.length === 0 && (
        <div className="text-center py-12">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            タスクがありません
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            最初のチームタスクを作成してみましょう
          </p>
        </div>
      )}
    </div>
  );
}
