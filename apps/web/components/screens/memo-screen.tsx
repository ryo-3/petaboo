"use client";

import MemoEditor from "@/components/features/memo/memo-editor";
import { MemoCsvImport } from "@/components/features/memo/memo-csv-import";
import { useMemosBulkDelete } from "@/components/features/memo/use-memo-bulk-delete-wrapper";
import { useMemosBulkRestore } from "@/components/features/memo/use-memo-bulk-restore";
import DesktopLower from "@/components/layout/desktop-lower";
import DesktopUpper from "@/components/layout/desktop-upper";
import { BulkActionButtons } from "@/components/ui/layout/bulk-action-buttons";
import SelectionMenuButton from "@/components/ui/buttons/selection-menu-button";
import { useSortOptions } from "@/hooks/use-sort-options";
import { useBulkDeleteButton } from "@/src/hooks/use-bulk-delete-button";
import { useBulkProcessNotifications } from "@/src/hooks/use-bulk-process-notifications";
import { useDeletionLid } from "@/src/hooks/use-deletion-lid";
import { useItemDeselect } from "@/src/hooks/use-item-deselect";
import { useUnifiedRestoration } from "@/src/hooks/use-unified-restoration";
import {
  useDeletedMemos,
  useMemos,
  usePermanentDeleteMemo,
} from "@/src/hooks/use-memos";
import { useRightEditorDelete } from "@/src/hooks/use-right-editor-delete";
import { useScreenState } from "@/src/hooks/use-screen-state";
import { useMultiSelection } from "@/src/hooks/use-multi-selection";
import { useSelectAll } from "@/src/hooks/use-select-all";
import { useSelectionHandlers } from "@/src/hooks/use-selection-handlers";
import { useUserPreferences } from "@/src/hooks/use-user-preferences";
import { useTeamContext } from "@/src/contexts/team-context";
import { useViewSettings } from "@/src/contexts/view-settings-context";
import { useTeamDetail } from "@/src/contexts/team-detail-context";
import { useNavigation } from "@/src/contexts/navigation-context";
import { useHeaderControlPanel } from "@/src/contexts/header-control-panel-context";
import {
  useBoards,
  useItemBoards,
  useTeamItemBoards,
} from "@/src/hooks/use-boards";
import { useTeamBoards } from "@/src/hooks/use-team-boards";
import { useTags } from "@/src/hooks/use-tags";
import { useTeamTags } from "@/src/hooks/use-team-tags";
import TagManagementModal from "@/components/ui/tag-management/tag-management-modal";
import { useAllTaggings, useAllBoardItems } from "@/src/hooks/use-all-data";
import { useAllTeamTaggings } from "@/src/hooks/use-team-taggings";
import { useAllAttachments } from "@/src/hooks/use-all-attachments";
import type { DeletedMemo, Memo } from "@/src/types/memo";
import { OriginalIdUtils } from "@/src/types/common";
import {
  getMemoDisplayOrder,
  getNextItemAfterDeletion,
} from "@/src/utils/domUtils";
import { useMemoDeleteWithNextSelection } from "@/src/hooks/use-memo-delete-with-next-selection";
import { createToggleHandler } from "@/src/utils/toggleUtils";
import { validatePanelToggle } from "@/src/utils/panel-helpers";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ControlPanelLayout } from "@/components/layout/control-panel-layout";
import CommentSection from "@/components/features/comments/comment-section";
import AttachmentGallery from "@/components/features/attachments/attachment-gallery";
import PhotoButton from "@/components/ui/buttons/photo-button";
import { useAttachmentManager } from "@/src/hooks/use-attachment-manager";
import type { TeamMember } from "@/src/hooks/use-team-detail";
import type { HeaderControlPanelConfig } from "@/src/contexts/header-control-panel-context";
import MobileFabButton from "@/components/ui/buttons/mobile-fab-button";

type MemoScreenMode = "list" | "view" | "create";

// モバイル版画像・ファイル一覧表示コンポーネント
function MobileAttachmentView({
  selectedMemo,
  teamId,
}: {
  selectedMemo: Memo | null;
  teamId?: number;
}) {
  const attachmentManager = useAttachmentManager({
    itemType: "memo",
    item: selectedMemo,
    teamMode: !!teamId,
    teamId,
    isDeleted: false,
  });

  const {
    attachments,
    pendingImages,
    pendingDeletes,
    handleFileSelect,
    handleFilesSelect,
    handleDeleteAttachment,
    handleDeletePendingImage,
    handleRestoreAttachment,
    isDeleting,
    isUploading,
  } = attachmentManager;

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      <div className="border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">画像・ファイル</h2>
          {attachments.length > 0 && (
            <span className="text-sm text-gray-500">
              ({attachments.length}枚)
            </span>
          )}
        </div>
        <PhotoButton
          onFilesSelect={handleFilesSelect}
          multiple={true}
          buttonSize="size-9"
          iconSize="size-5"
        />
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {attachments.length === 0 && pendingImages.length === 0 ? (
          <div className="text-center text-gray-500 text-sm py-8">
            添付ファイルはありません
          </div>
        ) : (
          <AttachmentGallery
            attachments={attachments}
            onDelete={handleDeleteAttachment}
            isDeleting={isDeleting}
            pendingImages={pendingImages}
            onDeletePending={handleDeletePendingImage}
            pendingDeletes={pendingDeletes}
            onRestore={handleRestoreAttachment}
            isUploading={isUploading}
          />
        )}
      </div>
    </div>
  );
}

interface MemoScreenProps {
  selectedMemo?: Memo | null;
  selectedDeletedMemo?: DeletedMemo | null;
  onSelectMemo: (memo: Memo | null) => void;
  onSelectDeletedMemo: (memo: DeletedMemo | null) => void;
  onClose: () => void;
  onDeselectAndStayOnMemoList?: () => void; // 選択解除してメモ一覧に留まる
  rightPanelDisabled?: boolean; // 右パネル無効化（ボードから呼び出される場合）
  hideHeaderButtons?: boolean; // ヘッダーボタンを非表示（ボードから呼び出される場合）
  hideBulkActionButtons?: boolean; // 一括操作ボタンを非表示（ボードから呼び出される場合）
  disableHeaderControls?: boolean; // ヘッダーコントロールパネルを無効化
  onAddToBoard?: (memoIds: number[]) => void; // ボードに追加（ボードから呼び出される場合のみ）
  excludeBoardId?: number; // 指定されたボードに登録済みのメモを除外（ボードから呼び出される場合）
  initialSelectionMode?: "select" | "check"; // 初期選択モード
  // ボード詳細から呼び出された場合の除外アイテムリスト（originalId）
  excludeItemIds?: string[];
  // URL連動
  initialMemoId?: string | null;
  // チームメンバー（コメント機能用）
  teamMembers?: TeamMember[];

  // 統一フック（最上位から受け取り）
  unifiedOperations: {
    deleteItem: {
      mutateAsync: (id: number) => Promise<any>;
      isPending: boolean;
    };
    restoreItem: {
      mutateAsync: (originalId: string) => Promise<any>;
      isPending: boolean;
    };
  };
}

function MemoScreen({
  selectedMemo,
  selectedDeletedMemo,
  onSelectMemo,
  onSelectDeletedMemo,
  onClose,
  onDeselectAndStayOnMemoList,
  rightPanelDisabled = false,
  hideHeaderButtons = false,
  hideBulkActionButtons = false,
  disableHeaderControls = false,
  onAddToBoard,
  excludeBoardId,
  initialSelectionMode = "select",
  excludeItemIds = [],
  initialMemoId,
  unifiedOperations,
  teamMembers = [],
}: MemoScreenProps) {
  const { isTeamMode: teamMode, teamId: teamIdRaw } = useTeamContext();
  const teamId = teamIdRaw ?? undefined; // Convert null to undefined for hook compatibility
  const { setConfig } = useHeaderControlPanel();

  // ViewSettingsContextから取得
  const { settings, sessionState, updateSettings, updateSessionState } =
    useViewSettings();

  // 一括処理中断通知の監視
  useBulkProcessNotifications();

  // NavigationContext（個人モードで新規作成状態を管理）
  const navigationContext = !teamMode ? useNavigation() : null;

  // TeamDetailContext（チームモードのみ）
  const teamDetailContext = teamMode ? useTeamDetail() : null;

  // モバイル版メモエディターのアクティブタブ管理（チーム用）
  const [memoEditorTab, setMemoEditorTab] = useState<
    "memo" | "comment" | "image"
  >("memo");

  // ViewSettingsContextから取得した値を使用
  const selectedBoardIds = sessionState.selectedBoardIds;
  const setSelectedBoardIds = (ids: number[]) =>
    updateSessionState({ selectedBoardIds: ids });
  const boardFilterMode = sessionState.boardFilterMode;
  const setBoardFilterMode = (mode: "include" | "exclude") =>
    updateSessionState({ boardFilterMode: mode });
  const selectedTagIds = sessionState.selectedTagIds;
  const setSelectedTagIds = (ids: number[]) =>
    updateSessionState({ selectedTagIds: ids });
  const tagFilterMode = sessionState.tagFilterMode;
  const setTagFilterMode = (mode: "include" | "exclude") =>
    updateSessionState({ tagFilterMode: mode });
  const sortOptions = sessionState.sortOptions;
  const setSortOptions = (options: typeof sessionState.sortOptions) =>
    updateSessionState({ sortOptions: options });

  // 並び替え管理（getVisibleSortOptionsをラッパー関数として提供）
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const getVisibleSortOptions = (tab: string) => {
    // タブに応じてソートオプションをフィルタリング（現状はそのまま返す）
    return sortOptions;
  };

  // 削除ボタンの参照
  const deleteButtonRef = useRef<HTMLButtonElement>(null);

  // 削除完了時に蓋を閉じる処理
  useDeletionLid(() => setIsRightLidOpen(false));

  // 左側一括削除の状態
  const [isLeftDeleting, setIsLeftDeleting] = useState(false);
  const [isLeftLidOpen, setIsLeftLidOpen] = useState(false);

  // 右側削除の状態
  const [, setIsRightDeleting] = useState(false);
  const [isRightLidOpen, setIsRightLidOpen] = useState(false);

  // 3パネルサイズ管理は ControlPanelLayout 内部で管理

  // 復元の状態
  const [isRestoring, setIsRestoring] = useState(false);
  const [isRestoreLidOpen, setIsRestoreLidOpen] = useState(false);

  // CSVインポートモーダルの状態
  const [isCsvImportModalOpen, setIsCsvImportModalOpen] = useState(false);
  const handleCsvImport = useCallback(() => {
    setIsCsvImportModalOpen(true);
  }, []);

  // タグ管理モーダルの状態
  const [isTagManagementModalOpen, setIsTagManagementModalOpen] =
    useState(false);

  // タグ表示・編集モーダルの状態
  const [selectedMemoForTag, setSelectedMemoForTag] = useState<Memo | null>(
    null,
  );

  // データ取得
  const {
    data: memos,
    isLoading: memoLoading,
    error: memoError,
  } = useMemos({ teamMode, teamId }) as {
    data: Memo[] | undefined;
    isLoading: boolean;
    error: Error | null;
  };
  const { data: deletedMemos } = useDeletedMemos({ teamMode, teamId });

  const { preferences } = useUserPreferences(1);

  // 全データ一括取得（ちらつき解消）
  const { data: personalBoards } = useBoards("normal", !teamMode);
  const { data: teamBoards } = useTeamBoards(teamId || null, "normal");
  const boards = teamMode ? teamBoards : personalBoards;

  // 選択中のメモに紐づくボード情報を取得（フェーズ1対応）
  const selectedMemoId = OriginalIdUtils.fromItem(selectedMemo);
  const { data: personalMemoItemBoards = [] } = useItemBoards(
    "memo",
    teamMode ? undefined : selectedMemoId,
  );
  const { data: teamMemoItemBoards = [] } = useTeamItemBoards(
    teamMode ? teamId || 0 : 0,
    "memo",
    teamMode ? selectedMemoId : undefined,
  );
  const itemBoards = teamMode ? teamMemoItemBoards : personalMemoItemBoards;

  // チームモードと個人モードで異なるタグフックを使用（条件分岐で必要な方のみ取得）
  const { data: personalTags } = useTags({ enabled: !teamMode });
  const { data: teamTags } = useTeamTags(teamId ?? 0, { enabled: teamMode });
  const tags = teamMode ? teamTags : personalTags;

  // チームモードと個人モードで異なるタグ付けフックを使用（条件分岐で必要な方のみ取得）
  const { data: personalTaggings, error: personalTaggingsError } =
    useAllTaggings({ enabled: !teamMode });
  const { data: teamTaggings, error: teamTaggingsError } = useAllTeamTaggings(
    teamId ?? 0,
    { enabled: teamMode },
  );
  const allTaggings = teamMode ? teamTaggings : personalTaggings;
  const taggingsError = teamMode ? teamTaggingsError : personalTaggingsError;

  const { data: allBoardItems, error: boardItemsError } = useAllBoardItems(
    teamMode ? teamId : undefined,
  );

  // 全メモの添付ファイルを取得（サムネイル表示用）
  const { data: allMemoAttachments } = useAllAttachments(
    teamMode ? teamId : undefined,
    "memo",
    true,
  );

  // APIエラー時のフォールバック
  const safeAllTaggings = taggingsError ? [] : allTaggings || [];
  const safeAllBoardItems = boardItemsError ? [] : allBoardItems || [];

  // 統一削除・復元API（最上位から受け取り）
  const operations = unifiedOperations;

  // 共通screen状態管理（画面モード + タブのみ）
  const {
    screenMode,
    setScreenMode: setMemoScreenMode,
    activeTab,
    setActiveTab,
  } = useScreenState(
    { type: "memo", defaultActiveTab: "normal", defaultColumnCount: 4 },
    "list" as MemoScreenMode,
    selectedMemo,
    selectedDeletedMemo,
    preferences || undefined,
  );
  const memoScreenMode = screenMode as MemoScreenMode;

  const getInitialPanelState = (
    key: "showListPanel" | "showDetailPanel" | "showCommentPanel",
  ) => {
    if (typeof window !== "undefined" && teamMode) {
      const saved = localStorage.getItem("team-memo-panel-visibility");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (typeof parsed[key] === "boolean") {
            return parsed[key] as boolean;
          }
        } catch {
          // ignore parse errors
        }
      }
    }
    return true;
  };

  const [showListPanel, setShowListPanel] = useState<boolean>(() =>
    getInitialPanelState("showListPanel"),
  );
  const [showDetailPanel, setShowDetailPanel] = useState<boolean>(() =>
    getInitialPanelState("showDetailPanel"),
  );
  const [showCommentPanel, setShowCommentPanel] = useState<boolean>(() =>
    getInitialPanelState("showCommentPanel"),
  );

  useEffect(() => {
    if (!teamMode || typeof window === "undefined") {
      return;
    }

    localStorage.setItem(
      "team-memo-panel-visibility",
      JSON.stringify({
        showListPanel,
        showDetailPanel,
        showCommentPanel,
      }),
    );
  }, [showListPanel, showDetailPanel, showCommentPanel, teamMode]);

  const handleListPanelToggle = useCallback(() => {
    setShowListPanel((prev) => {
      const newValue = !prev;
      if (
        !validatePanelToggle(
          { left: prev, center: showDetailPanel, right: showCommentPanel },
          "left",
          newValue,
        )
      ) {
        return prev;
      }
      return newValue;
    });
  }, [showDetailPanel, showCommentPanel]);

  const handleDetailPanelToggle = useCallback(() => {
    setShowDetailPanel((prev) => {
      const newValue = !prev;
      if (
        !validatePanelToggle(
          { left: showListPanel, center: prev, right: showCommentPanel },
          "center",
          newValue,
        )
      ) {
        return prev;
      }
      return newValue;
    });
  }, [showListPanel, showCommentPanel]);

  const handleCommentPanelToggle = useCallback(() => {
    setShowCommentPanel((prev) => {
      const newValue = !prev;
      if (
        !validatePanelToggle(
          { left: showListPanel, center: showDetailPanel, right: prev },
          "right",
          newValue,
        )
      ) {
        return prev;
      }
      return newValue;
    });
  }, [showListPanel, showDetailPanel]);

  // 選択状態管理（useMultiSelectionに統一）
  const {
    selectionMode,
    handleSelectionModeChange,
    checkedNormalMemos,
    setCheckedNormalMemos,
    checkedDeletedMemos: checkedDeletedMemosFromMultiSelection,
    setCheckedDeletedMemos: setCheckedDeletedMemosFromMultiSelection,
  } = useMultiSelection({ activeMemoTab: activeTab, activeTaskTab: "" });

  // initialSelectionModeを反映
  useEffect(() => {
    if (initialSelectionMode && selectionMode !== initialSelectionMode) {
      handleSelectionModeChange(initialSelectionMode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // エイリアス: 既存のコードとの互換性のため（型アサーション）
  const checkedMemos = checkedNormalMemos as Set<number>;
  const setCheckedMemos = setCheckedNormalMemos as React.Dispatch<
    React.SetStateAction<Set<number>>
  >;
  const checkedDeletedMemos =
    checkedDeletedMemosFromMultiSelection as Set<number>;
  const setCheckedDeletedMemos =
    setCheckedDeletedMemosFromMultiSelection as React.Dispatch<
      React.SetStateAction<Set<number>>
    >;

  // ViewSettingsContextからカラム数を取得・設定
  const columnCount = settings.memoColumnCount;
  const setColumnCount = (count: number) =>
    updateSettings({ memoColumnCount: count });

  // 右側パネル表示時は列数を調整（useScreenStateと同じロジック）
  const effectiveColumnCount =
    memoScreenMode !== "list"
      ? columnCount <= 2
        ? columnCount
        : 2
      : columnCount;

  // 保留中の選択メモ（未保存モーダル表示時に使用）
  const pendingMemoSelectionRef = useRef<Memo | null>(null);

  const handleSelectMemo = useCallback(
    (memo: Memo | null) => {
      console.log(`🎯 [memo-screen] handleSelectMemo called`, {
        memoId: memo?.id,
        memoTitle: memo?.title,
        currentMode: memoScreenMode,
        teamMode,
      });

      // チームモードで未保存の変更がある場合は選択を保留
      if (teamMode && memo && teamDetailContext) {
        const hasUnsavedChanges =
          teamDetailContext.memoEditorHasUnsavedChangesRef.current;
        const showModal =
          teamDetailContext.memoEditorShowConfirmModalRef.current;

        if (hasUnsavedChanges && showModal) {
          console.log(`🚫 [memo-screen] 未保存の変更があるため選択を保留`, {
            pendingMemoId: memo.id,
          });
          // 選択を保留してモーダルを表示
          pendingMemoSelectionRef.current = memo;
          showModal();
          return;
        }
      }

      onSelectMemo(memo);
      // メモを選択したら必ずviewモードに切り替える
      if (memo) {
        setMemoScreenMode("view");
      }
    },
    [
      onSelectMemo,
      memoScreenMode,
      teamMode,
      setMemoScreenMode,
      teamDetailContext,
    ],
  );

  // チームモード・個人モードで新規作成状態をContextに反映
  useEffect(() => {
    if (teamDetailContext) {
      // チームモード: TeamDetailContextに反映
      teamDetailContext.setIsCreatingMemo(memoScreenMode === "create");
    } else if (navigationContext) {
      // 個人モード: NavigationContext.isCreatingMemoに反映
      // （screenModeは変更しない。"create"に変更するとCreateScreenが表示されるため）
      navigationContext.setIsCreatingMemo(memoScreenMode === "create");
    }
  }, [memoScreenMode, teamDetailContext, navigationContext]);

  // 保存完了後の処理（超シンプル）
  const handleSaveComplete = useCallback(
    (savedMemo: Memo, wasEmpty: boolean, isNewMemo: boolean) => {
      if (wasEmpty) {
        // 空メモは削除して閉じる
        onDeselectAndStayOnMemoList?.();
        setMemoScreenMode("list");
      } else if (isNewMemo) {
        // 新規作成後は、作成されたメモを選択して表示モードに切り替え
        handleSelectMemo(savedMemo);
        setMemoScreenMode("view");
      } else {
        // 既存メモ更新は選択状態更新
        handleSelectMemo(savedMemo);
      }
    },
    [
      onDeselectAndStayOnMemoList,
      setMemoScreenMode,
      handleSelectMemo,
      memoScreenMode,
    ],
  );

  // 削除完了後の処理（次のメモ選択はuseEffectで処理）
  const handleDeleteComplete = useCallback(() => {
    setIsLeftDeleting(false); // 左側削除状態をリセット
    setIsRightDeleting(false); // 右側削除状態をリセット

    // 削除完了の処理はuseEffect（memosの監視）で行う
    // ここでは状態のリセットのみ
  }, []);

  // 一括削除ボタンの表示制御
  const { showDeleteButton } = useBulkDeleteButton({
    activeTab,
    deletedTabName: "deleted",
    checkedItems: checkedMemos,
    checkedDeletedItems: checkedDeletedMemos,
    isDeleting: isLeftDeleting,
    isRestoring: isRestoreLidOpen,
  });

  // 全選択機能
  const { isAllSelected, handleSelectAll } = useSelectAll({
    activeTab,
    deletedTabName: "deleted",
    items: memos || null,
    deletedItems: deletedMemos || null,
    checkedItems: checkedMemos,
    checkedDeletedItems: checkedDeletedMemos,
    setCheckedItems: setCheckedMemos,
    setCheckedDeletedItems: setCheckedDeletedMemos,
  });

  // 選択解除処理
  const handleItemDeselect = useItemDeselect(
    selectedMemo,
    selectedDeletedMemo,
    () => onDeselectAndStayOnMemoList?.(),
    (mode: string) => setMemoScreenMode(mode as MemoScreenMode),
  );

  // 削除済みメモの削除完了後の処理（左側リスト用）
  const handleDeletedMemoDeleteComplete = useCallback(
    (deletedMemoId: number) => {
      // 削除されたメモが現在選択されている場合、次のメモを選択
      if (
        selectedDeletedMemo &&
        selectedDeletedMemo.id === deletedMemoId &&
        deletedMemos
      ) {
        const displayOrder = getMemoDisplayOrder();
        const nextItem = getNextItemAfterDeletion(
          deletedMemos,
          selectedDeletedMemo,
          displayOrder,
        );

        setTimeout(() => {
          if (nextItem && nextItem.id !== selectedDeletedMemo.id) {
            onSelectDeletedMemo(nextItem);
            setMemoScreenMode("view");
          } else {
            setMemoScreenMode("list");
            onDeselectAndStayOnMemoList?.();
          }
        }, 100);
      }
    },
    [
      selectedDeletedMemo,
      deletedMemos,
      onSelectDeletedMemo,
      onDeselectAndStayOnMemoList,
      setMemoScreenMode,
    ],
  );

  // 左側一括削除関連（チェックボックスで選択したアイテムの一括削除）
  const {
    handleBulkDelete: handleLeftBulkDelete,
    DeleteModal: BulkDeleteModal,
    currentDisplayCount,
  } = useMemosBulkDelete({
    activeTab: activeTab as "normal" | "deleted",
    checkedMemos,
    checkedDeletedMemos,
    setCheckedMemos,
    setCheckedDeletedMemos,
    memos,
    deletedMemos,
    localMemos: memos || [],
    onMemoDelete: handleItemDeselect,
    onDeletedMemoDelete: handleDeletedMemoDeleteComplete, // 削除済みメモ用コールバック
    deleteButtonRef,
    setIsDeleting: setIsLeftDeleting,
    setIsLidOpen: setIsLeftLidOpen,
    teamMode,
    teamId,
  });

  // 右側エディター削除処理（現在表示中のメモの単体削除）
  const handleRightEditorDelete = useRightEditorDelete({
    item: selectedMemo || null,
    deleteMutation: unifiedOperations.deleteItem,
    editorSelector: "[data-memo-editor]",
    setIsDeleting: setIsRightDeleting,
    onDeleteComplete: () => handleDeleteComplete(),
    executeApiFirst: false, // Memo方式：アニメーション内でAPI削除
    restoreEditorVisibility: false,
  });

  // 共通削除フック
  const {
    handleDeleteWithNextSelection,
    checkDomDeletionAndSelectNext,
    deletingItemId,
    nextItemAfterDelete,
  } = useMemoDeleteWithNextSelection({
    memos,
    onSelectMemo: handleSelectMemo,
    setMemoScreenMode,
    onDeselectAndStayOnMemoList,
    handleRightEditorDelete,
    setIsRightLidOpen,
  });

  // 復元ボタンの参照
  const restoreButtonRef = useRef<HTMLButtonElement>(null);

  // 一括復元関連
  const {
    handleBulkRestore,
    RestoreModal,
    currentDisplayCount: currentRestoreDisplayCount,
  } = useMemosBulkRestore({
    activeTab: activeTab as "normal" | "deleted",
    checkedDeletedMemos,
    setCheckedDeletedMemos,
    deletedMemos,
    onDeletedMemoRestore: handleItemDeselect,
    restoreButtonRef,
    setIsRestoring,
    setIsLidOpen: setIsRestoreLidOpen,
    teamMode,
    teamId,
  });

  // 統一復元フック（新しいシンプル実装）
  const { handleRestoreAndSelectNext: unifiedRestoreAndSelectNext } =
    useUnifiedRestoration({
      itemType: "memo",
      deletedItems: deletedMemos || null,
      selectedDeletedItem: selectedDeletedMemo || null,
      onSelectDeletedItem: onSelectDeletedMemo,
      setActiveTab,
      setScreenMode: (mode: string) =>
        setMemoScreenMode(mode as MemoScreenMode),
      teamMode,
      teamId,
      restoreItem: operations.restoreItem,
    });

  // 削除済みメモの完全削除処理
  const permanentDeleteMemo = usePermanentDeleteMemo({ teamMode, teamId });

  // タブ切り替え用の状態
  const [displayTab, setDisplayTab] = useState(activeTab);

  // URL からの初期メモ選択（初回のみ）
  const initialMemoIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (initialMemoId) {
      // selectedMemoがある場合、refを同期
      if (selectedMemo && selectedMemo.id.toString() === initialMemoId) {
        if (initialMemoIdRef.current !== initialMemoId) {
          initialMemoIdRef.current = initialMemoId;
        }
      }
      // initialMemoIdが変更され、かつselectedMemoがない場合のみ自動選択を実行
      else if (
        memos &&
        !selectedMemo &&
        initialMemoId !== initialMemoIdRef.current
      ) {
        const targetMemo = memos.find(
          (memo) => memo.id.toString() === initialMemoId,
        );
        if (targetMemo) {
          initialMemoIdRef.current = initialMemoId;
          handleSelectMemo(targetMemo);
        }
      }
    } else {
      // initialMemoIdがnullになった場合はrefもリセット
      if (initialMemoIdRef.current !== null) {
        initialMemoIdRef.current = null;
      }
    }
  }, [initialMemoId, memos, selectedMemo, handleSelectMemo]);

  // memosが更新されたら削除完了を検知して次選択
  useEffect(() => {
    checkDomDeletionAndSelectNext();
  }, [memos, checkDomDeletionAndSelectNext]);

  // カスタムタブ切り替えハンドラー - 直接状態を制御
  const handleCustomTabChange = useCallback(
    (newTab: string) => {
      // 1. 先に内部状態を全て更新（画面には反映させない）

      // 個別選択のクリア
      if (newTab === "normal" && selectedDeletedMemo) {
        onSelectDeletedMemo(null);
        setMemoScreenMode("list");
      } else if (newTab === "deleted" && selectedMemo) {
        handleSelectMemo(null);
        setMemoScreenMode("list");
      }

      // activeTabを更新
      setActiveTab(newTab);

      // 2. 状態更新完了後に表示を切り替え
      Promise.resolve().then(() => {
        setTimeout(() => {
          setDisplayTab(newTab);
        }, 0);
      });
    },
    [
      selectedMemo,
      selectedDeletedMemo,
      handleSelectMemo,
      onSelectDeletedMemo,
      setActiveTab,
      setMemoScreenMode,
    ],
  );

  // 選択ハンドラーパターン
  const {
    handleSelectItem: handleSelectMemoFromHandlers,
    handleSelectDeletedItem: handleSelectDeletedMemo,
    handleCreateNew,
    handleRightPanelClose,
  } = useSelectionHandlers<Memo, DeletedMemo>({
    setScreenMode: (mode: string) => setMemoScreenMode(mode as MemoScreenMode),
    onSelectItem: handleSelectMemo,
    onSelectDeletedItem: onSelectDeletedMemo,
    onDeselectAndStay: onDeselectAndStayOnMemoList,
    onClose: onClose,
  });

  // ヘッダーからの新規メモ作成イベントをリッスン
  useEffect(() => {
    const handleMemoCreate = () => {
      handleCreateNew();
    };

    const eventName = teamMode ? "team-memo-create" : "personal-memo-create";
    window.addEventListener(eventName, handleMemoCreate);

    return () => {
      window.removeEventListener(eventName, handleMemoCreate);
    };
  }, [teamMode, handleCreateNew]);

  // 未保存変更破棄イベントをリッスン（保留中の選択を実行）
  useEffect(() => {
    const handleUnsavedChangesDiscarded = () => {
      if (pendingMemoSelectionRef.current) {
        console.log(`✅ [memo-screen] 破棄確認後、保留中のメモを選択`, {
          pendingMemoId: pendingMemoSelectionRef.current.id,
        });
        const pendingMemo = pendingMemoSelectionRef.current;
        pendingMemoSelectionRef.current = null;
        // 保留中のメモを選択（未保存チェックを回避するため直接実行）
        onSelectMemo(pendingMemo);
        setMemoScreenMode("view");
      }
    };

    window.addEventListener(
      "memo-unsaved-changes-discarded",
      handleUnsavedChangesDiscarded,
    );

    return () => {
      window.removeEventListener(
        "memo-unsaved-changes-discarded",
        handleUnsavedChangesDiscarded,
      );
    };
  }, [onSelectMemo, setMemoScreenMode]);

  // モバイル版メモエディターのタブ切り替えイベントをリッスン
  useEffect(() => {
    const handleTabChange = (e: Event) => {
      const customEvent = e as CustomEvent<{
        tab: "memo" | "comment" | "image";
      }>;
      setMemoEditorTab(customEvent.detail.tab);
    };

    const handleBackRequest = () => {
      // メモ一覧に戻る（選択解除してメモ一覧に留まる）

      // タブ状態をリセット
      if (memoEditorTab !== "memo") {
        setMemoEditorTab("memo");
      }

      // 新規作成モードから抜ける
      if (screenMode === "create") {
        setMemoScreenMode("list");
      }

      if (onDeselectAndStayOnMemoList) {
        onDeselectAndStayOnMemoList();
      } else {
        handleSelectMemo(null);
      }
    };

    window.addEventListener("memo-editor-tab-change", handleTabChange);
    const backEventName = teamMode
      ? "team-back-to-memo-list"
      : "memo-editor-mobile-back-requested";
    window.addEventListener(backEventName, handleBackRequest);

    return () => {
      window.removeEventListener("memo-editor-tab-change", handleTabChange);
      window.removeEventListener(backEventName, handleBackRequest);
    };
  }, [
    handleSelectMemo,
    onDeselectAndStayOnMemoList,
    teamMode,
    screenMode,
    setMemoScreenMode,
    memoEditorTab,
  ]);

  // 除外アイテムIDでフィルタリングされたメモ（originalIdで比較）
  const filteredMemos =
    memos?.filter(
      (memo) => !excludeItemIds.includes(memo.originalId || memo.id.toString()),
    ) || [];

  // アイテム選択時のみパネルコントロールを表示（3パネル切り替え用）
  const shouldShowPanelControls = teamMode && memoScreenMode !== "list";

  const memoRightPanelMode = (memoScreenMode === "list" ? "hidden" : "view") as
    | "hidden"
    | "view"
    | "create";

  const desktopUpperCommonProps = {
    currentMode: "memo" as const,
    activeTab: displayTab as "normal" | "deleted",
    onTabChange: handleCustomTabChange,
    rightPanelMode: memoRightPanelMode,
    normalCount: memos?.length || 0,
    deletedMemosCount: deletedMemos?.length || 0,
    marginBottom: "",
    headerMarginBottom: "mb-1.5",
    teamMode,
  };

  const memoHeaderConfig = useMemo<HeaderControlPanelConfig | null>(() => {
    if (disableHeaderControls) {
      return null;
    }

    const config: HeaderControlPanelConfig = {
      currentMode: "memo",
      rightPanelMode: memoRightPanelMode,
      selectionMode,
      onSelectionModeChange: handleSelectionModeChange,
      onSelectAll: handleSelectAll,
      isAllSelected,
      onCsvImport: handleCsvImport,
      activeTab: displayTab,
      normalCount: memos?.length || 0,
      deletedMemosCount: deletedMemos?.length || 0,
      hideAddButton: hideHeaderButtons,
      teamMode,
      teamId,
      hideControls: preferences?.memoHideControls,
    };

    if (shouldShowPanelControls) {
      config.isSelectedMode = true;
      config.showMemo = showListPanel;
      config.showTask = showDetailPanel;
      config.showComment = showCommentPanel;
      config.onMemoToggle = handleListPanelToggle;
      config.onTaskToggle = handleDetailPanelToggle;
      config.onCommentToggle = handleCommentPanelToggle;
      config.contentFilterRightPanelMode = "editor";
      config.listTooltip = "メモ一覧パネル";
      config.detailTooltip = "メモ詳細パネル";
      config.selectedItemType = "memo";
    }

    return config;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    disableHeaderControls,
    memoRightPanelMode,
    selectionMode,
    // handleSelectionModeChange, // 関数は除外
    // handleSelectAll, // 関数は除外
    isAllSelected,
    // handleCsvImport, // 関数は除外
    displayTab,
    memos?.length,
    deletedMemos?.length,
    hideHeaderButtons,
    teamMode,
    teamId,
    preferences?.memoHideControls,
    shouldShowPanelControls,
    showListPanel,
    showDetailPanel,
    showCommentPanel,
    // handleListPanelToggle, // 関数は除外
    // handleDetailPanelToggle, // 関数は除外
    // handleCommentPanelToggle, // 関数は除外
  ]);

  const headerOwnerRef = useRef<symbol | null>(null);

  useEffect(() => {
    if (!memoHeaderConfig) {
      if (headerOwnerRef.current) {
        setConfig(null);
        headerOwnerRef.current = null;
      }
      return;
    }

    const owner = Symbol("header-control-panel");
    headerOwnerRef.current = owner;
    setConfig(memoHeaderConfig);

    return () => {
      if (headerOwnerRef.current === owner) {
        setConfig(null);
        headerOwnerRef.current = null;
      }
    };
  }, [memoHeaderConfig]);

  // 左パネルのコンテンツ
  const leftPanelContent = (
    <div className="pl-4 pt-3 flex flex-col h-full relative">
      <DesktopUpper {...desktopUpperCommonProps} />

      <div className="flex-1 min-h-0 overflow-y-auto">
        <DesktopLower
          currentMode="memo"
          activeTab={displayTab as "normal" | "deleted"}
          effectiveColumnCount={effectiveColumnCount}
          isLoading={memoLoading}
          error={memoError}
          selectionMode={selectionMode}
          memos={filteredMemos}
          localMemos={filteredMemos}
          deletedMemos={deletedMemos || []}
          selectedMemo={selectedMemo}
          selectedDeletedMemo={selectedDeletedMemo}
          checkedMemos={checkedMemos}
          checkedDeletedMemos={checkedDeletedMemos}
          onToggleCheckMemo={createToggleHandler(checkedMemos, setCheckedMemos)}
          onToggleCheckDeletedMemo={createToggleHandler(
            checkedDeletedMemos,
            setCheckedDeletedMemos,
          )}
          onSelectMemo={handleSelectMemo}
          onSelectDeletedMemo={handleSelectDeletedMemo}
          teamMode={teamMode}
          // 全データ事前取得（ちらつき解消）
          allTags={tags || []}
          allBoards={boards || []}
          allTaggings={safeAllTaggings || []}
          allBoardItems={safeAllBoardItems || []}
          allAttachments={allMemoAttachments || []}
          // フィルター設定（ViewSettingsContextから取得）
          selectedTagIds={selectedTagIds}
          tagFilterMode={tagFilterMode}
          selectedBoardIds={selectedBoardIds}
          boardFilterMode={boardFilterMode}
        />
      </div>

      {/* 一括操作ボタン */}
      {!hideBulkActionButtons && (
        <BulkActionButtons
          showDeleteButton={showDeleteButton}
          deleteButtonCount={currentDisplayCount}
          onDelete={() => {
            handleLeftBulkDelete();
          }}
          deleteButtonRef={deleteButtonRef}
          isDeleting={isLeftLidOpen}
          deleteVariant={activeTab === "deleted" ? "danger" : undefined}
          showRestoreButton={
            activeTab === "deleted" &&
            !isLeftDeleting &&
            (checkedDeletedMemos.size > 0 ||
              (isRestoring && currentRestoreDisplayCount > 0))
          }
          restoreCount={checkedDeletedMemos.size}
          onRestore={() => {
            // 復元ボタンを押した瞬間に削除ボタンを非表示にする
            setIsRestoreLidOpen(true);
            handleBulkRestore();
          }}
          restoreButtonRef={restoreButtonRef}
          isRestoring={isRestoreLidOpen}
          animatedRestoreCount={currentRestoreDisplayCount}
          useAnimatedRestoreCount={true}
        />
      )}

      {/* 選択メニューボタン（通常タブでアイテム選択時） */}
      {!hideBulkActionButtons && (
        <SelectionMenuButton
          count={checkedMemos.size}
          onExport={() => {
            // TODO: エクスポート処理
          }}
          onPin={() => {
            // TODO: ピン止め処理
          }}
          onTagging={() => {
            setIsTagManagementModalOpen(true);
          }}
          onTabMove={() => {
            // TODO: タブ移動処理
          }}
          isVisible={
            activeTab === "normal" && checkedMemos.size > 0 && !isLeftDeleting
          }
        />
      )}

      {/* ボード追加ボタン（ボードから呼び出された場合のみ） */}
      {onAddToBoard && checkedMemos.size > 0 && activeTab === "normal" && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20">
          <button
            onClick={() => {
              onAddToBoard(Array.from(checkedMemos));
            }}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            選択したメモをボードに追加 ({checkedMemos.size})
          </button>
        </div>
      )}
    </div>
  );

  // 中央パネルのコンテンツ（エディター部分）
  const centerPanelContent = (
    <div className={shouldShowPanelControls && !showListPanel ? "pl-2" : ""}>
      {/* 左パネル非表示時は中央にヘッダーを表示 */}
      {shouldShowPanelControls && !showListPanel && (
        <DesktopUpper {...desktopUpperCommonProps} hideTabs={true} />
      )}
      {/* 新規作成モード */}
      {memoScreenMode === "create" && (
        <MemoEditor
          memo={null}
          onClose={() => setMemoScreenMode("list")}
          onSaveComplete={handleSaveComplete}
          customHeight="flex-1 min-h-0"
          preloadedTags={tags || []}
          preloadedBoards={boards || []}
          preloadedTaggings={safeAllTaggings || []}
          preloadedBoardItems={safeAllBoardItems || []}
          preloadedItemBoards={itemBoards}
          showDateAtBottom={true}
          unifiedOperations={operations}
        />
      )}
      {/* 表示モード（既存メモ） */}
      {memoScreenMode === "view" && selectedMemo && !selectedDeletedMemo && (
        <MemoEditor
          memo={selectedMemo}
          onClose={() => {
            if (teamMode) {
              onClose();
            } else {
              onSelectMemo(null); // 個人モードでは選択を解除
            }
            setMemoScreenMode("list");
          }}
          onSaveComplete={handleSaveComplete}
          onDelete={() => {
            if (selectedMemo) {
              handleDeleteWithNextSelection(selectedMemo);
            }
          }}
          isLidOpen={isRightLidOpen}
          customHeight="flex-1 min-h-0"
          preloadedTags={tags || []}
          preloadedBoards={boards || []}
          preloadedTaggings={safeAllTaggings || []}
          preloadedBoardItems={safeAllBoardItems || []}
          createdBy={selectedMemo.createdBy}
          createdByUserId={selectedMemo.userId}
          createdByAvatarColor={selectedMemo.avatarColor}
          showDateAtBottom={true}
          unifiedOperations={operations}
        />
      )}
      {/* 表示モード（削除済みメモ） */}
      {memoScreenMode === "view" && selectedDeletedMemo && !selectedMemo && (
        <MemoEditor
          memo={selectedDeletedMemo}
          onClose={() => {
            setMemoScreenMode("list");
            if (activeTab === "deleted") {
              setActiveTab("normal");
            }
            onDeselectAndStayOnMemoList?.();
          }}
          onRestore={unifiedRestoreAndSelectNext}
          onDelete={async () => {
            if (selectedDeletedMemo && deletedMemos) {
              const displayOrder = getMemoDisplayOrder();
              const nextItem = getNextItemAfterDeletion(
                deletedMemos,
                selectedDeletedMemo,
                displayOrder,
              );

              setIsRightLidOpen(true);

              try {
                await permanentDeleteMemo.mutateAsync(
                  selectedDeletedMemo.originalId,
                );
              } catch (error) {
                console.error("❌ 完全削除エラー:", error);
                setIsRightLidOpen(false);
                return;
              }

              if (nextItem && nextItem.id !== selectedDeletedMemo.id) {
                onSelectDeletedMemo(nextItem);
                setMemoScreenMode("view");
              } else {
                setMemoScreenMode("list");
                onDeselectAndStayOnMemoList?.();
              }

              setIsRightLidOpen(false);
            }
          }}
          isLidOpen={isRightLidOpen}
          customHeight="flex-1 min-h-0"
          preloadedTags={tags || []}
          preloadedBoards={boards || []}
          preloadedTaggings={safeAllTaggings || []}
          preloadedBoardItems={safeAllBoardItems || []}
          createdBy={selectedDeletedMemo.createdBy}
          createdByUserId={selectedDeletedMemo.userId}
          createdByAvatarColor={selectedDeletedMemo.avatarColor}
          totalDeletedCount={deletedMemos?.length || 0}
          unifiedOperations={operations}
        />
      )}
    </div>
  );

  // 右パネルのコンテンツ（チームモードのみコメント表示）
  const rightPanelContent =
    teamMode &&
    memoScreenMode !== "create" &&
    selectedMemo &&
    showCommentPanel ? (
      <>
        {shouldShowPanelControls && !showListPanel && !showDetailPanel && (
          <DesktopUpper {...desktopUpperCommonProps} hideTabs={true} />
        )}
        <CommentSection
          targetType="memo"
          targetOriginalId={OriginalIdUtils.fromItem(selectedMemo) || ""}
          teamId={teamId || 0}
          title="コメント"
          placeholder="コメントを入力..."
          teamMembers={teamMembers}
        />
      </>
    ) : null;

  return (
    <div className="h-full">
      {/* デスクトップ表示 */}
      <div className="hidden md:block h-full">
        {memoScreenMode === "list" ? (
          // リストモード: 1パネル表示
          leftPanelContent
        ) : (
          // 選択モード: 2/3パネル表示
          <ControlPanelLayout
            leftPanel={leftPanelContent}
            centerPanel={centerPanelContent}
            rightPanel={rightPanelContent}
            storageKey={
              teamMode
                ? "team-memo-3panel-sizes-v2"
                : "personal-memo-2panel-sizes-v1"
            }
            defaultSizes={
              teamMode
                ? { left: 25, center: 45, right: 30 }
                : { left: 35, center: 65, right: 0 }
            }
            skipInitialSave={true}
            stateKey={selectedMemo?.originalId || "none"}
            visibility={
              teamMode
                ? {
                    left: showListPanel,
                    center: showDetailPanel,
                    right: showCommentPanel,
                  }
                : undefined
            }
          />
        )}
      </div>

      {/* モバイル: 1パネル表示（一覧 OR メモ OR コメント OR 画像 排他的表示） */}
      <div className="md:hidden h-full flex flex-col">
        {!selectedMemo &&
        !selectedDeletedMemo &&
        memoScreenMode !== "create" ? (
          <>
            {/* ツールバーを固定位置に配置 */}
            <div className="flex-shrink-0 bg-white">
              <DesktopUpper
                currentMode="memo"
                activeTab={displayTab as "normal" | "deleted"}
                onTabChange={handleCustomTabChange}
                rightPanelMode={memoRightPanelMode}
                normalCount={memos?.length || 0}
                deletedMemosCount={deletedMemos?.length || 0}
                teamMode={teamMode}
                marginBottom=""
                headerMarginBottom="mb-1.5"
              />
            </div>
            {/* スクロール可能なコンテンツ */}
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
              <DesktopLower
                currentMode="memo"
                activeTab={displayTab as "normal" | "deleted"}
                effectiveColumnCount={effectiveColumnCount}
                isLoading={memoLoading}
                error={memoError}
                selectionMode={selectionMode}
                memos={filteredMemos}
                localMemos={filteredMemos}
                deletedMemos={deletedMemos || []}
                selectedMemo={selectedMemo}
                selectedDeletedMemo={selectedDeletedMemo}
                checkedMemos={checkedMemos}
                checkedDeletedMemos={checkedDeletedMemos}
                onToggleCheckMemo={createToggleHandler(
                  checkedMemos,
                  setCheckedMemos,
                )}
                onToggleCheckDeletedMemo={createToggleHandler(
                  checkedDeletedMemos,
                  setCheckedDeletedMemos,
                )}
                onSelectMemo={handleSelectMemo}
                onSelectDeletedMemo={handleSelectDeletedMemo}
                teamMode={teamMode}
                allTags={tags || []}
                allBoards={boards || []}
                allTaggings={safeAllTaggings || []}
                allBoardItems={safeAllBoardItems || []}
                allAttachments={allMemoAttachments || []}
                // フィルター設定（ViewSettingsContextから取得）
                selectedTagIds={selectedTagIds}
                tagFilterMode={tagFilterMode}
                selectedBoardIds={selectedBoardIds}
                boardFilterMode={boardFilterMode}
              />
              {/* モバイル: メモ追加FABボタン（削除済みタブ以外で表示） */}
              <MobileFabButton
                type="memo"
                teamMode={teamMode}
                show={activeTab !== "deleted"}
              />
            </div>
          </>
        ) : memoEditorTab === "memo" ? (
          <div className="h-full overflow-y-auto overscroll-contain">
            {centerPanelContent}
          </div>
        ) : memoEditorTab === "comment" ? (
          <div className="h-full overflow-y-auto overscroll-contain">
            {rightPanelContent}
          </div>
        ) : (
          <div className="h-full overflow-y-auto overscroll-contain">
            <MobileAttachmentView
              selectedMemo={selectedMemo || null}
              teamId={teamId}
            />
          </div>
        )}
      </div>

      {/* モーダル（3パネルレイアウト外側） */}
      <BulkDeleteModal />
      <RestoreModal />
      <MemoCsvImport
        isOpen={isCsvImportModalOpen}
        onClose={() => setIsCsvImportModalOpen(false)}
      />
      <TagManagementModal
        isOpen={isTagManagementModalOpen}
        onClose={() => setIsTagManagementModalOpen(false)}
        tags={
          tags?.map((tag) => ({
            id: tag.id,
            name: tag.name,
            color: tag.color,
          })) || []
        }
        selectedItemCount={checkedMemos.size}
        itemType="memo"
        selectedItems={Array.from(checkedMemos).map((id) => id.toString())}
        allItems={memos || []}
        allTaggings={safeAllTaggings || []}
        onSuccess={() => {
          setCheckedMemos(new Set());
        }}
      />
      {selectedMemoForTag && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-[90vw] max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">タグ編集</h3>
              <button
                onClick={() => setSelectedMemoForTag(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <span className="sr-only">閉じる</span>×
              </button>
            </div>

            <div className="mb-4">
              <div className="text-sm font-medium mb-2 truncate">
                {selectedMemoForTag.title || "タイトルなし"}
              </div>
              <div className="text-sm text-gray-500">
                {/* TODO: TagSelector コンポーネントの実装 */}
                タグ選択・編集機能（実装予定）
              </div>
            </div>

            <div className="flex justify-end mt-4 gap-2">
              <button
                onClick={() => setSelectedMemoForTag(null)}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MemoScreen;
