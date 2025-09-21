import { useBulkDeleteUnified } from "@/src/hooks/use-bulk-delete-unified";
import { useDeleteMemo, usePermanentDeleteMemo } from "@/src/hooks/use-memos";
import type { Memo, DeletedMemo } from "@/src/types/memo";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import { memosApi } from "@/src/lib/api-client";

interface UseMemosBulkDeleteProps {
  activeTab: "normal" | "deleted";
  checkedMemos: Set<number>;
  checkedDeletedMemos: Set<number>;
  setCheckedMemos: (memos: Set<number>) => void;
  setCheckedDeletedMemos: (memos: Set<number>) => void;
  memos?: Memo[];
  deletedMemos?: DeletedMemo[];
  localMemos: Memo[];
  onMemoDelete?: (id: number) => void;
  onDeletedMemoDelete?: (id: number) => void;
  deleteButtonRef?: React.RefObject<HTMLButtonElement | null>;
  setIsDeleting?: (isDeleting: boolean) => void;
  setIsLidOpen?: (isOpen: boolean) => void;
  viewMode?: "list" | "card";
}

export function useMemosBulkDelete(props: UseMemosBulkDeleteProps) {
  const { getToken } = useAuth();

  // API関数の設定
  const apiMethods = {
    delete: useDeleteMemo,
    permanentDelete: usePermanentDeleteMemo,
    deleteWithoutUpdate: (token: string | null) => ({
      mutationFn: async (id: number) => {
        const response = await memosApi.deleteNote(id, token || undefined);
        return response.json();
      },
    }),
    permanentDeleteWithoutUpdate: (token: string | null) => ({
      mutationFn: async (id: number) => {
        const response = await memosApi.permanentDeleteNote(
          String(id),
          token || undefined,
        );
        return response.json();
      },
    }),
  };

  // ステータス別カウントを取得する関数（メモ版）
  const getStatusBreakdown = (memoIds: number[]) => {
    if (props.activeTab === "deleted") {
      return [
        {
          status: "deleted",
          label: "削除済み",
          count: memoIds.length,
          color: "bg-red-600",
        },
      ];
    }

    // メモは全て通常メモとして扱う
    return [
      {
        status: "normal",
        label: "通常",
        count: memoIds.length,
        color: "bg-zinc-500",
      },
    ];
  };

  // DOM順序取得関数
  const getDisplayOrder = async () => {
    const { getMemoDisplayOrder } = await import("@/src/utils/domUtils");
    return { getDomOrder: getMemoDisplayOrder };
  };

  return useBulkDeleteUnified({
    activeTab: props.activeTab,
    checkedItems: props.checkedMemos,
    checkedDeletedItems: props.checkedDeletedMemos,
    setCheckedItems: props.setCheckedMemos,
    setCheckedDeletedItems: props.setCheckedDeletedMemos,
    items: props.memos,
    deletedItems: props.deletedMemos,
    localItems: props.localMemos,
    onItemDelete: props.onMemoDelete,
    onDeletedItemDelete: props.onDeletedMemoDelete,
    deleteButtonRef: props.deleteButtonRef,
    setIsDeleting: props.setIsDeleting,
    setIsLidOpen: props.setIsLidOpen,
    viewMode: props.viewMode,
    apiMethods,
    itemType: "memo",
    dataAttribute: "data-memo-id",
    getDisplayOrder,
    getStatusBreakdown,
    deletedTabKey: "deleted",
  });
}
