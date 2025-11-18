import { useRef, useEffect, useCallback } from "react";
import type { ItemType, UnsavedChangesRefs } from "@/src/types/unsaved-changes";
import { getDiscardEventName } from "@/src/types/unsaved-changes";
import type { TeamDetailContextType } from "@/src/contexts/team-detail-context";

/**
 * 未保存変更ガード用フックのオプション
 */
interface UseUnsavedChangesGuardOptions<T> {
  /** アイテムタイプ（memo/task/board） */
  itemType: ItemType;
  /** チームモードかどうか */
  teamMode: boolean;
  /** チーム詳細コンテキスト（チームモード時のみ） */
  teamDetailContext?: TeamDetailContextType | null;
  /** アイテム選択時のコールバック */
  onSelectItem: (item: T | null) => void;
  /** 画面モード設定関数 */
  setScreenMode: (mode: "list" | "view" | "create") => void;
}

/**
 * 未保存変更ガード用フックの戻り値
 */
interface UseUnsavedChangesGuardReturn<T> {
  /** 個人モード用の未保存チェック用ref */
  personalHasUnsavedChangesRef: React.MutableRefObject<boolean>;
  /** 個人モード用のモーダル表示関数ref */
  personalShowConfirmModalRef: React.MutableRefObject<(() => void) | null>;
  /** 未保存変更をチェックしてアイテム選択を実行 */
  handleSelectWithGuard: (item: T | null) => void;
}

/**
 * 未保存変更をチェックして選択をガードする共通フック
 *
 * チーム/個人モードの両方に対応し、未保存変更がある場合は
 * 確認モーダルを表示して選択を保留する。
 * ユーザーが「破棄」を選択した場合のみ、保留していた選択を実行する。
 *
 * @example
 * ```tsx
 * const {
 *   personalHasUnsavedChangesRef,
 *   personalShowConfirmModalRef,
 *   handleSelectWithGuard
 * } = useUnsavedChangesGuard({
 *   itemType: "memo",
 *   teamMode: false,
 *   onSelectItem: onSelectMemo,
 *   setScreenMode: setMemoScreenMode
 * });
 * ```
 */
export function useUnsavedChangesGuard<T = unknown>({
  itemType,
  teamMode,
  teamDetailContext,
  onSelectItem,
  setScreenMode,
}: UseUnsavedChangesGuardOptions<T>): UseUnsavedChangesGuardReturn<T> {
  // 保留中の選択アイテム
  const pendingSelectionRef = useRef<T | null>(null);

  // 個人モード用の未保存チェック用ref
  const personalHasUnsavedChangesRef = useRef<boolean>(false);
  const personalShowConfirmModalRef = useRef<(() => void) | null>(null);

  /**
   * Ref取得：チーム/個人モードに応じて適切なrefを返す
   */
  const getRefs = useCallback((): UnsavedChangesRefs | null => {
    if (teamMode) {
      if (!teamDetailContext) return null;

      // チームモードの場合、アイテムタイプに応じたrefを取得
      switch (itemType) {
        case "memo":
          return {
            hasUnsavedChangesRef:
              teamDetailContext.memoEditorHasUnsavedChangesRef,
            showConfirmModalRef:
              teamDetailContext.memoEditorShowConfirmModalRef,
          };
        case "task":
          return {
            hasUnsavedChangesRef:
              teamDetailContext.taskEditorHasUnsavedChangesRef,
            showConfirmModalRef:
              teamDetailContext.taskEditorShowConfirmModalRef,
          };
        case "board":
          // 今後実装予定
          return null;
      }
    } else {
      // 個人モードの場合
      return {
        hasUnsavedChangesRef: personalHasUnsavedChangesRef,
        showConfirmModalRef: personalShowConfirmModalRef,
      };
    }
  }, [teamMode, teamDetailContext, itemType]);

  /**
   * 未保存変更をチェックしてアイテム選択を実行
   */
  const handleSelectWithGuard = useCallback(
    (item: T | null) => {
      if (item) {
        const refs = getRefs();
        if (!refs) {
          // refsが取得できない場合はそのまま選択
          onSelectItem(item);
          if (item) {
            setScreenMode("view");
          }
          return;
        }

        const hasUnsavedChanges = refs.hasUnsavedChangesRef.current;
        const showModal = refs.showConfirmModalRef.current;

        if (hasUnsavedChanges && showModal) {
          // 選択を保留してモーダルを表示
          pendingSelectionRef.current = item;
          showModal();
          return;
        }
      }

      // 未保存変更がない、またはitemがnullの場合はそのまま選択
      onSelectItem(item);
      if (item) {
        setScreenMode("view");
      }
    },
    [itemType, teamMode, getRefs, onSelectItem, setScreenMode],
  );

  /**
   * 未保存変更破棄イベントをリッスン（保留中の選択を実行）
   */
  useEffect(() => {
    const eventName = getDiscardEventName(itemType);

    const handleUnsavedChangesDiscarded = () => {
      if (pendingSelectionRef.current) {
        const pendingItem = pendingSelectionRef.current;
        pendingSelectionRef.current = null;
        // 保留中のアイテムを選択（未保存チェックを回避するため直接実行）
        onSelectItem(pendingItem);
        setScreenMode("view");
      }
    };

    window.addEventListener(eventName, handleUnsavedChangesDiscarded);

    return () => {
      window.removeEventListener(eventName, handleUnsavedChangesDiscarded);
    };
  }, [itemType, onSelectItem, setScreenMode]);

  return {
    personalHasUnsavedChangesRef,
    personalShowConfirmModalRef,
    handleSelectWithGuard,
  };
}
