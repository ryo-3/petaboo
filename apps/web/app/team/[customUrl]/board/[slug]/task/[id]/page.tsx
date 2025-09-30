"use client";

import { useParams } from "next/navigation";
import { useEffect } from "react";

// このページは /team/[customUrl]/board/[slug]/task/[id] ルートをキャッチし、
// メインのボードページにリダイレクトしつつ、タスク選択状態を伝える
export default function TeamBoardTaskPage() {
  const params = useParams();
  const customUrl = Array.isArray(params.customUrl)
    ? params.customUrl[0]
    : params.customUrl;
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;
  const taskId = Array.isArray(params.id) ? params.id[0] : params.id;

  useEffect(() => {
    if (!customUrl || !slug || !taskId) {
      return;
    }

    // タスクIDをクエリパラメータとして付けてメインページにリダイレクト
    const redirectUrl = `/team/${customUrl}/board/${slug}?initialTask=${taskId}`;

    try {
      window.location.replace(redirectUrl);
    } catch (error) {
      console.error(`❌ タスクリダイレクトエラー:`, error);
    }
  }, [customUrl, slug, taskId]);

  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  );
}
