"use client";

import { usePrefetchItemTags } from "@/src/hooks/use-taggings";
import { useMemo } from "react";

interface ItemTagsPrefetcherProps {
  type: 'memo' | 'task' | 'board';
  items?: Array<{ id: number }> | null;
}

/**
 * アイテムのタグ情報をプリフェッチするコンポーネント
 * メモ一覧、タスク一覧、ボード詳細などで共通利用
 */
export default function ItemTagsPrefetcher({ type, items }: ItemTagsPrefetcherProps) {
  // プリフェッチ用のアイテムリスト作成
  const prefetchItems = useMemo(() => {
    return items?.map(item => ({ id: item.id })) || [];
  }, [items]);

  // プリフェッチ実行（副作用のみ、レンダリングなし）
  usePrefetchItemTags(type, prefetchItems);

  // このコンポーネントは何もレンダリングしない
  return null;
}