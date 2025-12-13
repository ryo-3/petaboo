"use client";

import TaskEditor from "@/components/features/task/task-editor";
import { TaskCsvImport } from "@/components/features/task/task-csv-import";
import { useTasksBulkDelete } from "@/components/features/task/use-task-bulk-delete-wrapper";
import { useTasksBulkRestore } from "@/components/features/task/use-task-bulk-restore";
import DesktopLower from "@/components/layout/desktop-lower";
import DesktopUpper from "@/components/layout/desktop-upper";
import { BulkActionButtons } from "@/components/ui/layout/bulk-action-buttons";
import SelectionMenuButton from "@/components/ui/buttons/selection-menu-button";
import { useSortOptions } from "@/hooks/use-sort-options";
import { useBulkDeleteButton } from "@/src/hooks/use-bulk-delete-button";
import { useBulkProcessNotifications } from "@/src/hooks/use-bulk-process-notifications";
import { useDeletedItemOperations } from "@/src/hooks/use-deleted-item-operations";
import { useDeletionLid } from "@/src/hooks/use-deletion-lid";
import { useItemDeselect } from "@/src/hooks/use-item-deselect";
import { useUnifiedRestoration } from "@/src/hooks/use-unified-restoration";
import { useScreenState } from "@/src/hooks/use-screen-state";
import { useTabState } from "@/src/contexts/tab-state-context";
import { useMultiSelection } from "@/src/hooks/use-multi-selection";
import { useSelectAll } from "@/src/hooks/use-select-all";
import { useSelectionHandlers } from "@/src/hooks/use-selection-handlers";
import { useTabChange } from "@/src/hooks/use-tab-change";
import {
  useDeletedTasks,
  useTasks,
  usePermanentDeleteTask,
  useUpdateTask,
} from "@/src/hooks/use-tasks";
import { useUserPreferences } from "@/src/hooks/use-user-preferences";
import { useTeamContext } from "@/src/contexts/team-context";
import { useViewSettings } from "@/src/contexts/view-settings-context";
import { useTeamDetail } from "@/src/contexts/team-detail-context";
import { useNavigation } from "@/src/contexts/navigation-context";
import { useHeaderControlPanel } from "@/src/contexts/header-control-panel-context";
import { useUnsavedChangesGuard } from "@/src/hooks/use-unsaved-changes-guard";
import { useBoards } from "@/src/hooks/use-boards";
import { useTeamBoards } from "@/src/hooks/use-team-boards";
import { useTags } from "@/src/hooks/use-tags";
import { useTeamTags } from "@/src/hooks/use-team-tags";
import { useTaskDeleteWithNextSelection } from "@/src/hooks/use-memo-delete-with-next-selection";
import TagManagementModal from "@/components/ui/tag-management/tag-management-modal";
import { useBulkAssigneeSafe } from "@/src/contexts/bulk-assignee-context";
import { useAllTaggings, useAllBoardItems } from "@/src/hooks/use-all-data";
import { useAllTeamTaggings } from "@/src/hooks/use-team-taggings";
import { useAllAttachments } from "@/src/hooks/use-all-attachments";
import type { DeletedTask, Task } from "@/src/types/task";
import { getTaskDisplayOrder } from "@/src/utils/domUtils";
import {
  createToggleHandler,
  createToggleHandlerWithTabClear,
} from "@/src/utils/toggleUtils";
import { validatePanelToggle } from "@/src/utils/panel-helpers";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ControlPanelLayout } from "@/components/layout/control-panel-layout";
import CommentSection from "@/components/features/comments/comment-section";
import AttachmentGallery from "@/components/features/attachments/attachment-gallery";
import { useAttachmentManager } from "@/src/hooks/use-attachment-manager";
import ItemEditorFooter from "@/components/mobile/item-editor-footer";
import PhotoButton from "@/components/ui/buttons/photo-button";
import type { TeamMember } from "@/src/hooks/use-team-detail";
import type { HeaderControlPanelConfig } from "@/src/contexts/header-control-panel-context";
import MobileFabButton from "@/components/ui/buttons/mobile-fab-button";

type TaskScreenMode = "list" | "view" | "create" | "edit";

// モバイル版画像・ファイル一覧表示コンポーネント（タスク用）
function MobileAttachmentView({
  selectedTask,
  teamId,
}: {
  selectedTask: Task | null;
  teamId?: number;
}) {
  const attachmentManager = useAttachmentManager({
    itemType: "task",
    item: selectedTask,
    teamMode: !!teamId,
    teamId,
    isDeleted: false,
  });

  const {
    attachments,
    pendingImages,
    pendingDeletes,
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

interface TaskScreenProps {
  selectedTask?: Task | null;
  selectedDeletedTask?: DeletedTask | null;
  onSelectTask: (task: Task | null, fromFullList?: boolean) => void;
  onSelectDeletedTask: (
    task: DeletedTask | null,
    fromFullList?: boolean,
  ) => void;
  onClose: () => void;
  onClearSelection?: () => void; // 選択状態だけクリアする関数
  onScreenModeChange?: (mode: string) => void; // 画面モード変更通知
  rightPanelDisabled?: boolean; // 右パネル無効化（ボードから呼び出される場合）
  hideHeaderButtons?: boolean; // ヘッダーボタンを非表示（ボードから呼び出される場合）
  hideBulkActionButtons?: boolean; // 一括操作ボタンを非表示（ボードから呼び出される場合）
  disableHeaderControls?: boolean; // ヘッダーコントロールパネルを無効化
  onAddToBoard?: (taskIds: number[]) => void; // ボードに追加（ボードから呼び出される場合のみ）
  excludeBoardId?: number; // 指定されたボードに登録済みのタスクを除外（ボードから呼び出される場合）
  initialSelectionMode?: "select" | "check"; // 初期選択モード
  // ボード詳細から呼び出された場合の除外アイテムリスト（displayId）
  excludeItemIds?: string[];
  // URL連動
  initialTaskId?: string | null;
  // チームメンバー（コメント機能用）
  teamMembers?: TeamMember[];
  // チーム用の未保存変更管理（オプション）
  taskEditorHasUnsavedChangesRef?: React.MutableRefObject<boolean>;
  taskEditorShowConfirmModalRef?: React.MutableRefObject<(() => void) | null>;

  // 統一フック（最上位から受け取り）
  unifiedOperations: {
    deleteItem: {
      mutateAsync: (id: number) => Promise<any>;
      isPending: boolean;
    };
    restoreItem: {
      mutateAsync: (displayId: string) => Promise<any>;
      isPending: boolean;
    };
  };
}

function TaskScreen({
  selectedTask,
  selectedDeletedTask,
  onSelectTask,
  onSelectDeletedTask,
  onClose,
  onClearSelection,
  onScreenModeChange,
  hideHeaderButtons = false,
  hideBulkActionButtons = false,
  disableHeaderControls = false,
  onAddToBoard,
  excludeBoardId,
  initialSelectionMode = "select",
  excludeItemIds = [],
  initialTaskId,
  teamMembers = [],
  unifiedOperations,
  taskEditorHasUnsavedChangesRef,
  taskEditorShowConfirmModalRef,
}: TaskScreenProps) {
  const { isTeamMode: teamMode, teamId: teamIdRaw } = useTeamContext();
  const teamId = teamIdRaw ?? undefined; // Convert null to undefined for hook compatibility
  const { setConfig } = useHeaderControlPanel();

  // NavigationContextからアップロード状態を取得
  const { isUploadingTask } = useNavigation();

  // ViewSettingsContextから取得
  const { settings, sessionState, updateSettings, updateSessionState } =
    useViewSettings();

  // TeamDetailContext（チームモードのみ）
  const teamDetailContext = teamMode ? useTeamDetail() : null;

  // 一括処理中断通知の監視
  useBulkProcessNotifications();

  // データ取得
  const {
    data: tasks,
    isLoading: taskLoading,
    error: taskError,
  } = useTasks({ teamMode, teamId }) as {
    data: Task[] | undefined;
    isLoading: boolean;
    error: Error | null;
  };

  const { data: deletedTasks, isLoading: deletedTasksLoading } =
    useDeletedTasks({ teamMode, teamId });

  // キャッシュから最新のselectedTaskを取得（担当者変更などの反映用）
  const latestSelectedTask = useMemo(() => {
    if (!selectedTask || !tasks) return selectedTask;
    return tasks.find((t) => t.id === selectedTask.id) ?? selectedTask;
  }, [selectedTask, tasks]);

  const { preferences } = useUserPreferences(1);

  const { data: personalBoards } = useBoards("normal", !teamMode);

  const { data: teamBoards } = useTeamBoards(teamId || null, "normal");

  const boards = teamMode ? teamBoards : personalBoards;
  const { data: personalTags } = useTags({ enabled: !teamMode });

  const { data: teamTags } = useTeamTags(teamId ?? 0, { enabled: teamMode });

  const tags = teamMode ? teamTags : personalTags;

  // 削除済みタスクの完全削除フック
  const permanentDeleteTask = usePermanentDeleteTask();

  // タスク更新フック（担当者一括設定用）
  const updateTask = useUpdateTask({ teamMode, teamId });

  // 全データ事前取得（ちらつき解消）
  const { data: allTaggings } = useAllTaggings();

  const { data: allBoardItems } = useAllBoardItems(
    teamMode ? teamId : undefined,
  );

  // 選択中のタスクに紐づくボード情報を取得（allBoardItemsから計算して一覧と整合性を確保）
  const itemBoards = useMemo(() => {
    if (!selectedTask || !allBoardItems || !boards) return [];

    const displayId = selectedTask.displayId || "";

    // allBoardItemsからこのタスクに紐づくボードをフィルタリング
    const taskBoardItems = allBoardItems.filter(
      (item) => item.itemType === "task" && item.displayId === displayId,
    );

    // ボード情報を取得
    return taskBoardItems
      .map((item) => boards.find((board) => board.id === item.boardId))
      .filter(
        (board): board is NonNullable<typeof board> => board !== undefined,
      );
  }, [selectedTask, allBoardItems, boards]);

  // 全タスクの添付ファイルを取得（サムネイル表示用）
  const { data: allTaskAttachments } = useAllAttachments(
    teamMode ? teamId : undefined,
    "task",
    true,
  );

  // allBoardItems監視（デバッグ用 - 削除予定）
  // useEffect(() => {
  //   console.log("🔍 TaskScreen allBoardItems更新", { ... });
  // }, [allBoardItems, teamMode, teamId]);

  // チーム用タグデータ取得
  const { data: allTeamTaggings } = useAllTeamTaggings(teamId || 0);

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

  // URL からの初期タスク選択（初回のみ）
  const initialTaskIdRef = useRef<string | null>(null);
  // selectedTask/selectedDeletedTaskをrefで追跡（useEffectの依存配列サイズ変動を防ぐ）
  const selectedTaskRef = useRef(selectedTask);
  const selectedDeletedTaskRef = useRef(selectedDeletedTask);
  selectedTaskRef.current = selectedTask;
  selectedDeletedTaskRef.current = selectedDeletedTask;

  // URLからの復元が必要な場合（URLパラメータあり＆選択なし＆リストロード中）のみローディング表示
  // 通常タスクと削除済みタスクの両方のロード完了を待つ（チーム・個人両方対応）
  const needsUrlRestore =
    initialTaskId &&
    !selectedTask &&
    !selectedDeletedTask &&
    (taskLoading || deletedTasksLoading);
  const isFullyLoaded = !needsUrlRestore;

  // タグ管理モーダルの状態
  const [isTagManagementModalOpen, setIsTagManagementModalOpen] =
    useState(false);

  // 担当者一括設定モーダル（Context経由）
  const bulkAssigneeContext = useBulkAssigneeSafe();

  // 削除ボタンの参照
  const deleteButtonRef = useRef<HTMLButtonElement>(null);

  // 復元ボタンの参照
  const restoreButtonRef = useRef<HTMLButtonElement>(null);

  // 削除完了時に蓋を閉じる処理
  useDeletionLid(() => setIsRightLidOpen(false));

  // アニメーション状態
  const [isDeleting, setIsDeleting] = useState(false);
  // 蓋アニメーション状態
  const [isLidOpen, setIsLidOpen] = useState(false);
  const [, setIsRightLidOpen] = useState(false);

  // 復元の状態
  const [isRestoring, setIsRestoring] = useState(false);
  const [isRestoreLidOpen, setIsRestoreLidOpen] = useState(false);
  const [isIndividualRestoring, setIsIndividualRestoring] = useState(false);

  // CSVインポートモーダルの状態
  const [isCsvImportModalOpen, setIsCsvImportModalOpen] = useState(false);
  const handleCsvImport = useCallback(() => {
    setIsCsvImportModalOpen(true);
  }, []);

  // 共通screen状態管理（画面モードのみ）
  const {
    screenMode: taskScreenMode,
    setScreenMode: setTaskScreenModeInternal,
  } = useScreenState(
    { type: "task", defaultActiveTab: "todo", defaultColumnCount: 2 },
    "list" as TaskScreenMode,
    selectedTask,
    selectedDeletedTask,
    preferences || undefined,
  );

  // タブ状態管理（TabStateContextから取得）
  const { taskListTab: activeTab, setTaskListTab: setActiveTab } =
    useTabState();

  // URL からの初期タスク選択（useTabStateの後に配置）
  useEffect(() => {
    // ボード詳細から呼び出された場合はURL復元をスキップ（ボード内の選択は別処理）
    if (excludeBoardId) {
      return;
    }

    if (initialTaskId) {
      const isTargetTask = (task: Task | DeletedTask) => {
        const ids = [
          task.displayId,
          (task as any).displayId as string | undefined,
          task.id?.toString(),
        ].filter(Boolean) as string[];
        return ids.includes(initialTaskId);
      };
      const currentSelectedTask = selectedTaskRef.current;
      const currentSelectedDeletedTask = selectedDeletedTaskRef.current;

      // selectedTaskまたはselectedDeletedTaskがある場合、refを同期＆タブ切り替え
      if (currentSelectedTask && isTargetTask(currentSelectedTask)) {
        if (initialTaskIdRef.current !== initialTaskId) {
          initialTaskIdRef.current = initialTaskId;
          // タスクのステータスに応じてタブを自動切り替え
          if (currentSelectedTask.status !== activeTab) {
            setActiveTab(currentSelectedTask.status);
          }
        }
      } else if (
        currentSelectedDeletedTask &&
        isTargetTask(currentSelectedDeletedTask)
      ) {
        if (initialTaskIdRef.current !== initialTaskId) {
          initialTaskIdRef.current = initialTaskId;
          // 削除済みタブに切り替え
          if (activeTab !== "deleted") {
            setActiveTab("deleted");
          }
        }
      }
      // initialTaskIdが変更され、かつ選択がない場合のみ自動選択を実行
      else if (
        tasks &&
        !currentSelectedTask &&
        !currentSelectedDeletedTask &&
        initialTaskId !== initialTaskIdRef.current
      ) {
        // 通常タスクから検索
        const targetTask = tasks.find((task) => isTargetTask(task));
        if (targetTask) {
          initialTaskIdRef.current = initialTaskId;
          // タスクのステータスに応じてタブを自動切り替え
          if (targetTask.status !== activeTab) {
            setActiveTab(targetTask.status);
          }
          onSelectTask(targetTask);
        } else if (deletedTasks) {
          // 削除済みタスクから検索
          const targetDeletedTask = deletedTasks.find((task) =>
            isTargetTask(task),
          );
          if (targetDeletedTask) {
            initialTaskIdRef.current = initialTaskId;
            // 削除済みタブに切り替え
            if (activeTab !== "deleted") {
              setActiveTab("deleted");
            }
            onSelectDeletedTask(targetDeletedTask);
          }
        }
      }
    } else {
      // initialTaskIdがnullになった場合はrefもリセット
      if (initialTaskIdRef.current !== null) {
        initialTaskIdRef.current = null;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTaskId, tasks, deletedTasks, excludeBoardId]);

  // 注意: 以前はselectedTaskのステータスに連動してタブを変更するuseEffectがあったが、
  // 画面遷移時に前のタスクのステータスでタブが上書きされる問題（PETABOO-87）があったため削除。
  // タブの切り替えはユーザーの明示的な操作（タブクリック）またはURL復元時のみ行う。

  // パネル表示状態管理（チームモード用）
  const getInitialPanelState = (
    key: "showListPanel" | "showDetailPanel" | "showCommentPanel",
  ) => {
    if (typeof window !== "undefined") {
      const storageKey = teamMode
        ? "team-task-panel-visibility"
        : "personal-task-panel-visibility";
      const saved = localStorage.getItem(storageKey);
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
    if (typeof window === "undefined") {
      return;
    }

    const storageKey = teamMode
      ? "team-task-panel-visibility"
      : "personal-task-panel-visibility";

    localStorage.setItem(
      storageKey,
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
  const multiSelectionResult = useMultiSelection({
    activeMemoTab: "",
    activeTaskTab: activeTab,
  });

  const {
    selectionMode,
    handleSelectionModeChange,
    checkedTodoTasks,
    setCheckedTodoTasks,
    checkedInProgressTasks,
    setCheckedInProgressTasks,
    checkedCheckingTasks,
    setCheckedCheckingTasks,
    checkedCompletedTasks,
    setCheckedCompletedTasks,
    checkedDeletedTasks: checkedDeletedTasksFromMultiSelection,
    setCheckedDeletedTasks: setCheckedDeletedTasksFromMultiSelection,
  } = multiSelectionResult;

  // initialSelectionModeを反映
  useEffect(() => {
    if (initialSelectionMode && selectionMode !== initialSelectionMode) {
      handleSelectionModeChange(initialSelectionMode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // エイリアス: 既存のコードとの互換性のため（型アサーション）
  // タスクの場合、activeTabに応じて適切なSetを返す
  const checkedTasks = (() => {
    switch (activeTab) {
      case "todo":
        return checkedTodoTasks as Set<number>;
      case "in_progress":
        return checkedInProgressTasks as Set<number>;
      case "checking":
        return checkedCheckingTasks as Set<number>;
      case "completed":
        return checkedCompletedTasks as Set<number>;
      case "deleted":
        return checkedDeletedTasksFromMultiSelection as Set<number>;
      default:
        return checkedTodoTasks as Set<number>;
    }
  })();

  const setCheckedTasks = (() => {
    switch (activeTab) {
      case "todo":
        return setCheckedTodoTasks as React.Dispatch<
          React.SetStateAction<Set<number>>
        >;
      case "in_progress":
        return setCheckedInProgressTasks as React.Dispatch<
          React.SetStateAction<Set<number>>
        >;
      case "checking":
        return setCheckedCheckingTasks as React.Dispatch<
          React.SetStateAction<Set<number>>
        >;
      case "completed":
        return setCheckedCompletedTasks as React.Dispatch<
          React.SetStateAction<Set<number>>
        >;
      case "deleted":
        return setCheckedDeletedTasksFromMultiSelection as React.Dispatch<
          React.SetStateAction<Set<number>>
        >;
      default:
        return setCheckedTodoTasks as React.Dispatch<
          React.SetStateAction<Set<number>>
        >;
    }
  })();

  // 🚨 削除済タブの選択状態をローカルで管理（useMultiSelectionから独立）
  const [checkedDeletedTasksLocal, setCheckedDeletedTasksLocal] = useState<
    Set<number>
  >(new Set());

  const checkedDeletedTasks = checkedDeletedTasksLocal;
  const setCheckedDeletedTasks = setCheckedDeletedTasksLocal;

  // タブクリア機能付きのトグルハンドラー
  const handleTaskToggleWithTabClear = (taskId: number) => {
    // 現在のタブのchecked状態とsetterを取得
    const { currentChecked, currentSetter, otherSetters } = (() => {
      switch (activeTab) {
        case "todo":
          return {
            currentChecked: checkedTodoTasks,
            currentSetter: setCheckedTodoTasks,
            otherSetters: [
              setCheckedInProgressTasks,
              setCheckedCheckingTasks,
              setCheckedCompletedTasks,
              setCheckedDeletedTasks,
            ],
          };
        case "in_progress":
          return {
            currentChecked: checkedInProgressTasks,
            currentSetter: setCheckedInProgressTasks,
            otherSetters: [
              setCheckedTodoTasks,
              setCheckedCheckingTasks,
              setCheckedCompletedTasks,
              setCheckedDeletedTasks,
            ],
          };
        case "checking":
          return {
            currentChecked: checkedCheckingTasks,
            currentSetter: setCheckedCheckingTasks,
            otherSetters: [
              setCheckedTodoTasks,
              setCheckedInProgressTasks,
              setCheckedCompletedTasks,
              setCheckedDeletedTasks,
            ],
          };
        case "completed":
          return {
            currentChecked: checkedCompletedTasks,
            currentSetter: setCheckedCompletedTasks,
            otherSetters: [
              setCheckedTodoTasks,
              setCheckedInProgressTasks,
              setCheckedCheckingTasks,
              setCheckedDeletedTasks,
            ],
          };
        case "deleted":
          return {
            currentChecked: checkedDeletedTasks,
            currentSetter: setCheckedDeletedTasks,
            otherSetters: [
              setCheckedTodoTasks,
              setCheckedInProgressTasks,
              setCheckedCheckingTasks,
              setCheckedCompletedTasks,
            ],
          };
        default:
          return {
            currentChecked: checkedTodoTasks,
            currentSetter: setCheckedTodoTasks,
            otherSetters: [
              setCheckedInProgressTasks,
              setCheckedCheckingTasks,
              setCheckedCompletedTasks,
              setCheckedDeletedTasks,
            ],
          };
      }
    })();

    // トグル処理
    const newSet = new Set(currentChecked);
    if (newSet.has(taskId)) {
      newSet.delete(taskId);
    } else {
      newSet.add(taskId);
      // 新しく選択される場合、他のタブをクリア
      otherSetters.forEach((setter) => (setter as any)(new Set<number>()));
    }

    (currentSetter as any)(newSet);
  };

  // ViewSettingsContextからカラム数を取得・設定
  const columnCount = settings.taskColumnCount;
  const setColumnCount = (count: number) =>
    updateSettings({ taskColumnCount: count });

  // 右側パネル表示時は列数を調整（useScreenStateと同じロジック）
  const effectiveColumnCount =
    taskScreenMode !== "list"
      ? columnCount <= 2
        ? columnCount
        : 2
      : columnCount;

  // チームモードで新規作成状態をContextに反映
  useEffect(() => {
    if (teamDetailContext) {
      teamDetailContext.setIsCreatingTask(taskScreenMode === "create");
    }
  }, [taskScreenMode, teamDetailContext]);

  // モバイル版タスクエディターのタブ切り替え管理（チームモードのみ）
  const [taskEditorTab, setTaskEditorTab] = useState<
    "task" | "comment" | "image"
  >("task");

  // onSelectTaskの最新値をrefで保持
  const onSelectTaskRef = useRef(onSelectTask);
  onSelectTaskRef.current = onSelectTask;

  // モバイル版タスクエディターのタブ切り替えイベントをリッスン
  useEffect(() => {
    const handleTabChange = (e: Event) => {
      const customEvent = e as CustomEvent<{
        tab: "task" | "comment" | "image";
      }>;
      setTaskEditorTab(customEvent.detail.tab);
    };

    const handleBackRequest = () => {
      // タブ状態をリセット
      if (taskEditorTab !== "task") {
        setTaskEditorTab("task");
      }

      // タスクエディターを閉じてリストに戻る（refから最新の関数を取得）
      onSelectTaskRef.current(null);
    };

    // チーム用と個人用の両方のイベントをリッスン
    const eventName = teamMode
      ? "team-task-editor-tab-change"
      : "task-editor-tab-change";
    const backEventName = teamMode
      ? "team-back-to-task-list"
      : "task-editor-mobile-back-requested";

    window.addEventListener(eventName, handleTabChange);
    window.addEventListener(backEventName, handleBackRequest);

    return () => {
      window.removeEventListener(eventName, handleTabChange);
      window.removeEventListener(backEventName, handleBackRequest);
    };
  }, [teamMode, taskEditorTab]);

  // 画面モード変更のラッパー（親に通知）
  const setTaskScreenMode = useCallback(
    (mode: TaskScreenMode) => {
      setTaskScreenModeInternal(mode);
      onScreenModeChange?.(mode);
    },
    [setTaskScreenModeInternal, onScreenModeChange],
  );

  // タブ変更ハンドラー（useTabChangeをトップレベルで呼び出し）
  const tabChangeHandler = useTabChange({
    setActiveTab: (tab: string) => setActiveTab(tab as typeof activeTab),
    setScreenMode: (mode: string) => {
      setTaskScreenMode(mode as TaskScreenMode);
      onClearSelection?.();
    },
  });

  // 一括削除ボタンの表示制御
  const { showDeleteButton } = useBulkDeleteButton({
    activeTab,
    deletedTabName: "deleted",
    checkedItems: checkedTasks,
    checkedDeletedItems: checkedDeletedTasks,
    isDeleting,
    isRestoring: isRestoreLidOpen,
  });

  // 全選択機能
  const { isAllSelected, handleSelectAll } = useSelectAll({
    activeTab,
    deletedTabName: "deleted",
    items: tasks || null,
    deletedItems: deletedTasks || null,
    checkedItems: checkedTasks,
    checkedDeletedItems: checkedDeletedTasks,
    setCheckedItems: setCheckedTasks,
    setCheckedDeletedItems: setCheckedDeletedTasks,
    filterFn: (task, tab) => task.status === tab,
    currentMode: "task",
  });

  // 選択解除処理
  const handleItemDeselect = useItemDeselect(
    selectedTask,
    selectedDeletedTask,
    () => onClearSelection?.(),
    (mode: string) => setTaskScreenMode(mode as TaskScreenMode),
  );

  // 型キャストの統一化
  const activeTabTyped = activeTab as
    | "todo"
    | "in_progress"
    | "checking"
    | "completed"
    | "deleted";

  // 一括削除関連
  const { handleBulkDelete, DeleteModal, currentDisplayCount } =
    useTasksBulkDelete({
      activeTab: activeTabTyped,
      checkedTasks,
      checkedDeletedTasks,
      setCheckedTasks,
      setCheckedDeletedTasks,
      tasks,
      deletedTasks,
      onTaskDelete: handleItemDeselect,
      // onDeletedTaskDelete: handleItemDeselect, // 削除済みタスクはReact Query自動更新で処理
      deleteButtonRef,
      setIsDeleting,
      setIsLidOpen,
      teamMode,
      teamId,
    });

  // 一括復元関連
  const {
    handleBulkRestore,
    RestoreModal,
    currentDisplayCount: currentRestoreDisplayCount,
  } = useTasksBulkRestore({
    activeTab: activeTab as "normal" | "deleted",
    checkedDeletedTasks,
    setCheckedDeletedTasks,
    deletedTasks,
    onDeletedTaskRestore: handleItemDeselect,
    restoreButtonRef,
    setIsRestoring,
    setIsLidOpen: setIsRestoreLidOpen,
  });

  // 削除済みタスク操作の共通ロジック
  const {
    selectNextDeletedItem: selectNextDeletedTask,
    handleRestoreAndSelectNext: handleDeletedTaskRestoreAndSelectNext,
  } = useDeletedItemOperations({
    deletedItems: deletedTasks || null,
    onSelectDeletedItem: onSelectDeletedTask,
    setScreenMode: (mode: string) => setTaskScreenMode(mode as TaskScreenMode),
    editorSelector: "[data-task-editor]",
    restoreOptions: { isRestore: true, onSelectWithFromFlag: true },
  });

  // 統一復元フック（新しいシンプル実装）
  const { handleRestoreAndSelectNext: unifiedRestoreAndSelectNext } =
    useUnifiedRestoration({
      itemType: "task",
      deletedItems: deletedTasks || null,
      selectedDeletedItem: selectedDeletedTask || null,
      onSelectDeletedItem: onSelectDeletedTask,
      setActiveTab: (tab: string) => setActiveTab(tab as typeof activeTab),
      setScreenMode: (mode: string) =>
        setTaskScreenMode(mode as TaskScreenMode),
      teamMode,
      teamId,
    });

  // 通常タスク削除（DOMポーリング方式）
  const handleTaskDeleteAndSelectNext = async (deletedTask: Task) => {
    if (!tasks || unifiedOperations.deleteItem.isPending) return;

    // 削除されたタスクが現在のタブと異なるステータスの場合は右パネルを閉じるだけ
    if (deletedTask.status !== activeTab) {
      setTaskScreenMode("list");
      onClearSelection?.();
      return;
    }

    try {
      // API削除実行
      await unifiedOperations.deleteItem.mutateAsync(deletedTask.id);

      // DOMポーリング削除フックによる次選択処理
      handleDeleteWithNextSelection(deletedTask);
    } catch (error) {}
  };

  // 選択ハンドラーパターン
  const {
    handleSelectItem: handleSelectTaskBase,
    handleSelectDeletedItem: handleSelectDeletedTask,
    handleCreateNew,
    handleRightPanelClose,
    handleTabChange,
  } = useSelectionHandlers<Task, DeletedTask>({
    setScreenMode: (mode: string) => setTaskScreenMode(mode as TaskScreenMode),
    onSelectItem: onSelectTask,
    onSelectDeletedItem: onSelectDeletedTask,
    onClearSelection,
    onClose: onClose,
  });

  // 未保存変更ガード（チーム/個人モード共通）
  const {
    personalHasUnsavedChangesRef,
    personalShowConfirmModalRef,
    handleSelectWithGuard,
  } = useUnsavedChangesGuard({
    itemType: "task",
    teamMode,
    teamDetailContext,
    onSelectItem: (task: Task | null) => {
      if (task) {
        handleSelectTaskBase(task);
      }
    },
    setScreenMode: setTaskScreenMode,
  });

  // DOMポーリング削除フック（メモと同じ方式）
  const { handleDeleteWithNextSelection, checkDomDeletionAndSelectNext } =
    useTaskDeleteWithNextSelection({
      tasks: tasks?.filter((t) => t.status === activeTab),
      onSelectTask: (task: Task | null) => {
        // アップロード中は切り替えを防ぐ
        if (isUploadingTask) {
          return;
        }
        if (task) {
          onSelectTask(task);
          setTaskScreenMode("view");
        } else {
          setTaskScreenMode("list");
          onClearSelection?.();
        }
      },
      setTaskScreenMode,
      onDeselectAndStayOnTaskList: () => {
        setTaskScreenMode("list");
        onClearSelection?.();
      },
      handleRightEditorDelete: () => {
        // 何もしない（削除処理は外部で実行済み）
      },
      teamMode,
      teamDetailContext,
      personalHasUnsavedChangesRef,
      setIsRightLidOpen,
    });

  // DOM削除確認（タスク一覧が変更されたときにチェック）
  useEffect(() => {
    checkDomDeletionAndSelectNext();
  }, [tasks, checkDomDeletionAndSelectNext]);

  // タスク選択ハンドラー（アップロード中チェック・未保存チェック追加）
  const handleSelectTask = (task: Task) => {
    // アップロード中は切り替えを防ぐ
    if (isUploadingTask) {
      return;
    }

    handleSelectWithGuard(task);
  };

  // ヘッダーからの新規タスク作成イベントをリッスン
  useEffect(() => {
    const handleTaskCreate = () => {
      handleCreateNew();
    };

    const eventName = teamMode ? "team-task-create" : "personal-task-create";
    window.addEventListener(eventName, handleTaskCreate);

    return () => {
      window.removeEventListener(eventName, handleTaskCreate);
    };
  }, [teamMode, handleCreateNew]);

  // 安全なデータ配布用（チームモードに応じてタグ付け情報を切り替え）
  const safeAllTaggings = teamMode ? allTeamTaggings || [] : allTaggings || [];
  const safeAllBoardItems = allBoardItems || [];

  // 除外アイテムIDでフィルタリングされたタスク（displayIdで比較）
  const filteredTasks =
    tasks?.filter(
      (task) => !excludeItemIds.includes(task.displayId || task.id.toString()),
    ) || [];

  const deletedTasksCountValue = deletedTasks?.length || 0;

  const taskStatusCounts = useMemo(() => {
    if (!tasks) {
      return { todo: 0, inProgress: 0, checking: 0, completed: 0 };
    }
    return tasks.reduce(
      (acc, task) => {
        if (task.status === "todo") {
          acc.todo += 1;
        } else if (task.status === "in_progress") {
          acc.inProgress += 1;
        } else if (task.status === "checking") {
          acc.checking += 1;
        } else if (task.status === "completed") {
          acc.completed += 1;
        }
        return acc;
      },
      { todo: 0, inProgress: 0, checking: 0, completed: 0 },
    );
  }, [tasks]);

  const {
    todo: todoCount,
    inProgress: inProgressCount,
    checking: checkingCount,
    completed: completedCount,
  } = taskStatusCounts;

  // パネルコントロール表示条件
  // - 個人: タスク選択時に一覧パネルの切り替えのみ表示
  // - チーム: タスク選択時に一覧・詳細・コメントの切り替えを表示
  const shouldShowPanelControls = taskScreenMode !== "list";

  const taskRightPanelMode = (taskScreenMode === "list" ? "hidden" : "view") as
    | "hidden"
    | "view"
    | "create";

  const desktopUpperCommonProps = {
    currentMode: "task" as const,
    activeTab: activeTabTyped,
    onTabChange: handleTabChange(tabChangeHandler),
    rightPanelMode: taskRightPanelMode,
    normalCount: 0,
    deletedTasksCount: deletedTasksCountValue,
    todoCount,
    inProgressCount,
    checkingCount,
    completedCount,
    marginBottom: "",
    headerMarginBottom: "mb-1.5",
    teamMode,
  };

  const taskHeaderConfig = useMemo<HeaderControlPanelConfig | null>(() => {
    if (disableHeaderControls) {
      return null;
    }

    const config: HeaderControlPanelConfig = {
      currentMode: "task",
      rightPanelMode: taskRightPanelMode,
      selectionMode,
      onSelectionModeChange: handleSelectionModeChange,
      onSelectAll: handleSelectAll,
      isAllSelected,
      onCsvImport: handleCsvImport,
      activeTab: activeTabTyped,
      todoCount,
      inProgressCount,
      checkingCount,
      completedCount,
      deletedTasksCount: deletedTasksCountValue,
      hideAddButton: hideHeaderButtons,
      teamMode,
      teamId,
      hideControls: preferences?.taskHideControls,
    };

    if (shouldShowPanelControls) {
      config.isSelectedMode = true;
      config.showMemo = showListPanel;
      config.onMemoToggle = handleListPanelToggle;
      config.contentFilterRightPanelMode = "editor";
      config.listTooltip = "タスク一覧パネル";
      config.selectedItemType = "task";

      // チームモードのみ: 詳細パネルとコメントパネルの切り替えを表示
      if (teamMode) {
        config.showTask = showDetailPanel;
        config.onTaskToggle = handleDetailPanelToggle;
        config.detailTooltip = "タスク詳細パネル";
        config.showComment = showCommentPanel;
        config.onCommentToggle = handleCommentPanelToggle;
      } else {
        // 個人モード: 詳細は常に表示、ボタンのみ非表示
        config.showTask = true; // 詳細は常に表示（ボタン自体を非表示にする）
        config.onTaskToggle = () => {}; // ダミー（ボタン非表示なので呼ばれない）
        config.hideDetailButton = true; // 詳細ボタンを非表示
      }
    }

    return config;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    disableHeaderControls,
    taskRightPanelMode,
    selectionMode,
    // handleSelectionModeChange, // 関数は除外（毎回変わるため）
    // handleSelectAll, // 関数は除外
    isAllSelected,
    // handleCsvImport, // 関数は除外
    activeTabTyped,
    todoCount,
    inProgressCount,
    completedCount,
    deletedTasksCountValue,
    hideHeaderButtons,
    teamMode,
    teamId,
    preferences?.taskHideControls,
    shouldShowPanelControls,
    showListPanel,
    showDetailPanel,
    showCommentPanel,
    // handleListPanelToggle, // 関数は除外
    // handleDetailPanelToggle, // 関数は除外
    // handleCommentPanelToggle, // 関数は除外
  ]);

  const taskHeaderOwnerRef = useRef<symbol | null>(null);

  useEffect(() => {
    if (!taskHeaderConfig) {
      if (taskHeaderOwnerRef.current) {
        setConfig(null);
        taskHeaderOwnerRef.current = null;
      }
      return;
    }

    const owner = Symbol("header-control-panel");
    taskHeaderOwnerRef.current = owner;
    setConfig(taskHeaderConfig);

    return () => {
      if (taskHeaderOwnerRef.current === owner) {
        setConfig(null);
        taskHeaderOwnerRef.current = null;
      }
    };
  }, [taskHeaderConfig]);

  // 左パネルのコンテンツ
  const leftPanelContent = (
    <div className="pl-4 pt-3 flex flex-col h-full relative">
      <DesktopUpper {...desktopUpperCommonProps} />

      <div className="flex-1 min-h-0 overflow-y-auto pb-40 md:pb-16">
        <DesktopLower
          currentMode="task"
          activeTab={activeTabTyped}
          effectiveColumnCount={effectiveColumnCount}
          isLoading={taskLoading}
          error={taskError}
          selectionMode={selectionMode}
          tasks={filteredTasks}
          deletedTasks={deletedTasks || []}
          selectedTask={latestSelectedTask}
          selectedDeletedTask={selectedDeletedTask}
          checkedTasks={checkedTasks}
          checkedDeletedTasks={checkedDeletedTasks}
          onToggleCheckTask={handleTaskToggleWithTabClear}
          onToggleCheckDeletedTask={createToggleHandler(
            checkedDeletedTasks,
            setCheckedDeletedTasks,
          )}
          onSelectTask={handleSelectTask}
          onSelectDeletedTask={handleSelectDeletedTask}
          allTags={tags || []}
          allBoards={boards || []}
          allTaggings={safeAllTaggings}
          allBoardItems={safeAllBoardItems}
          allAttachments={allTaskAttachments || []}
          teamMode={teamMode}
          teamId={teamId}
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
            handleBulkDelete();
          }}
          deleteButtonRef={deleteButtonRef}
          isDeleting={isLidOpen}
          deleteVariant={activeTab === "deleted" ? "danger" : undefined}
          showRestoreButton={
            activeTab === "deleted" &&
            !isDeleting &&
            (checkedDeletedTasks.size > 0 ||
              (isRestoring && currentRestoreDisplayCount > 0))
          }
          restoreCount={currentRestoreDisplayCount}
          onRestore={() => {
            // 復元ボタンを押した瞬間に削除ボタンを非表示にする
            setIsRestoreLidOpen(true);
            handleBulkRestore();
          }}
          restoreButtonRef={restoreButtonRef}
          isRestoring={isRestoreLidOpen}
          animatedRestoreCount={currentRestoreDisplayCount}
          useAnimatedRestoreCount={true}
          // アニメーション付きカウンター（タスク側で実装済み）
          animatedDeleteCount={currentDisplayCount}
          useAnimatedDeleteCount={true}
        />
      )}

      {/* 選択メニューボタン（通常タブでアイテム選択時） */}
      {!hideBulkActionButtons && (
        <SelectionMenuButton
          count={checkedTasks.size}
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
          onAssignee={() => {
            if (bulkAssigneeContext && tasks) {
              bulkAssigneeContext.openBulkAssigneeModal(
                checkedTasks,
                tasks.map((t) => ({ id: t.id, content: t })),
                () => setCheckedTasks(new Set()),
              );
            }
          }}
          isTaskMode={true}
          teamMode={teamMode}
          isVisible={
            activeTab !== "deleted" && checkedTasks.size > 0 && !isDeleting
          }
        />
      )}

      {/* ボード追加ボタン（ボードから呼び出された場合のみ） */}
      {onAddToBoard && checkedTasks.size > 0 && activeTab !== "deleted" && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20">
          <button
            onClick={() => onAddToBoard(Array.from(checkedTasks))}
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
            選択したタスクをボードに追加 ({checkedTasks.size})
          </button>
        </div>
      )}
    </div>
  );

  // 中央パネルのコンテンツ
  const centerPanelContent = (
    <div
      className={`h-full ${shouldShowPanelControls && !showListPanel ? "pl-2" : ""}`}
    >
      {/* 左パネル非表示時は中央にヘッダーを表示 */}
      {shouldShowPanelControls && !showListPanel && (
        <DesktopUpper {...desktopUpperCommonProps} hideTabs={true} />
      )}
      {/* 新規作成モード */}
      {taskScreenMode === "create" && (
        <TaskEditor
          key="task-create"
          task={null}
          onClose={() => setTaskScreenMode("list")}
          onSelectTask={onSelectTask}
          customHeight="flex-1 min-h-0"
          showDateAtBottom={true}
          onSaveComplete={(savedTask, isNewTask, isContinuousMode) => {
            if (isNewTask && !isContinuousMode) {
              onSelectTask(savedTask);
              setTaskScreenMode("view");
            } else if (isNewTask && isContinuousMode) {
              onSelectTask(null);
            }
          }}
          preloadedTags={tags || []}
          preloadedBoards={boards || []}
          preloadedTaggings={safeAllTaggings}
          preloadedBoardItems={safeAllBoardItems}
          preloadedItemBoards={itemBoards}
          unifiedOperations={unifiedOperations}
          taskEditorHasUnsavedChangesRef={
            teamMode
              ? taskEditorHasUnsavedChangesRef
              : personalHasUnsavedChangesRef
          }
          taskEditorShowConfirmModalRef={
            teamMode
              ? taskEditorShowConfirmModalRef
              : personalShowConfirmModalRef
          }
        />
      )}
      {/* 表示モード（既存タスク） */}
      {taskScreenMode === "view" &&
        latestSelectedTask &&
        !selectedDeletedTask && (
          <TaskEditor
            key={`task-view-${latestSelectedTask.id}`}
            task={latestSelectedTask}
            onClose={() => {
              if (teamMode) {
                onClearSelection?.();
              } else {
                onSelectTask(null); // 個人モードでは選択を解除
              }
              setTaskScreenMode("list");
            }}
            onSelectTask={onSelectTask}
            onClosePanel={() => setTaskScreenMode("list")}
            onDeleteAndSelectNext={handleTaskDeleteAndSelectNext}
            createdBy={latestSelectedTask.createdBy}
            createdByUserId={latestSelectedTask.userId}
            createdByAvatarColor={latestSelectedTask.avatarColor}
            customHeight="flex-1 min-h-0"
            showDateAtBottom={true}
            preloadedTags={tags || []}
            preloadedBoards={boards || []}
            preloadedTaggings={safeAllTaggings}
            preloadedBoardItems={safeAllBoardItems}
            preloadedItemBoards={itemBoards}
            unifiedOperations={unifiedOperations}
            taskEditorHasUnsavedChangesRef={
              teamMode
                ? taskEditorHasUnsavedChangesRef
                : personalHasUnsavedChangesRef
            }
            taskEditorShowConfirmModalRef={
              teamMode
                ? taskEditorShowConfirmModalRef
                : personalShowConfirmModalRef
            }
          />
        )}
      {/* 表示モード（削除済みタスク） */}
      {taskScreenMode === "view" && selectedDeletedTask && !selectedTask && (
        <TaskEditor
          key={`task-deleted-${selectedDeletedTask.id}`}
          task={selectedDeletedTask}
          onClose={() => setTaskScreenMode("list")}
          taskEditorHasUnsavedChangesRef={taskEditorHasUnsavedChangesRef}
          taskEditorShowConfirmModalRef={taskEditorShowConfirmModalRef}
          onDelete={async () => {
            if (selectedDeletedTask && deletedTasks) {
              const currentIndex = deletedTasks.findIndex(
                (task) => task.displayId === selectedDeletedTask.displayId,
              );
              const remainingTasks = deletedTasks.filter(
                (task) => task.displayId !== selectedDeletedTask.displayId,
              );
              await permanentDeleteTask.mutateAsync(
                selectedDeletedTask.displayId,
              );
              if (remainingTasks.length > 0) {
                const nextIndex =
                  currentIndex >= remainingTasks.length
                    ? remainingTasks.length - 1
                    : currentIndex;
                onSelectDeletedTask(remainingTasks[nextIndex] || null);
              } else {
                setTaskScreenMode("list");
              }
            }
          }}
          onRestoreAndSelectNext={unifiedRestoreAndSelectNext}
          createdBy={selectedDeletedTask.createdBy}
          createdByUserId={selectedDeletedTask.userId}
          createdByAvatarColor={selectedDeletedTask.avatarColor}
          customHeight="flex-1 min-h-0"
          preloadedTags={tags || []}
          preloadedBoards={boards || []}
          preloadedTaggings={safeAllTaggings}
          preloadedBoardItems={safeAllBoardItems}
          preloadedItemBoards={itemBoards}
          unifiedOperations={unifiedOperations}
        />
      )}
    </div>
  );

  // 右パネルのコンテンツ（チームモードのみコメント表示）
  // デスクトップ用: showCommentPanelで制御
  const rightPanelContentDesktop =
    teamMode &&
    taskScreenMode !== "create" &&
    selectedTask &&
    showCommentPanel ? (
      <>
        {shouldShowPanelControls && !showListPanel && !showDetailPanel && (
          <DesktopUpper {...desktopUpperCommonProps} hideTabs={true} />
        )}
        <CommentSection
          targetType="task"
          targetDisplayId={
            selectedTask.displayId || selectedTask.displayId || ""
          }
          teamId={teamId || 0}
          title={`#${selectedTask.displayId} ${selectedTask.title || "タイトルなし"}`}
          placeholder="コメントを入力..."
          teamMembers={teamMembers}
        />
      </>
    ) : null;

  // モバイル用: 常に表示可能（showCommentPanelに関わらず）
  const rightPanelContentMobile =
    teamMode && taskScreenMode !== "create" && selectedTask ? (
      <CommentSection
        targetType="task"
        targetDisplayId={selectedTask.displayId || selectedTask.displayId || ""}
        teamId={teamId || 0}
        title={`#${selectedTask.displayId} ${selectedTask.title || "タイトルなし"}`}
        placeholder="コメントを入力..."
        teamMembers={teamMembers}
      />
    ) : null;

  // URLからの復元待ち（initialTaskIdありの場合）
  if (!isFullyLoaded) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="h-full">
      {/* デスクトップ表示 */}
      <div className="hidden md:block h-full">
        {taskScreenMode === "list" ? (
          // リストモード: 1パネル表示
          leftPanelContent
        ) : (
          // 選択モード: 2/3パネル表示
          <ControlPanelLayout
            leftPanel={leftPanelContent}
            centerPanel={centerPanelContent}
            rightPanel={rightPanelContentDesktop}
            storageKey={
              teamMode
                ? "team-task-3panel-sizes-v2"
                : "personal-task-2panel-sizes-v1"
            }
            defaultSizes={
              teamMode
                ? { left: 25, center: 50, right: 25 }
                : { left: 35, center: 65, right: 0 }
            }
            skipInitialSave={true}
            stateKey={selectedTask?.displayId || "none"}
            visibility={
              teamMode
                ? {
                    left: showListPanel,
                    center: showDetailPanel,
                    right: showCommentPanel,
                  }
                : {
                    left: showListPanel,
                    center: true, // 個人モードでは詳細は常に表示
                    right: false, // 個人モードではコメントなし
                  }
            }
          />
        )}
      </div>

      {/* モバイル: 1パネル表示（一覧 OR タスク OR コメント OR 画像 排他的表示） */}
      <div className="md:hidden h-full flex flex-col">
        {!selectedTask &&
        !selectedDeletedTask &&
        taskScreenMode !== "create" ? (
          <>
            {/* ツールバーを固定位置に配置 */}
            <div className="flex-shrink-0 bg-white">
              <DesktopUpper {...desktopUpperCommonProps} />
            </div>
            {/* スクロール可能なコンテンツ */}
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain pb-40 md:pb-16">
              <DesktopLower
                currentMode="task"
                activeTab={activeTabTyped}
                effectiveColumnCount={effectiveColumnCount}
                isLoading={taskLoading}
                error={taskError}
                selectionMode={selectionMode}
                tasks={filteredTasks}
                deletedTasks={deletedTasks || []}
                selectedTask={latestSelectedTask}
                selectedDeletedTask={selectedDeletedTask}
                checkedTasks={checkedTasks}
                checkedDeletedTasks={checkedDeletedTasks}
                onToggleCheckTask={handleTaskToggleWithTabClear}
                onToggleCheckDeletedTask={createToggleHandler(
                  checkedDeletedTasks,
                  setCheckedDeletedTasks,
                )}
                onSelectTask={handleSelectTask}
                onSelectDeletedTask={handleSelectDeletedTask}
                allTags={tags || []}
                allBoards={boards || []}
                allTaggings={safeAllTaggings}
                allBoardItems={safeAllBoardItems}
                allAttachments={allTaskAttachments || []}
                teamMode={teamMode}
                // フィルター設定（ViewSettingsContextから取得）
                selectedTagIds={selectedTagIds}
                tagFilterMode={tagFilterMode}
                selectedBoardIds={selectedBoardIds}
                boardFilterMode={boardFilterMode}
              />
              {/* モバイル: タスク追加FABボタン（削除済みタブ以外で表示） */}
              <MobileFabButton
                type="task"
                teamMode={teamMode}
                show={activeTab !== "deleted"}
              />
            </div>
          </>
        ) : taskEditorTab === "task" ? (
          <div className="h-full overflow-y-auto overscroll-contain">
            {centerPanelContent}
          </div>
        ) : taskEditorTab === "comment" ? (
          <div className="h-full overflow-y-auto overscroll-contain">
            {rightPanelContentMobile}
          </div>
        ) : (
          <div className="h-full overflow-y-auto overscroll-contain">
            <MobileAttachmentView
              selectedTask={latestSelectedTask || null}
              teamId={teamId}
            />
          </div>
        )}
      </div>

      {/* モーダル（3パネルレイアウト外側） */}
      <DeleteModal />
      <RestoreModal />
      <TaskCsvImport
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
        selectedItemCount={checkedTasks.size}
        itemType="task"
        selectedItems={Array.from(checkedTasks).map((id) => id.toString())}
        allItems={tasks || []}
        allTaggings={safeAllTaggings || []}
        onSuccess={() => {
          setCheckedTasks(new Set());
        }}
      />
      {/* 担当者一括設定モーダルはBulkAssigneeProvider経由で表示 */}
    </div>
  );
}

export default TaskScreen;
