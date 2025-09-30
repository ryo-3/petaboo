"use client";

import { useParams } from "next/navigation";
import { useEffect } from "react";

// このページは /team/[customUrl]/board/[slug]/memo/[id] ルートをキャッチし、
// メインのボードページにリダイレクトしつつ、メモ選択状態を伝える
export default function TeamBoardMemoPage() {
  const params = useParams();
  const customUrl = Array.isArray(params.customUrl)
    ? params.customUrl[0]
    : params.customUrl;
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;
  const memoId = Array.isArray(params.id) ? params.id[0] : params.id;

  useEffect(() => {
    // メモIDをクエリパラメータとして付けてメインページにリダイレクト
    const redirectUrl = `/team/${customUrl}/board/${slug}?initialMemo=${memoId}`;
    window.location.replace(redirectUrl);
  }, [customUrl, slug, memoId]);

  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  );
}
