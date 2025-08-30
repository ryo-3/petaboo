"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@clerk/nextjs";

interface SharedTask {
  id: number;
  title: string;
  description: string | null;
  status: "todo" | "in_progress" | "completed";
  priority: "low" | "medium" | "high";
  dueDate: number | null;
  createdAt: number;
  updatedAt: number | null;
  teamName: string;
}

const statusLabels = {
  todo: "未開始",
  in_progress: "進行中",
  completed: "完了",
};

const statusColors = {
  todo: "bg-gray-100 text-gray-800",
  in_progress: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
};

const priorityLabels = {
  low: "低",
  medium: "中",
  high: "高",
};

const priorityColors = {
  low: "bg-green-100 text-green-800",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-red-100 text-red-800",
};

export default function SharedTaskPage() {
  const params = useParams();
  const { isSignedIn, isLoaded } = useAuth();
  const [task, setTask] = useState<SharedTask | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const teamId = params.teamId as string;
  const uuid = params.uuid as string;

  useEffect(() => {
    const fetchSharedTask = async () => {
      try {
        const response = await fetch(`/api/share/team/${teamId}/task/${uuid}`);

        if (!response.ok) {
          if (response.status === 404) {
            setError("共有されたタスクが見つかりません");
          } else if (response.status === 403) {
            setError("このタスクにアクセスする権限がありません");
          } else {
            setError("タスクの読み込みに失敗しました");
          }
          return;
        }

        const data = await response.json();
        setTask(data);
      } catch (err) {
        console.error("Error fetching shared task:", err);
        setError("タスクの読み込み中にエラーが発生しました");
      } finally {
        setLoading(false);
      }
    };

    if (teamId && uuid) {
      fetchSharedTask();
    }
  }, [teamId, uuid]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-8 max-w-md mx-auto text-center">
          <h1 className="text-xl font-semibold text-gray-800 mb-4">エラー</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          {!isSignedIn && (
            <div className="space-y-3">
              <p className="text-sm text-gray-500">
                チームメンバーとしてサインインするとアクセスできる場合があります
              </p>
              <Button
                onClick={() => (window.location.href = "/sign-in")}
                className="w-full"
              >
                サインイン
              </Button>
            </div>
          )}
        </Card>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-8 max-w-md mx-auto text-center">
          <h1 className="text-xl font-semibold text-gray-800 mb-4">
            タスクが見つかりません
          </h1>
          <p className="text-gray-600">
            指定されたタスクは存在しないか、削除された可能性があります。
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4">
        {/* ヘッダー */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{task.title}</h1>
              <p className="text-sm text-gray-500">
                {task.teamName} のチーム共有タスク
              </p>
            </div>
            {isSignedIn && (
              <Button
                variant="outline"
                onClick={() => (window.location.href = `/team/${teamId}`)}
              >
                チームページへ
              </Button>
            )}
          </div>

          <div className="text-xs text-gray-400 mb-4">
            作成日:{" "}
            {new Date(task.createdAt * 1000).toLocaleDateString("ja-JP")}
            {task.updatedAt && (
              <span className="ml-4">
                更新日:{" "}
                {new Date(task.updatedAt * 1000).toLocaleDateString("ja-JP")}
              </span>
            )}
          </div>

          {/* タスク情報バッジ */}
          <div className="flex gap-2 mb-4">
            <Badge className={statusColors[task.status]}>
              {statusLabels[task.status]}
            </Badge>
            <Badge className={priorityColors[task.priority]}>
              優先度: {priorityLabels[task.priority]}
            </Badge>
            {task.dueDate && (
              <Badge variant="outline">
                期限:{" "}
                {new Date(task.dueDate * 1000).toLocaleDateString("ja-JP")}
              </Badge>
            )}
          </div>
        </div>

        {/* タスク内容 */}
        <Card className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">説明</h3>
          {task.description ? (
            <div className="prose max-w-none">
              <pre className="whitespace-pre-wrap font-sans text-gray-800 leading-relaxed">
                {task.description}
              </pre>
            </div>
          ) : (
            <p className="text-gray-500 italic">説明がありません</p>
          )}
        </Card>

        {/* フッター */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-400">
            このタスクは {task.teamName} チームで共有されています
          </p>
          {!isSignedIn && (
            <div className="mt-4">
              <Button
                onClick={() => (window.location.href = "/sign-up")}
                variant="outline"
                size="sm"
              >
                チームに参加する
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
