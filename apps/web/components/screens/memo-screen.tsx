"use client";

import MemoEditor from "@/components/features/memo/memo-editor";
import { MemoCsvImport } from "@/components/features/memo/memo-csv-import";
import { useMemosBulkDelete } from "@/components/features/memo/use-memo-bulk-delete-wrapper";
import { useMemosBulkRestore } from "@/components/features/memo/use-memo-bulk-restore";
import DesktopLower from "@/components/layout/desktop-lower";
import DesktopUpper from "@/components/layout/desktop-upper";
import { BulkActionButtons } from "@/components/ui/layout/bulk-action-buttons";
import SelectionMenuButton from "@/components/ui/buttons/selection-menu-button";
import RightPanel from "@/components/ui/layout/right-panel";
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
import { useSelectAll } from "@/src/hooks/use-select-all";
import { useSelectionHandlers } from "@/src/hooks/use-selection-handlers";
import { useUserPreferences } from "@/src/hooks/use-user-preferences";
import { useTeamContext } from "@/contexts/team-context";
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
import type { DeletedMemo, Memo } from "@/src/types/memo";
import { OriginalIdUtils } from "@/src/types/common";
import {
  getMemoDisplayOrder,
  getNextItemAfterDeletion,
} from "@/src/utils/domUtils";
import { useMemoDeleteWithNextSelection } from "@/src/hooks/use-memo-delete-with-next-selection";
import { createToggleHandler } from "@/src/utils/toggleUtils";
import { useCallback, useEffect, useRef, useState } from "react";
import { ControlPanelLayout } from "@/components/layout/control-panel-layout";
import CommentSection from "@/components/features/comments/comment-section";
import type { TeamMember } from "@/src/hooks/use-team-detail";

type MemoScreenMode = "list" | "view" | "create";

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
  onAddToBoard?: (memoIds: number[]) => void; // ボードに追加（ボードから呼び出される場合のみ）
  forceShowBoardName?: boolean; // ボード名表示を強制的に有効化（ボードから呼び出される場合）
  excludeBoardId?: number; // 指定されたボードに登録済みのメモを除外（ボードから呼び出される場合）
  initialSelectionMode?: "select" | "check"; // 初期選択モード
  // ボード詳細から呼び出された場合の除外アイテムリスト（originalId）
  excludeItemIds?: string[];
  // ボードフィルターの選択肢から除外するボードID
  excludeBoardIdFromFilter?: number;
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
  onAddToBoard,
  forceShowBoardName = false,
  excludeBoardId,
  initialSelectionMode = "select",
  excludeItemIds = [],
  excludeBoardIdFromFilter,
  initialMemoId,
  unifiedOperations,
  teamMembers = [],
}: MemoScreenProps) {
  const { isTeamMode: teamMode, teamId: teamIdRaw } = useTeamContext();
  const teamId = teamIdRaw ?? undefined; // Convert null to undefined for hook compatibility
  // 一括処理中断通知の監視
  useBulkProcessNotifications();

  // 選択モード管理
  const [selectionMode, setSelectionMode] = useState<"select" | "check">(
    initialSelectionMode,
  );

  // 編集日表示管理
  const [showEditDate, setShowEditDate] = useState(false);

  // ボード名表示管理
  const [showBoardName, setShowBoardName] = useState(forceShowBoardName);

  // タグ表示管理
  const [showTagDisplay, setShowTagDisplay] = useState(false);

  // ボードフィルター管理
  const [selectedBoardIds, setSelectedBoardIds] = useState<number[]>(
    excludeBoardId ? [excludeBoardId] : [],
  );
  const [boardFilterMode, setBoardFilterMode] = useState<"include" | "exclude">(
    excludeBoardId ? "exclude" : "include",
  );

  // タグフィルター管理
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [tagFilterMode, setTagFilterMode] = useState<"include" | "exclude">(
    "include",
  );

  // 並び替え管理
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { sortOptions, setSortOptions, getVisibleSortOptions } =
    useSortOptions("memo");

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

  // APIエラー時のフォールバック
  const safeAllTaggings = taggingsError ? [] : allTaggings || [];
  const safeAllBoardItems = boardItemsError ? [] : allBoardItems || [];

  // 統一削除・復元API（最上位から受け取り）
  const operations = unifiedOperations;

  // 共通screen状態管理
  const {
    screenMode,
    setScreenMode: setMemoScreenMode,
    activeTab,
    setActiveTab,
    viewMode,
    setViewMode,
    columnCount,
    setColumnCount,
    checkedItems: checkedMemos,
    setCheckedItems: setCheckedMemos,
    checkedDeletedItems: checkedDeletedMemos,
    setCheckedDeletedItems: setCheckedDeletedMemos,
    effectiveColumnCount,
  } = useScreenState(
    { type: "memo", defaultActiveTab: "normal", defaultColumnCount: 4 },
    "list" as MemoScreenMode,
    selectedMemo,
    selectedDeletedMemo,
    preferences || undefined,
  );
  const memoScreenMode = screenMode as MemoScreenMode;

  // 保存完了後の処理（超シンプル）
  const handleSaveComplete = useCallback(
    (savedMemo: Memo, wasEmpty: boolean, isNewMemo: boolean) => {
      if (wasEmpty) {
        // 空メモは削除して閉じる
        onDeselectAndStayOnMemoList?.();
        setMemoScreenMode("list");
      } else if (isNewMemo) {
        // 新規作成後は、作成されたメモを選択して表示モードに切り替え
        onSelectMemo(savedMemo);
        setMemoScreenMode("view");
      } else {
        // 既存メモ更新は選択状態更新
        onSelectMemo(savedMemo);
      }
    },
    [onDeselectAndStayOnMemoList, setMemoScreenMode, onSelectMemo],
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
    viewMode,
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
    onSelectMemo,
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
          onSelectMemo(targetMemo);
        }
      }
    } else {
      // initialMemoIdがnullになった場合はrefもリセット
      if (initialMemoIdRef.current !== null) {
        initialMemoIdRef.current = null;
      }
    }
  }, [initialMemoId, memos, selectedMemo, onSelectMemo]);

  // memosが更新されたら削除完了を検知して次選択
  useEffect(() => {
    checkDomDeletionAndSelectNext();
  }, [memos, checkDomDeletionAndSelectNext]);

  // 削除済タブでの表示状態初期化
  useEffect(() => {
    if (activeTab === "deleted") {
      setShowBoardName(false);
      setShowTagDisplay(false);
    } else if (activeTab === "normal") {
      setShowBoardName(forceShowBoardName);
    }
  }, [activeTab, forceShowBoardName]);

  // カスタムタブ切り替えハンドラー - 直接状態を制御
  const handleCustomTabChange = useCallback(
    (newTab: string) => {
      // 1. 先に内部状態を全て更新（画面には反映させない）

      // 個別選択のクリア
      if (newTab === "normal" && selectedDeletedMemo) {
        onSelectDeletedMemo(null);
        setMemoScreenMode("list");
      } else if (newTab === "deleted" && selectedMemo) {
        onSelectMemo(null);
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
      onSelectMemo,
      onSelectDeletedMemo,
      setActiveTab,
      setMemoScreenMode,
    ],
  );

  // 選択ハンドラーパターン
  const {
    handleSelectItem: handleSelectMemo,
    handleSelectDeletedItem: handleSelectDeletedMemo,
    handleCreateNew,
    handleRightPanelClose,
  } = useSelectionHandlers<Memo, DeletedMemo>({
    setScreenMode: (mode: string) => setMemoScreenMode(mode as MemoScreenMode),
    onSelectItem: onSelectMemo,
    onSelectDeletedItem: onSelectDeletedMemo,
    onDeselectAndStay: onDeselectAndStayOnMemoList,
    onClose: onClose,
  });

  // ヘッダーからの新規メモ作成イベントをリッスン（チームモードのみ）
  useEffect(() => {
    if (!teamMode) return;

    const handleTeamMemoCreate = () => {
      handleCreateNew();
    };

    window.addEventListener("team-memo-create", handleTeamMemoCreate);

    return () => {
      window.removeEventListener("team-memo-create", handleTeamMemoCreate);
    };
  }, [teamMode, handleCreateNew]);

  // 除外アイテムIDでフィルタリングされたメモ（originalIdで比較）
  const filteredMemos =
    memos?.filter(
      (memo) => !excludeItemIds.includes(memo.originalId || memo.id.toString()),
    ) || [];

  // ボードフィルターから除外するボードをフィルタリング
  const filteredBoards =
    boards?.filter((board) => board.id !== excludeBoardIdFromFilter) || [];

  // チームモード＆選択時は3パネルレイアウト
  const shouldUseThreePanelLayout = teamMode && memoScreenMode !== "list";

  // 左パネルのコンテンツ（3パネル・2パネル両方で使用）
  const leftPanelContent = (
    <div
      className={`${hideHeaderButtons ? "pt-2 md:pt-3" : "pt-2 md:pt-3 pl-2 md:pl-5 md:pr-2"} flex flex-col h-full relative`}
    >
      <DesktopUpper
        currentMode="memo"
        activeTab={displayTab as "normal" | "deleted"}
        onTabChange={handleCustomTabChange}
        onCreateNew={handleCreateNew}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        columnCount={columnCount}
        onColumnCountChange={setColumnCount}
        rightPanelMode={
          shouldUseThreePanelLayout
            ? "view"
            : memoScreenMode === "list"
              ? "hidden"
              : "view"
        }
        selectionMode={selectionMode}
        onSelectionModeChange={(mode) => {
          setSelectionMode(mode);
          // checkモードからselectモードに切り替える時、選択状態をクリア
          if (mode === "select") {
            setCheckedMemos(new Set());
            setCheckedDeletedMemos(new Set());
          }
        }}
        onSelectAll={handleSelectAll}
        isAllSelected={isAllSelected}
        sortOptions={getVisibleSortOptions(activeTab)}
        hideControls={false}
        floatControls={true}
        onSortChange={setSortOptions}
        showEditDate={showEditDate}
        onShowEditDateChange={setShowEditDate}
        showBoardName={showBoardName}
        onShowBoardNameChange={setShowBoardName}
        showTagDisplay={showTagDisplay}
        onShowTagDisplayChange={setShowTagDisplay}
        boards={filteredBoards}
        selectedBoardIds={selectedBoardIds}
        onBoardFilterChange={setSelectedBoardIds}
        filterMode={boardFilterMode}
        onFilterModeChange={setBoardFilterMode}
        tags={tags || []}
        selectedTagIds={selectedTagIds}
        onTagFilterChange={setSelectedTagIds}
        tagFilterMode={tagFilterMode}
        onTagFilterModeChange={setTagFilterMode}
        normalCount={memos?.length || 0}
        deletedMemosCount={deletedMemos?.length || 0}
        hideAddButton={hideHeaderButtons}
        onCsvImport={() => setIsCsvImportModalOpen(true)}
        teamMode={teamMode}
        marginBottom=""
        headerMarginBottom="mb-1.5"
      />

      <DesktopLower
        currentMode="memo"
        activeTab={displayTab as "normal" | "deleted"}
        viewMode={viewMode}
        effectiveColumnCount={effectiveColumnCount}
        isLoading={memoLoading}
        error={memoError}
        selectionMode={selectionMode}
        sortOptions={getVisibleSortOptions(activeTab)}
        showEditDate={showEditDate}
        showBoardName={showBoardName}
        showTags={showTagDisplay}
        selectedBoardIds={selectedBoardIds}
        boardFilterMode={boardFilterMode}
        selectedTagIds={selectedTagIds}
        tagFilterMode={tagFilterMode}
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
      />

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
    <>
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
            onClose();
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
    </>
  );

  // 右パネルのコンテンツ（コメント部分）
  const rightPanelContent = selectedMemo && (
    <CommentSection
      targetType="memo"
      targetOriginalId={OriginalIdUtils.fromItem(selectedMemo) || ""}
      teamId={teamId || 0}
      teamMembers={teamMembers}
      title="コメント"
      placeholder="コメントを入力..."
    />
  );

  return shouldUseThreePanelLayout ? (
    // ===== 3パネルレイアウト（チームモード＆選択時） =====
    <div className="h-full">
      {/* デスクトップ: 3パネル表示 */}
      <div className="hidden md:block md:min-w-[1280px] h-full">
        <ControlPanelLayout
          leftPanel={leftPanelContent}
          centerPanel={centerPanelContent}
          rightPanel={rightPanelContent}
          storageKey="team-memo-3panel-sizes-v2"
          defaultSizes={{ left: 25, center: 45, right: 30 }}
        />
      </div>

      {/* モバイル: 1パネル表示（詳細+コメント縦並び） */}
      <div className="md:hidden h-full flex flex-col bg-white">
        <div className="flex-1 min-h-0 flex flex-col">{centerPanelContent}</div>
        <div className="flex-shrink-0 max-h-[40vh] overflow-y-auto hover-scrollbar">
          {rightPanelContent}
        </div>
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
  ) : (
    // ===== 2パネルレイアウト（個人モードまたは未選択時） =====
    <div className="flex h-full bg-white relative">
      {/* 左側：一覧表示エリア（スマホでは詳細表示時に非表示） */}
      <div
        className={`${memoScreenMode === "list" ? "w-full" : "hidden md:flex md:w-[44%]"} ${memoScreenMode !== "list" ? "md:border-r md:border-gray-300" : ""} pt-2 md:pt-3 pl-2 md:pl-5 md:pr-2 flex-col relative ${!teamMode ? "transition-all duration-300" : ""}`}
      >
        <DesktopUpper
          currentMode="memo"
          activeTab={displayTab as "normal" | "deleted"}
          onTabChange={handleCustomTabChange}
          onCreateNew={handleCreateNew}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          columnCount={columnCount}
          onColumnCountChange={setColumnCount}
          rightPanelMode={memoScreenMode === "list" ? "hidden" : "view"}
          selectionMode={selectionMode}
          onSelectionModeChange={(mode) => {
            setSelectionMode(mode);
            if (mode === "select") {
              setCheckedMemos(new Set());
              setCheckedDeletedMemos(new Set());
            }
          }}
          onSelectAll={handleSelectAll}
          isAllSelected={isAllSelected}
          sortOptions={getVisibleSortOptions(activeTab)}
          onSortChange={setSortOptions}
          showEditDate={showEditDate}
          onShowEditDateChange={setShowEditDate}
          showBoardName={showBoardName}
          onShowBoardNameChange={setShowBoardName}
          showTagDisplay={showTagDisplay}
          onShowTagDisplayChange={setShowTagDisplay}
          boards={filteredBoards}
          selectedBoardIds={selectedBoardIds}
          onBoardFilterChange={setSelectedBoardIds}
          filterMode={boardFilterMode}
          onFilterModeChange={setBoardFilterMode}
          tags={tags || []}
          selectedTagIds={selectedTagIds}
          onTagFilterChange={setSelectedTagIds}
          tagFilterMode={tagFilterMode}
          onTagFilterModeChange={setTagFilterMode}
          normalCount={memos?.length || 0}
          deletedMemosCount={deletedMemos?.length || 0}
          hideAddButton={hideHeaderButtons}
          onCsvImport={() => setIsCsvImportModalOpen(true)}
          teamMode={teamMode}
          hideControls={false}
          floatControls={teamMode}
          marginBottom=""
          headerMarginBottom="mb-1.5"
        />

        <DesktopLower
          currentMode="memo"
          activeTab={displayTab as "normal" | "deleted"}
          viewMode={viewMode}
          effectiveColumnCount={effectiveColumnCount}
          isLoading={memoLoading}
          error={memoError}
          selectionMode={selectionMode}
          sortOptions={getVisibleSortOptions(activeTab)}
          showEditDate={showEditDate}
          showBoardName={showBoardName}
          showTags={showTagDisplay}
          selectedBoardIds={selectedBoardIds}
          boardFilterMode={boardFilterMode}
          selectedTagIds={selectedTagIds}
          tagFilterMode={tagFilterMode}
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
          allTags={tags || []}
          allBoards={boards || []}
          allTaggings={safeAllTaggings || []}
          allBoardItems={safeAllBoardItems || []}
        />

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
              setIsRestoreLidOpen(true);
              handleBulkRestore();
            }}
            restoreButtonRef={restoreButtonRef}
            isRestoring={isRestoreLidOpen}
            animatedRestoreCount={currentRestoreDisplayCount}
            useAnimatedRestoreCount={true}
          />
        )}

        {/* 選択メニューボタン */}
        {!hideBulkActionButtons && (
          <SelectionMenuButton
            count={checkedMemos.size}
            onExport={() => {}}
            onPin={() => {}}
            onTagging={() => {
              setIsTagManagementModalOpen(true);
            }}
            onTabMove={() => {}}
            isVisible={
              activeTab === "normal" && checkedMemos.size > 0 && !isLeftDeleting
            }
          />
        )}

        {/* ボード追加ボタン */}
        {onAddToBoard && checkedMemos.size > 0 && activeTab === "normal" && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20">
            <button
              onClick={() => onAddToBoard(Array.from(checkedMemos))}
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

        {/* 新規メモ作成ボタン（右下固定・モバイルのみ） */}
        {activeTab === "normal" &&
          selectionMode === "select" &&
          checkedMemos.size === 0 &&
          !onAddToBoard && (
            <button
              onClick={handleCreateNew}
              className="md:hidden fixed bottom-16 right-2 size-9 bg-Green hover:bg-Green/90 text-white rounded-full shadow-lg flex items-center justify-center z-20 transition-all"
            >
              <svg
                className="size-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </button>
          )}
      </div>

      {/* モーダル（2パネルレイアウト外側） */}
      <BulkDeleteModal />
      <RestoreModal />
      <MemoCsvImport
        isOpen={isCsvImportModalOpen}
        onClose={() => setIsCsvImportModalOpen(false)}
      />

      {/* タグ管理モーダル */}
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

      {/* 個別タグ編集モーダル */}
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

      {/* 右側：詳細表示エリア（2パネルレイアウトではRightPanelを使用） */}
      <RightPanel
        isOpen={memoScreenMode !== "list"}
        onClose={handleRightPanelClose}
      >
        <div className="flex flex-col h-full">
          {/* メモエディター部分 */}
          <div className="flex-1">{centerPanelContent}</div>
        </div>
      </RightPanel>
    </div>
  );
}

export default MemoScreen;
