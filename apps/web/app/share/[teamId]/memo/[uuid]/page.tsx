"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@clerk/nextjs";

interface SharedMemo {
  id: number;
  title: string;
  content: string | null;
  createdAt: number;
  updatedAt: number | null;
  teamName: string;
}

export default function SharedMemoPage() {
  const params = useParams();
  const { isSignedIn, isLoaded } = useAuth();
  const [memo, setMemo] = useState<SharedMemo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const teamId = params.teamId as string;
  const uuid = params.uuid as string;

  useEffect(() => {
    const fetchSharedMemo = async () => {
      try {
        const response = await fetch(`/api/share/team/${teamId}/memo/${uuid}`);

        if (!response.ok) {
          if (response.status === 404) {
            setError("共有されたメモが見つかりません");
          } else if (response.status === 403) {
            setError("このメモにアクセスする権限がありません");
          } else {
            setError("メモの読み込みに失敗しました");
          }
          return;
        }

        const data = await response.json();
        setMemo(data);
      } catch (err) {
        console.error("Error fetching shared memo:", err);
        setError("メモの読み込み中にエラーが発生しました");
      } finally {
        setLoading(false);
      }
    };

    if (teamId && uuid) {
      fetchSharedMemo();
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

  if (!memo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-8 max-w-md mx-auto text-center">
          <h1 className="text-xl font-semibold text-gray-800 mb-4">
            メモが見つかりません
          </h1>
          <p className="text-gray-600">
            指定されたメモは存在しないか、削除された可能性があります。
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
              <h1 className="text-2xl font-bold text-gray-900">{memo.title}</h1>
              <p className="text-sm text-gray-500">
                {memo.teamName} のチーム共有メモ
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

          <div className="text-xs text-gray-400">
            作成日:{" "}
            {new Date(memo.createdAt * 1000).toLocaleDateString("ja-JP")}
            {memo.updatedAt && (
              <span className="ml-4">
                更新日:{" "}
                {new Date(memo.updatedAt * 1000).toLocaleDateString("ja-JP")}
              </span>
            )}
          </div>
        </div>

        {/* メモ内容 */}
        <Card className="p-6">
          {memo.content ? (
            <div className="prose max-w-none">
              <pre className="whitespace-pre-wrap font-sans text-gray-800 leading-relaxed">
                {memo.content}
              </pre>
            </div>
          ) : (
            <p className="text-gray-500 italic">内容がありません</p>
          )}
        </Card>

        {/* フッター */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-400">
            このメモは {memo.teamName} チームで共有されています
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
