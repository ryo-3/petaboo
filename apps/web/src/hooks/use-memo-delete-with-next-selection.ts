import { useState, useCallback } from "react";
import { Memo } from "@/src/types/memo";
import {
  getMemoDisplayOrder,
  getNextItemAfterDeletion,
} from "@/src/utils/domUtils";

type MemoScreenMode = "list" | "view" | "create";

interface UseMemoDeleteWithNextSelectionProps {
  memos: Memo[] | undefined;
  onSelectMemo: (memo: Memo | null) => void;
  setMemoScreenMode?: (mode: MemoScreenMode) => void; // ボード詳細では不要
  onDeselectAndStayOnMemoList?: () => void;
  handleRightEditorDelete: (memo: Memo) => void;
  setIsRightLidOpen?: (open: boolean) => void; // ボード詳細では不要
}

export function useMemoDeleteWithNextSelection({
  memos,
  onSelectMemo,
  setMemoScreenMode,
  onDeselectAndStayOnMemoList,
  handleRightEditorDelete,
  setIsRightLidOpen,
}: UseMemoDeleteWithNextSelectionProps) {
  // 削除後に選択する次のメモを保存
  const [nextMemoAfterDelete, setNextMemoAfterDelete] = useState<Memo | null>(
    null,
  );
  // 削除中のメモIDを追跡
  const [deletingMemoId, setDeletingMemoId] = useState<number | null>(null);

  // DOM削除確認付きの削除処理
  const handleDeleteWithNextSelection = useCallback(
    (selectedMemo: Memo) => {
      console.log("🚀 共通削除処理開始", {
        selectedMemoId: selectedMemo.id,
        memosLength: memos?.length,
      });

      if (!memos) return;

      // DOM表示順を取得
      const displayOrder = getMemoDisplayOrder();

      // 削除前に次のメモを計算（DOM表示順で）
      const nextItem = getNextItemAfterDeletion(
        memos,
        selectedMemo,
        displayOrder,
      );

      console.log("🎯 次選択計算完了", {
        deletingMemoId: selectedMemo.id,
        nextItemId: nextItem?.id,
        displayOrderLength: displayOrder.length,
      });

      // 次選択を保存（削除完了後に使用）
      setNextMemoAfterDelete(nextItem);
      setDeletingMemoId(selectedMemo.id); // 削除中フラグ

      // 蓋を開いて即座に削除実行（ボード詳細では蓋なし）
      setIsRightLidOpen?.(true);
      handleRightEditorDelete(selectedMemo);
    },
    [memos, handleRightEditorDelete, setIsRightLidOpen],
  );

  // DOM削除確認処理
  const checkDomDeletionAndSelectNext = useCallback(() => {
    if (
      !deletingMemoId ||
      !memos ||
      memos.find((m) => m.id === deletingMemoId)
    ) {
      return;
    }

    // データ削除を検知、DOM削除を確認してから次選択
    console.log(`📝 メモ削除を検知（ID: ${deletingMemoId}）、DOM確認開始`);

    let checkCount = 0;
    const maxChecks = 30; // 最大3秒待つ（100ms × 30）

    const checkDomAndSelect = () => {
      checkCount++;

      // DOMから削除されたメモが消えたか確認
      const element = document.querySelector(
        `[data-memo-id="${deletingMemoId}"]`,
      );

      if (!element) {
        // DOM削除確認！即座に次選択
        console.log(
          `✅ DOM削除確認完了（${checkCount}回目、約${checkCount * 100}ms後）`,
        );

        if (nextMemoAfterDelete) {
          onSelectMemo(nextMemoAfterDelete);
          setMemoScreenMode?.("view");
        } else {
          setMemoScreenMode?.("list");
          onDeselectAndStayOnMemoList?.();
        }

        // リセット
        setDeletingMemoId(null);
        setNextMemoAfterDelete(null);

        // 蓋を閉じる（ボード詳細では蓋なし）
        setTimeout(() => {
          setIsRightLidOpen?.(false);
        }, 200);
      } else if (checkCount < maxChecks) {
        // まだDOMに存在する場合は再チェック
        console.log(`⏳ DOM削除待機中（${checkCount}回目）`);
        setTimeout(checkDomAndSelect, 100);
      } else {
        // タイムアウト：強制的に次選択
        console.warn(`⚠️ DOM削除確認タイムアウト（3秒経過）、強制的に次選択`);

        if (nextMemoAfterDelete) {
          onSelectMemo(nextMemoAfterDelete);
          setMemoScreenMode?.("view");
        } else {
          setMemoScreenMode?.("list");
          onDeselectAndStayOnMemoList?.();
        }

        // リセット
        setDeletingMemoId(null);
        setNextMemoAfterDelete(null);

        // 蓋を閉じる（ボード詳細では蓋なし）
        setTimeout(() => {
          setIsRightLidOpen?.(false);
        }, 200);
      }
    };

    // 最初のチェックを少し遅らせる（React更新サイクル待ち）
    requestAnimationFrame(() => {
      checkDomAndSelect();
    });
  }, [
    deletingMemoId,
    memos,
    nextMemoAfterDelete,
    onSelectMemo,
    setMemoScreenMode,
    onDeselectAndStayOnMemoList,
    setIsRightLidOpen,
  ]);

  return {
    handleDeleteWithNextSelection,
    checkDomDeletionAndSelectNext,
    deletingMemoId,
    nextMemoAfterDelete,
  };
}
