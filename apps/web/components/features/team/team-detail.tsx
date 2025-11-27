"use client";

import NotificationList from "@/components/features/notifications/notification-list";
import { ActivityFeed } from "@/components/features/team/activity-feed";
import { TeamSettings } from "@/components/features/team/team-settings";
import WarningIcon from "@/components/icons/warning-icon";
import { DisplayNameModal } from "@/components/modals/display-name-modal";
import { TeamDisplayNameModal } from "@/components/modals/team-display-name-modal";
import BoardScreen from "@/components/screens/board-screen";
import { TeamBoardDetailWrapper } from "@/components/features/team/team-board-detail-wrapper";
import MemoScreen from "@/components/screens/memo-screen";
import SearchScreen from "@/components/screens/search-screen";
import TaskScreen from "@/components/screens/task-screen";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/ui/buttons/back-button";
import { Card } from "@/components/ui/card";
import Modal from "@/components/ui/modals/modal";
import { usePageVisibility } from "@/src/contexts/PageVisibilityContext";
import {
  useDeleteInviteUrl,
  useGenerateInviteCode,
  useGetInviteUrl,
} from "@/src/hooks/use-generate-invite-code";
import { useJoinRequests } from "@/src/hooks/use-join-requests";
import { useKickMember } from "@/src/hooks/use-kick-member";
import { useManageJoinRequest } from "@/src/hooks/use-manage-join-request";
import { useSimpleTeamNotifier } from "@/src/hooks/use-simple-team-notifier";
import { useTeamDetail } from "@/src/hooks/use-team-detail";
import { useUserInfo } from "@/src/hooks/use-user-info";
import { useUpdateMemberDisplayName } from "@/src/hooks/use-update-member-display-name";
import UserMemberCard from "@/components/shared/user-member-card";
import type { DeletedMemo, Memo } from "@/src/types/memo";
import type { DeletedTask, Task } from "@/src/types/task";
import { useUnifiedItemOperations } from "@/src/hooks/use-unified-item-operations";
import { formatDateOnly } from "@/src/utils/formatDate";
import { getUserAvatarColor } from "@/src/utils/userUtils";
import { useQueryClient } from "@tanstack/react-query";
import {
  CopyIcon,
  RefreshCcwIcon,
  Settings as SettingsIcon,
  TrashIcon,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useTeamDetail as useTeamDetailContext } from "@/src/contexts/team-detail-context";
import { useNavigation } from "@/src/contexts/navigation-context";
import { useAttachments } from "@/src/hooks/use-attachments";
import { useTeamComments } from "@/src/hooks/use-team-comments";
import { useToast } from "@/src/contexts/toast-context";

interface TeamDetailProps {
  customUrl: string;
}

export function TeamDetail({ customUrl }: TeamDetailProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { data: team, isLoading, error } = useTeamDetail(customUrl);
  const { showToast } = useToast();
  const {
    setSelectedMemoId,
    setSelectedTaskId,
    setIsCreatingMemo,
    setIsCreatingTask,
    setImageCount,
    setCommentCount,
    setTaskImageCount,
    setTaskCommentCount,
    taskEditorHasUnsavedChangesRef,
    taskEditorShowConfirmModalRef,
    setActiveTab: setActiveTabContext,
  } = useTeamDetailContext();

  // 楽観的更新用（サイドバーアイコンを即座に切り替え）
  const { setOptimisticMode } = useNavigation();

  // 🛡️ ページ可視性をContextから取得
  const { isVisible: isPageVisible } = usePageVisibility();

  // 通知状態をチェック（承認待ちリスト表示制御用）
  const { data: notificationData, checkNow: recheckNotifications } =
    useSimpleTeamNotifier(customUrl, isPageVisible);

  const { data: userInfo } = useUserInfo();

  // 管理者のみ招待URL関連のhooksを実行（パフォーマンス最適化）
  const isAdmin = team?.role === "admin";
  const { data: existingInviteUrl, isLoading: isLoadingInviteUrl } =
    useGetInviteUrl(isAdmin ? customUrl : "");
  const { mutate: generateInviteCode, isPending: isGenerating } =
    useGenerateInviteCode();
  const { mutate: deleteInviteUrl, isPending: isDeleting } =
    useDeleteInviteUrl();
  const { data: joinRequests, isLoading: isLoadingJoinRequests } =
    useJoinRequests(
      isAdmin ? customUrl : "",
      isAdmin ? notificationData?.hasNotifications : false,
      isAdmin ? isPageVisible : false,
    );

  const {
    approve,
    reject,
    isApproving,
    isRejecting,
    approveError,
    rejectError,
  } = useManageJoinRequest(isAdmin ? customUrl : "");

  const { mutate: updateDisplayName } = useUpdateMemberDisplayName();

  const [showInvitePanel, setShowInvitePanel] = useState(false);
  const [previousTab, setPreviousTab] = useState<string | null>(null);
  const [inviteMessage, setInviteMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [displayInviteUrl, setDisplayInviteUrl] = useState<string>("");

  // メンバー管理用の編集モード
  const [isEditMode, setIsEditMode] = useState(false);

  // 選択状態の管理
  const [selectedMemo, setSelectedMemo] = useState<Memo | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedDeletedMemo, setSelectedDeletedMemo] =
    useState<DeletedMemo | null>(null);
  const [selectedDeletedTask, setSelectedDeletedTask] =
    useState<DeletedTask | null>(null);

  // TaskScreenの作成モード状態を監視
  const [isTaskCreateMode, setIsTaskCreateMode] = useState(false);

  // 🎯 統一フック（チーム用）- 最上位で1つだけ作成
  const teamMemoOperations = useUnifiedItemOperations({
    itemType: "memo",
    context: "team",
    teamId: team?.id,
  });

  const teamTaskOperations = useUnifiedItemOperations({
    itemType: "task",
    context: "team",
    teamId: team?.id,
  });

  // 表示名設定モーダル
  const [showDisplayNameModal, setShowDisplayNameModal] = useState(false);

  // チーム表示名変更モーダル
  const [showTeamDisplayNameModal, setShowTeamDisplayNameModal] =
    useState(false);
  const [currentMemberDisplayName, setCurrentMemberDisplayName] = useState<
    string | null
  >(null);

  // selectedMemoの変更をContextに反映
  useEffect(() => {
    setSelectedMemoId(selectedMemo?.id ?? null);
  }, [selectedMemo, setSelectedMemoId]);

  // 画像数とコメント数を取得（モバイルフッター用）
  const { data: attachments = [] } = useAttachments(
    team?.id,
    "memo",
    selectedMemo ? selectedMemo.displayId : "",
  );
  const { data: comments = [] } = useTeamComments(
    team?.id,
    "memo",
    selectedMemo ? selectedMemo.displayId : "",
  );

  // 画像数とコメント数をContextに反映（メモ用）
  useEffect(() => {
    setImageCount(attachments.length);
    setCommentCount(comments.length);
  }, [attachments.length, comments.length, setImageCount, setCommentCount]);

  // タスク用の画像数とコメント数を取得（モバイルフッター用）
  const { data: taskAttachments = [] } = useAttachments(
    team?.id,
    "task",
    selectedTask ? selectedTask.displayId : "",
  );
  const { data: taskComments = [] } = useTeamComments(
    team?.id,
    "task",
    selectedTask ? selectedTask.displayId : "",
  );

  // タスク用の画像数とコメント数をContextに反映
  useEffect(() => {
    setTaskImageCount(taskAttachments.length);
    setTaskCommentCount(taskComments.length);
  }, [
    taskAttachments.length,
    taskComments.length,
    setTaskImageCount,
    setTaskCommentCount,
  ]);

  // キック機能
  const [kickConfirmModal, setKickConfirmModal] = useState<{
    userId: string;
    displayName: string;
  } | null>(null);
  const kickMutation = useKickMember();

  // 承認処理（通知即座更新付き）
  const handleApprove = (requestId: number) => {
    approve(requestId);
    // 承認後に通知システムを即座に更新（ヘッダーベルアイコン含む）
    setTimeout(() => {
      // 1. join-requestsクエリ無効化（承認リスト更新）
      queryClient.invalidateQueries(["join-requests", customUrl]);
      // 2. 通知チェックAPIを強制実行（ヘッダーベルアイコン更新）
      if (recheckNotifications) {
        recheckNotifications();
      }
      // 3. 全ての通知チェッカーを強制更新（ヘッダー含む）
      window.dispatchEvent(
        new CustomEvent("force-notification-check", {
          detail: { teamName: customUrl },
        }),
      );
    }, 500); // API処理完了後に実行
  };

  // 拒否処理（通知即座更新付き）
  const handleReject = (requestId: number) => {
    reject(requestId);
    // 拒否後に通知システムを即座に更新（ヘッダーベルアイコン含む）
    setTimeout(() => {
      // 1. join-requestsクエリ無効化（承認リスト更新）
      queryClient.invalidateQueries(["join-requests", customUrl]);
      // 2. 通知チェックAPIを強制実行（ヘッダーベルアイコン更新）
      if (recheckNotifications) {
        recheckNotifications();
      }
      // 3. 全ての通知チェッカーを強制更新（ヘッダー含む）
      window.dispatchEvent(
        new CustomEvent("force-notification-check", {
          detail: { teamName: customUrl },
        }),
      );
    }, 500); // API処理完了後に実行
  };

  const handleKickMember = () => {
    if (!kickConfirmModal) return;

    kickMutation.mutate(
      {
        customUrl: customUrl,
        userId: kickConfirmModal.userId,
      },
      {
        onSuccess: () => {
          setKickConfirmModal(null);
          setInviteMessage({
            type: "success",
            text: "メンバーを削除しました",
          });
          setTimeout(() => setInviteMessage(null), 2000);
        },
        onError: (error: any) => {
          console.error("メンバーのキックに失敗:", error);
        },
      },
    );
  };

  // URLのクエリパラメータからタブとアイテムIDを取得
  const getTabFromURL = () => {
    // パラメータの存在から自動判定（新形式）
    if (searchParams.has("board")) return "board";
    if (searchParams.has("memo")) return "memos"; // memo（値あり/なし）→ memosタブ
    if (searchParams.has("task")) return "tasks"; // task（値あり/なし）→ tasksタブ
    if (searchParams.has("boards")) return "boards";
    if (searchParams.has("search")) return "search";
    if (searchParams.has("team-list")) return "team-list";
    if (searchParams.has("team-settings")) return "team-settings";
    // 旧形式の互換性（後で削除される）
    if (searchParams.has("memos")) return "memos";
    if (searchParams.has("tasks")) return "tasks";

    // 旧形式の互換性対応
    const tab = searchParams.get("tab");
    if (tab === "settings") {
      return "team-settings";
    }

    if (
      tab === "memos" ||
      tab === "tasks" ||
      tab === "boards" ||
      tab === "board" ||
      tab === "team-list" ||
      tab === "team-settings" ||
      tab === "search"
    ) {
      return tab;
    }

    // デフォルトはoverview（ホーム画面）
    return "overview";
  };

  const getMemoIdFromURL = () => {
    return searchParams.get("memo");
  };

  const getTaskIdFromURL = () => {
    return searchParams.get("task");
  };

  const getBoardSlugFromURL = () => {
    // 新形式（board=xxx）と旧形式（slug=xxx）の両方に対応
    return searchParams.get("board") || searchParams.get("slug");
  };

  // タブ管理（URLと同期）
  const [activeTab, setActiveTab] = useState<
    | "overview"
    | "memos"
    | "tasks"
    | "boards"
    | "board"
    | "team-list"
    | "team-settings"
    | "search"
  >(getTabFromURL());

  // モバイル用：通知/アクティビティの切り替え
  const [mobileOverviewTab, setMobileOverviewTab] = useState<
    "notifications" | "activity"
  >("notifications");

  // 初回レンダリング時に Context を同期
  useEffect(() => {
    const initialTab = getTabFromURL();
    setActiveTabContext(initialTab);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // URLのパラメータが変更された時にタブとアイテムを更新
  useEffect(() => {
    const tab = searchParams.get("tab");
    const slug = searchParams.get("slug");

    // 旧形式のURLを新形式に自動変換
    if (tab) {
      const params = new URLSearchParams(searchParams.toString());

      // 旧URL(?tab=settings)を新URL(?tab=team-settings)に自動リダイレクト
      if (tab === "settings") {
        params.set("tab", "team-settings");
        const newUrl = `?${params.toString()}`;
        router.replace(`/team/${customUrl}${newUrl}`, { scroll: false });
        return;
      }
      // 新形式に変換
      else if (tab === "board" && slug) {
        params.delete("tab");
        params.set("board", slug);
        params.delete("slug");
        const newUrl = `?${params.toString()}`;
        router.replace(`/team/${customUrl}${newUrl}`, { scroll: false });
        return;
      } else if (tab === "memos") {
        // 旧形式 ?tab=memos → 新形式 ?memo
        params.delete("tab");
        const baseParams = params.toString();
        const newUrl = baseParams ? `?${baseParams}&memo` : "?memo";
        router.replace(`/team/${customUrl}${newUrl}`, { scroll: false });
        return;
      } else if (tab === "boards") {
        params.delete("tab");
        const baseParams = params.toString();
        const newUrl = baseParams ? `?${baseParams}&boards` : "?boards";
        router.replace(`/team/${customUrl}${newUrl}`, { scroll: false });
        return;
      } else if (tab === "search") {
        params.delete("tab");
        const baseParams = params.toString();
        const newUrl = baseParams ? `?${baseParams}&search` : "?search";
        router.replace(`/team/${customUrl}${newUrl}`, { scroll: false });
        return;
      } else if (tab === "tasks") {
        // 旧形式 ?tab=tasks → 新形式 ?task
        params.delete("tab");
        const baseParams = params.toString();
        const newUrl = baseParams ? `?${baseParams}&task` : "?task";
        router.replace(`/team/${customUrl}${newUrl}`, { scroll: false });
        return;
      } else if (tab === "overview") {
        // overviewは廃止しパラメータなしにリダイレクト
        params.delete("tab");
        const newUrl = params.toString() ? `?${params.toString()}` : "";
        router.replace(`/team/${customUrl}${newUrl}`, { scroll: false });
        return;
      } else if (tab === "team-list") {
        params.delete("tab");
        const baseParams = params.toString();
        const newUrl = baseParams ? `?${baseParams}&team-list` : "?team-list";
        router.replace(`/team/${customUrl}${newUrl}`, { scroll: false });
        return;
      } else if (tab === "team-settings") {
        params.delete("tab");
        const baseParams = params.toString();
        const newUrl = baseParams
          ? `?${baseParams}&team-settings`
          : "?team-settings";
        router.replace(`/team/${customUrl}${newUrl}`, { scroll: false });
        return;
      }
    }

    // 旧形式の値なしパラメータ（?memos, ?tasks）を新形式（?memo, ?task）にリダイレクト
    if (searchParams.has("memos") && !searchParams.get("memos")) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("memos");
      const baseParams = params.toString();
      const newUrl = baseParams ? `?${baseParams}&memo` : "?memo";
      router.replace(`/team/${customUrl}${newUrl}`, { scroll: false });
      return;
    }
    if (searchParams.has("tasks") && !searchParams.get("tasks")) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("tasks");
      const baseParams = params.toString();
      const newUrl = baseParams ? `?${baseParams}&task` : "?task";
      router.replace(`/team/${customUrl}${newUrl}`, { scroll: false });
      return;
    }

    // パラメータが全くない場合はデフォルトでoverview
    // activeTabがoverviewの時はリダイレクトしない（無限ループ防止）

    const newTab = getTabFromURL();
    // URL同期確認のみ（状態更新は handleTabChange で即座に実行済み）
    // ブラウザの戻る/進むボタンでの変更時のみ状態を更新
    if (newTab !== activeTab) {
      // ブラウザナビゲーション（戻る/進む）による変更の場合のみ更新
      setActiveTab(newTab);
      setActiveTabContext(newTab);
    }

    // メモIDがURLにある場合、メモを選択状態にする
    const memoId = getMemoIdFromURL();
    if (memoId && !selectedMemo) {
      // APIからメモを取得する実装は各画面コンポーネント側で行う
      // ここでは状態の同期のみ
    }

    // タスクIDがURLにある場合、タスクを選択状態にする（作成モード時は除く）
    const taskId = getTaskIdFromURL();

    if (taskId && !selectedTask && !isTaskCreateMode) {
      // APIからタスクを取得する実装は各画面コンポーネント側で行う
      // ここでは状態の同期のみ
    } else if (taskId && isTaskCreateMode) {
    } else if (taskId && selectedTask) {
    }
    // searchParams自体を依存配列に（.toString()は毎回新しいインスタンスを作るので無限ループの原因）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // 招待URLをクライアントサイドで更新
  useEffect(() => {
    if (typeof window !== "undefined" && existingInviteUrl?.token) {
      setDisplayInviteUrl(
        `${window.location.origin}/join/${customUrl}?token=${existingInviteUrl.token}`,
      );
    }
  }, [existingInviteUrl, customUrl]);

  // タブを変更する関数（URLも更新）
  const handleTabChange = useCallback(
    (
      tab:
        | "overview"
        | "memos"
        | "tasks"
        | "boards"
        | "board"
        | "team-list"
        | "team-settings"
        | "search",
      options?: { slug?: string; fromSidebar?: boolean },
    ) => {
      // 🚀 楽観的更新：サイドバーアイコンを即座に切り替え
      if (tab === "memos") {
        setOptimisticMode("memo");
      } else if (tab === "tasks") {
        setOptimisticMode("task");
      } else if (tab === "boards") {
        setOptimisticMode("board");
      } else {
        setOptimisticMode(null);
      }

      // ボード詳細以外に移動する場合、ボード名を即座にクリア
      if (tab !== "board") {
        window.dispatchEvent(new CustomEvent("team-clear-board-name"));
      }

      setActiveTab(tab);
      setActiveTabContext(tab); // Context を更新（ヘッダー表示切り替え用）

      // URLを更新
      const params = new URLSearchParams(searchParams.toString());

      // 旧形式のパラメータを削除
      params.delete("tab");
      params.delete("slug");

      // 不要なタブパラメータを削除（新旧両形式）
      params.delete("memos"); // 旧形式
      params.delete("tasks"); // 旧形式
      params.delete("memo"); // 新形式（タブ切り替え時は常に削除）
      params.delete("task"); // 新形式（タブ切り替え時は常に削除）
      params.delete("boards");
      params.delete("board");
      params.delete("search");
      params.delete("team-list");
      params.delete("team-settings");

      // タブ切り替え時に選択状態をクリア
      if (tab !== "memos") {
        setSelectedMemo(null);
        setSelectedDeletedMemo(null);
      }
      if (tab !== "tasks") {
        setSelectedTask(null);
        setSelectedDeletedTask(null);
      }

      // タブに応じた新しいパラメータを設定（値なしパラメータは手動で追加）
      let newUrl = "";
      if (tab === "team-list") {
        const baseParams = params.toString();
        newUrl = baseParams ? `?${baseParams}&team-list` : "?team-list";
      } else if (tab === "team-settings") {
        const baseParams = params.toString();
        newUrl = baseParams ? `?${baseParams}&team-settings` : "?team-settings";
      } else if (tab === "board" && options?.slug) {
        params.set("board", options.slug);
        newUrl = params.toString() ? `?${params.toString()}` : "";
      } else if (tab === "memos") {
        // メモ一覧は ?memo（値なし）
        const baseParams = params.toString();
        newUrl = baseParams ? `?${baseParams}&memo` : "?memo";
      } else if (tab === "boards") {
        const baseParams = params.toString();
        newUrl = baseParams ? `?${baseParams}&boards` : "?boards";
      } else if (tab === "search") {
        const baseParams = params.toString();
        newUrl = baseParams ? `?${baseParams}&search` : "?search";
      } else if (tab === "tasks") {
        // タスク一覧は ?task（値なし）
        const baseParams = params.toString();
        newUrl = baseParams ? `?${baseParams}&task` : "?task";
      } else {
        // overview（ホーム）のみパラメータ不要
        newUrl = params.toString() ? `?${params.toString()}` : "";
      }

      router.replace(`/team/${customUrl}${newUrl}`, { scroll: false });
    },
    [router, customUrl, searchParams, setActiveTabContext, setOptimisticMode],
  );

  // activeTabが変更された時にlayoutに通知
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("team-tab-change", {
        detail: { activeTab },
      }),
    );
  }, [activeTab]);

  // ボード削除後のトースト表示（URLパラメータ変化を検知）
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "boards") {
      const boardDeleted = sessionStorage.getItem("boardDeleted");
      if (boardDeleted === "true") {
        sessionStorage.removeItem("boardDeleted");
        // ボード一覧のキャッシュを完全削除して最新データを取得
        if (team?.id) {
          ["normal", "completed", "deleted"].forEach((status) => {
            queryClient.removeQueries({
              queryKey: ["team-boards", team.id, status],
            });
          });
        }
        showToast("ボードが削除されました", "success");
      }
    }
  }, [searchParams, showToast, team?.id, queryClient]);

  // サイドバーからのイベントをリッスン
  useEffect(() => {
    const handleTeamModeChange = (event: CustomEvent) => {
      const { mode } = event.detail;

      if (mode === "overview") {
        handleTabChange("overview", { fromSidebar: true });
      } else if (mode === "memo") {
        handleTabChange("memos", { fromSidebar: true });
      } else if (mode === "task") {
        handleTabChange("tasks", { fromSidebar: true });
      } else if (mode === "board") {
        handleTabChange("boards", { fromSidebar: true });
      } else if (mode === "team-list") {
        handleTabChange("team-list", { fromSidebar: true });
      } else if (mode === "team-settings") {
        handleTabChange("team-settings", { fromSidebar: true });
      } else if (mode === "search") {
        handleTabChange("search", { fromSidebar: true });
      }
    };

    const handleTeamSearchChange = () => {
      handleTabChange("search");
    };

    const handleTeamListChange = () => {
      handleTabChange("team-list");
    };

    const handleTeamMemoCreate = (_event: CustomEvent) => {
      setIsCreatingMemo(true);
      handleTabChange("memos");
      // MemoScreenは useEffect で isCreatingMemo の変化を検知して新規作成モードに入る
      // イベントの再発火は不要（無限ループの原因になる）
    };

    const handleTeamTaskCreate = (_event: CustomEvent) => {
      setIsCreatingTask(true);
      handleTabChange("tasks");
      // TaskScreenは useEffect で isCreatingTask の変化を検知して新規作成モードに入る
      // イベントの再発火は不要（無限ループの原因になる）
    };

    const handleBackToMemoList = (_event: CustomEvent) => {
      // メモの選択を解除してメモ一覧に戻る
      setSelectedMemo(null);
      setSelectedDeletedMemo(null);
      setIsCreatingMemo(false);
      // handleTabChangeを使って即座にタブ切り替え（サイドバー経由フラグを付与）
      handleTabChange("memos", { fromSidebar: true });
    };

    const handleBackToTaskList = (_event: CustomEvent) => {
      // タスクの選択を解除してタスク一覧に戻る
      setSelectedTask(null);
      setSelectedTaskId(null);
      setSelectedDeletedTask(null);
      setIsCreatingTask(false);
      // handleTabChangeを使って即座にタブ切り替え（サイドバー経由フラグを付与）
      handleTabChange("tasks", { fromSidebar: true });
    };

    window.addEventListener(
      "team-mode-change",
      handleTeamModeChange as EventListener,
    );

    window.addEventListener(
      "team-search-change",
      handleTeamSearchChange as EventListener,
    );

    window.addEventListener(
      "team-list-change",
      handleTeamListChange as EventListener,
    );

    // team-memo-create と team-task-create はMemoScreen/TaskScreenが直接リッスンするので
    // ここでリッスンすると無限ループになる（イベント再発火が不要）
    // window.addEventListener("team-memo-create", handleTeamMemoCreate);
    // window.addEventListener("team-task-create", handleTeamTaskCreate);

    window.addEventListener(
      "team-back-to-memo-list",
      handleBackToMemoList as EventListener,
    );

    window.addEventListener(
      "team-back-to-task-list",
      handleBackToTaskList as EventListener,
    );

    return () => {
      window.removeEventListener(
        "team-mode-change",
        handleTeamModeChange as EventListener,
      );
      window.removeEventListener(
        "team-search-change",
        handleTeamSearchChange as EventListener,
      );
      window.removeEventListener(
        "team-list-change",
        handleTeamListChange as EventListener,
      );
      window.removeEventListener(
        "team-back-to-memo-list",
        handleBackToMemoList as EventListener,
      );
      window.removeEventListener(
        "team-back-to-task-list",
        handleBackToTaskList as EventListener,
      );
    };
  }, [handleTabChange]);

  // メモ/タスク選択ハンドラー
  const handleSelectMemo = (memo: Memo | null) => {
    setSelectedMemo(memo);

    // 新規作成状態をクリア
    setIsCreatingMemo(false);

    // URLを更新
    const params = new URLSearchParams(searchParams.toString());
    // 旧形式のパラメータを削除
    params.delete("tab");
    params.delete("slug");
    params.delete("board");
    params.delete("boards");
    params.delete("memos"); // 旧形式
    params.delete("tasks"); // 旧形式
    params.delete("task");

    if (memo) {
      // メモ個別表示: ?memo=2
      params.set("memo", memo.displayId);
      const newUrl = `?${params.toString()}`;
      router.replace(`/team/${customUrl}${newUrl}`, { scroll: false });
    } else {
      // メモ一覧表示: ?memo（値なし）
      params.delete("memo");
      const baseParams = params.toString();
      const newUrl = baseParams ? `?${baseParams}&memo` : "?memo";
      router.replace(`/team/${customUrl}${newUrl}`, { scroll: false });
    }
  };

  const handleSelectTask = (task: Task | null, _fromFullList?: boolean) => {
    setSelectedTask(task);
    setSelectedTaskId(task?.id ?? null);

    // タスクを選択した時のみ新規作成状態をクリア
    // task=nullの時は新規作成中の可能性があるのでクリアしない
    if (task !== null) {
      setIsCreatingTask(false);
    }

    // URLを更新
    const params = new URLSearchParams(searchParams.toString());
    // 旧形式のパラメータを削除
    params.delete("tab");
    params.delete("slug");
    params.delete("board");
    params.delete("boards");
    params.delete("memos"); // 旧形式
    params.delete("tasks"); // 旧形式
    params.delete("memo");

    if (task) {
      // タスク個別表示: ?task=123
      params.set("task", task.displayId);
      const newUrl = `?${params.toString()}`;
      router.replace(`/team/${customUrl}${newUrl}`, { scroll: false });
    } else {
      // タスク一覧表示: ?task（値なし）
      params.delete("task");
      const baseParams = params.toString();
      const newUrl = baseParams ? `?${baseParams}&task` : "?task";
      router.replace(`/team/${customUrl}${newUrl}`, { scroll: false });
    }
  };

  const handleSelectDeletedMemo = (memo: DeletedMemo | null) => {
    // 通常メモの選択をクリア（削除済みメモを選択する場合）
    if (memo && selectedMemo) {
      setSelectedMemo(null);
    }

    // 状態を更新
    setSelectedDeletedMemo(memo);
    setSelectedMemoId(memo?.id ?? null);

    // URLを更新
    const params = new URLSearchParams(searchParams.toString());
    // 旧形式のパラメータを削除
    params.delete("tab");
    params.delete("slug");
    params.delete("board");
    params.delete("boards");
    params.delete("memos"); // 旧形式
    params.delete("tasks"); // 旧形式
    params.delete("task");

    if (memo) {
      // 削除済みメモ個別表示: ?memo=2
      params.set("memo", memo.displayId);
      const newUrl = `?${params.toString()}`;
      router.replace(`/team/${customUrl}${newUrl}`, { scroll: false });
    } else {
      // メモ一覧表示: ?memo（値なし）
      params.delete("memo");
      const baseParams = params.toString();
      const newUrl = baseParams ? `?${baseParams}&memo` : "?memo";
      router.replace(`/team/${customUrl}${newUrl}`, { scroll: false });
    }
  };

  const handleSelectDeletedTask = (
    task: DeletedTask | null,
    _fromFullList?: boolean,
  ) => {
    setSelectedDeletedTask(task);
    setSelectedTaskId(task?.id ?? null);

    // URLを更新
    const params = new URLSearchParams(searchParams.toString());
    // 旧形式のパラメータを削除
    params.delete("tab");
    params.delete("slug");
    params.delete("board");
    params.delete("boards");
    params.delete("memos"); // 旧形式
    params.delete("tasks"); // 旧形式
    params.delete("memo");

    if (task) {
      // 削除済みタスク個別表示: ?task=123
      params.set("task", task.displayId);
      const newUrl = `?${params.toString()}`;
      router.replace(`/team/${customUrl}${newUrl}`, { scroll: false });
    } else {
      // タスク一覧表示: ?task（値なし）
      params.delete("task");
      const baseParams = params.toString();
      const newUrl = baseParams ? `?${baseParams}&task` : "?task";
      router.replace(`/team/${customUrl}${newUrl}`, { scroll: false });
    }
  };

  // エラーまたはチームが見つからない場合のリダイレクト処理
  useEffect(() => {
    if (!isLoading && (error || !team)) {
      router.push("/");
    }
  }, [isLoading, error, team, router]);

  if (isLoading) {
    return (
      <div className="flex h-full bg-white overflow-hidden">
        <div className="w-full pt-2 md:pt-3 pl-2 md:pl-5 md:pr-2 flex flex-col">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !team) {
    return (
      <div className="flex h-full bg-white overflow-hidden">
        <div className="w-full pt-2 md:pt-3 pl-2 md:pl-5 md:pr-2 flex flex-col">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex h-full bg-white overflow-hidden ${activeTab === "overview" ? "pt-2 md:pt-3 px-2 md:px-5 pb-5" : activeTab === "team-list" ? "pt-2 md:pt-3 px-2 md:px-5 pb-5" : ""}`}
    >
      <div className="w-full flex flex-col h-full">
        {/* ヘッダー（デスクトップは常に表示、スマホはoverviewのみ表示） */}
        {(activeTab === "overview" || activeTab === "team-list") && (
          <div
            className={`mb-4 flex-shrink-0 ${activeTab === "overview" ? "" : "hidden md:block"}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {showInvitePanel && (
                  <BackButton
                    onClick={() => {
                      setShowInvitePanel(false);
                      if (previousTab) {
                        handleTabChange(
                          previousTab as
                            | "overview"
                            | "memos"
                            | "tasks"
                            | "boards"
                            | "team-list"
                            | "team-settings"
                            | "search",
                        );
                      }
                    }}
                  />
                )}
                <h1 className="text-[22px] font-bold text-gray-800">
                  {showInvitePanel ? "チーム招待" : team.name}
                </h1>
                {showInvitePanel && (
                  <span className="text-gray-600 font-medium">{team.name}</span>
                )}
              </div>
              {/* チーム設定ボタン（管理者のみ、招待パネル非表示時のみ） */}
              {!showInvitePanel && team.role === "admin" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleTabChange("team-settings")}
                  className="flex items-center gap-2"
                >
                  <SettingsIcon className="w-4 h-4" />
                  チーム設定
                </Button>
              )}
            </div>
          </div>
        )}

        {/* コンテンツエリア */}
        <div
          className={`${activeTab === "overview" ? "flex-1 flex flex-col overflow-hidden" : "h-full overflow-hidden"}`}
        >
          {/* タブコンテンツ */}
          {activeTab === "overview" && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* スマホ用ヘッダー（固定） */}
              <div className="md:hidden fixed top-0 left-0 right-0 h-12 border-b border-gray-200 bg-white flex items-center px-3 z-10 overflow-hidden">
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center shadow-sm bg-Green flex-shrink-0">
                    <span className="text-white font-bold text-sm">ぺ</span>
                  </div>
                  <h1 className="text-sm font-bold text-gray-800 tracking-wide flex-shrink-0">
                    ぺたぼー
                  </h1>
                  <span className="text-[9px] text-gray-500 whitespace-nowrap">
                    - 日々のメモやタスクをひとまとめに -
                  </span>
                </div>
              </div>
              {/* チーム名とチーム設定ボタン（スマホのみ） */}
              <div className="md:hidden mb-4 pl-2">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-gray-800">
                    {team.name}
                  </h2>
                  {team.role === "admin" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleTabChange("team-settings")}
                      className="flex items-center gap-1"
                    >
                      <SettingsIcon className="w-4 h-4" />
                      設定
                    </Button>
                  )}
                </div>
              </div>
              {showInvitePanel ? (
                /* 招待パネル */
                <div className="flex-1 overflow-hidden md:overflow-y-auto">
                  <Card className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <svg
                          className="w-5 h-5 text-blue-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                          />
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          メンバー招待
                        </h3>
                        <p className="text-sm text-gray-500">
                          招待コードでチームに参加してもらう
                        </p>
                      </div>
                    </div>

                    {!existingInviteUrl && !isLoadingInviteUrl ? (
                      <div>
                        <p className="text-gray-600 text-sm mb-4">
                          招待URLを生成してメンバーと共有してください。URLは3日間有効です。
                        </p>
                        <Button
                          onClick={() => {
                            generateInviteCode(
                              { customUrl },
                              {
                                onSuccess: () => {
                                  setInviteMessage({
                                    type: "success",
                                    text: "生成完了",
                                  });
                                  setTimeout(
                                    () => setInviteMessage(null),
                                    1500,
                                  );
                                },
                                onError: () => {
                                  setInviteMessage({
                                    type: "error",
                                    text: "生成失敗",
                                  });
                                  setTimeout(
                                    () => setInviteMessage(null),
                                    2000,
                                  );
                                },
                              },
                            );
                          }}
                          disabled={isGenerating}
                          className="w-full"
                        >
                          {isGenerating ? "生成中..." : "招待URLを生成"}
                        </Button>
                      </div>
                    ) : (
                      <div>
                        {isLoadingInviteUrl ? (
                          <div className="text-center py-4">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                            <p className="text-sm text-gray-500 mt-2">
                              読み込み中...
                            </p>
                          </div>
                        ) : existingInviteUrl ? (
                          <div className="bg-gray-50 border rounded-lg p-4 mb-4">
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-gray-500 mb-1">
                                  招待URL
                                </p>
                                <div className="bg-white border rounded px-3 py-2">
                                  <code className="text-sm font-mono text-gray-800 break-all">
                                    {displayInviteUrl ||
                                      "招待URLを読み込み中..."}
                                  </code>
                                </div>
                              </div>
                              <Button
                                size="sm"
                                onClick={() => {
                                  if (displayInviteUrl) {
                                    navigator.clipboard.writeText(
                                      displayInviteUrl,
                                    );
                                    setInviteMessage({
                                      type: "success",
                                      text: "コピーしました",
                                    });
                                    setTimeout(
                                      () => setInviteMessage(null),
                                      1500,
                                    );
                                  }
                                }}
                                className="ml-2"
                              >
                                <CopyIcon className="w-4 h-4 mr-1" />
                                コピー
                              </Button>
                            </div>
                          </div>
                        ) : null}

                        {existingInviteUrl && (
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500">
                              {new Date(
                                existingInviteUrl.expiresAt,
                              ).toLocaleDateString("ja-JP")}
                              まで有効
                            </span>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  generateInviteCode(
                                    { customUrl },
                                    {
                                      onSuccess: () => {
                                        setInviteMessage({
                                          type: "success",
                                          text: "新しいURLを生成しました",
                                        });
                                        setTimeout(
                                          () => setInviteMessage(null),
                                          2000,
                                        );
                                      },
                                      onError: () => {
                                        setInviteMessage({
                                          type: "error",
                                          text: "更新に失敗しました",
                                        });
                                        setTimeout(
                                          () => setInviteMessage(null),
                                          2000,
                                        );
                                      },
                                    },
                                  );
                                }}
                                disabled={isGenerating || isDeleting}
                              >
                                <RefreshCcwIcon className="w-4 h-4 mr-1" />
                                更新
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  deleteInviteUrl(customUrl, {
                                    onSuccess: () => {
                                      setInviteMessage({
                                        type: "success",
                                        text: "招待URLを削除しました",
                                      });
                                      setTimeout(
                                        () => setInviteMessage(null),
                                        2000,
                                      );
                                    },
                                    onError: () => {
                                      setInviteMessage({
                                        type: "error",
                                        text: "削除に失敗しました",
                                      });
                                      setTimeout(
                                        () => setInviteMessage(null),
                                        2000,
                                      );
                                    },
                                  });
                                }}
                                disabled={isGenerating || isDeleting}
                                className="text-red-600 border-red-300 hover:bg-red-50"
                              >
                                <TrashIcon className="w-4 h-4 mr-1" />
                                {isDeleting ? "削除中..." : "削除"}
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </Card>

                  {/* メッセージ表示 */}
                  {inviteMessage && (
                    <div
                      className={`p-3 rounded-lg text-sm text-center ${
                        inviteMessage.type === "success"
                          ? "bg-green-50 text-green-700"
                          : "bg-red-50 text-red-700"
                      }`}
                    >
                      {inviteMessage.text}
                    </div>
                  )}
                </div>
              ) : (
                /* ダッシュボード表示 */
                <>
                  {/* モバイル用タブ切り替え */}
                  <div className="md:hidden mb-3 flex gap-2 border-b border-gray-200">
                    <button
                      onClick={() => setMobileOverviewTab("notifications")}
                      className="flex-1 py-2.5 text-sm font-medium text-gray-800 transition-colors relative flex items-center justify-center gap-2"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="w-4 h-4"
                      >
                        <path d="M10.268 21a2 2 0 0 0 3.464 0"></path>
                        <path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"></path>
                      </svg>
                      通知
                      {mobileOverviewTab === "notifications" && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
                      )}
                    </button>
                    <button
                      onClick={() => setMobileOverviewTab("activity")}
                      className="flex-1 py-2.5 text-sm font-medium text-gray-800 transition-colors relative flex items-center justify-center gap-2"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="w-4 h-4"
                      >
                        <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
                      </svg>
                      アクティビティ
                      {mobileOverviewTab === "activity" && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
                      )}
                    </button>
                  </div>

                  {/* モバイル：選択されたタブのみ表示 */}
                  <div className="flex-1 md:hidden overflow-hidden">
                    {mobileOverviewTab === "notifications" ? (
                      <NotificationList
                        teamName={customUrl}
                        maxHeight="h-full"
                      />
                    ) : (
                      <Card className="h-full flex flex-col overflow-hidden">
                        <div className="flex-1 overflow-hidden md:overflow-y-auto px-3 py-3">
                          <ActivityFeed customUrl={customUrl} limit={20} />
                        </div>
                      </Card>
                    )}
                  </div>

                  {/* デスクトップ：両方表示 */}
                  <div className="hidden md:flex flex-1 gap-4 overflow-hidden">
                    {/* 統合通知一覧（コメント + 参加申請） - 左側50% */}
                    <div className="flex-1">
                      <NotificationList
                        teamName={customUrl}
                        maxHeight="h-full"
                      />
                    </div>

                    {/* アクティビティフィード - 右側50% */}
                    <Card className="flex-1 flex flex-col overflow-hidden">
                      <h3 className="text-lg font-semibold text-gray-900 mb-3 flex-shrink-0 px-4 pt-4">
                        アクティビティ
                      </h3>
                      <div className="flex-1 overflow-hidden md:overflow-y-auto px-4 pb-4">
                        <ActivityFeed customUrl={customUrl} limit={10} />
                      </div>
                    </Card>
                  </div>
                </>
              )}
            </div>
          )}

          {/* メモタブ */}
          {activeTab === "memos" && (
            <div className="h-full">
              <MemoScreen
                selectedMemo={selectedMemo}
                onSelectMemo={handleSelectMemo}
                selectedDeletedMemo={selectedDeletedMemo}
                onSelectDeletedMemo={handleSelectDeletedMemo}
                onClose={() => {
                  // メモを閉じる時はメモ一覧に戻る
                  const params = new URLSearchParams(searchParams.toString());
                  params.delete("memo");
                  params.delete("slug");
                  params.delete("tab");
                  params.delete("board");
                  params.delete("boards");
                  params.delete("memos"); // 旧形式
                  params.delete("tasks"); // 旧形式
                  params.delete("task");
                  // メモ一覧表示: ?memo（値なし）
                  const baseParams = params.toString();
                  const newUrl = baseParams ? `?${baseParams}&memo` : "?memo";
                  router.replace(`/team/${customUrl}${newUrl}`, {
                    scroll: false,
                  });
                  setSelectedMemo(null);
                  setSelectedDeletedMemo(null);
                }}
                onDeselectAndStayOnMemoList={() => {
                  // メモを閉じてリスト表示に戻る
                  const params = new URLSearchParams(searchParams.toString());
                  params.delete("memo");
                  params.delete("slug");
                  params.delete("tab");
                  params.delete("board");
                  params.delete("boards");
                  params.delete("memos"); // 旧形式
                  params.delete("tasks"); // 旧形式
                  params.delete("task");
                  // メモ一覧表示: ?memo（値なし）
                  const baseParams = params.toString();
                  const newUrl = baseParams ? `?${baseParams}&memo` : "?memo";
                  router.replace(`/team/${customUrl}${newUrl}`, {
                    scroll: false,
                  });
                  setSelectedMemo(null);
                  setSelectedDeletedMemo(null);
                  setIsCreatingMemo(false);
                }}
                initialMemoId={getMemoIdFromURL()}
                teamMembers={team.members || []}
                // 統一フックを渡す
                unifiedOperations={teamMemoOperations}
              />
            </div>
          )}

          {/* タスクタブ */}
          {activeTab === "tasks" && (
            <div className="h-full overflow-x-auto">
              <TaskScreen
                selectedTask={selectedTask}
                onSelectTask={handleSelectTask}
                selectedDeletedTask={selectedDeletedTask}
                onSelectDeletedTask={handleSelectDeletedTask}
                taskEditorHasUnsavedChangesRef={taskEditorHasUnsavedChangesRef}
                taskEditorShowConfirmModalRef={taskEditorShowConfirmModalRef}
                onClose={() => {
                  // タスクを閉じる時はタスク一覧に戻る
                  const params = new URLSearchParams(searchParams.toString());
                  params.delete("task");
                  params.delete("slug");
                  params.delete("tab");
                  params.delete("board");
                  params.delete("boards");
                  params.delete("memos"); // 旧形式
                  params.delete("tasks"); // 旧形式
                  params.delete("memo");
                  // タスク一覧表示: ?task（値なし）
                  const baseParams = params.toString();
                  const newUrl = baseParams ? `?${baseParams}&task` : "?task";
                  router.replace(`/team/${customUrl}${newUrl}`, {
                    scroll: false,
                  });
                  setSelectedTask(null);
                  setSelectedTaskId(null);
                  setSelectedDeletedTask(null);
                }}
                onClearSelection={() => {
                  // タスク選択を解除してリスト表示に戻る
                  const params = new URLSearchParams(searchParams.toString());
                  params.delete("task");
                  params.delete("slug");
                  params.set("tab", "tasks");
                  const newUrl = params.toString()
                    ? `?${params.toString()}`
                    : "";
                  router.replace(`/team/${customUrl}${newUrl}`, {
                    scroll: false,
                  });
                  setSelectedTask(null);
                  setSelectedTaskId(null);
                  setSelectedDeletedTask(null);
                }}
                onScreenModeChange={(mode) => {
                  setIsTaskCreateMode(mode === "create");
                }}
                initialTaskId={isTaskCreateMode ? null : getTaskIdFromURL()}
                teamMembers={team.members || []}
                // 統一フックを渡す
                unifiedOperations={teamTaskOperations}
              />
            </div>
          )}

          {/* ボードタブ */}
          {activeTab === "boards" && (
            <div className="h-full">
              <BoardScreen
                onBoardSelect={(board) => {
                  // ボード詳細タブに切り替え
                  handleTabChange("board", { slug: board.slug });
                }}
              />
            </div>
          )}

          {/* ボード詳細タブ */}
          {activeTab === "board" && getBoardSlugFromURL() && (
            <div className="h-full">
              <TeamBoardDetailWrapper
                slug={getBoardSlugFromURL()!}
                teamId={team?.id}
                customUrl={customUrl}
                onBack={() => handleTabChange("boards")}
              />
            </div>
          )}

          {/* チーム一覧タブ */}
          {activeTab === "team-list" && (
            <>
              {/* 通常のチーム概要表示 */}
              <>
                {/* チーム基本情報 */}
                {team.description && (
                  <div className="mb-6">
                    <p className="text-gray-600 text-sm">{team.description}</p>
                  </div>
                )}

                {/* 承認待ちリスト（管理者のみ、申請がある場合のみ表示） */}
                {team.role === "admin" &&
                  joinRequests?.requests &&
                  joinRequests.requests.length > 0 && (
                    <Card className="p-4 mb-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-medium text-gray-900 flex items-center gap-2">
                          <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></span>
                          承認待ちの申請 ({joinRequests.requests.length}件)
                        </h3>
                      </div>

                      <div className="space-y-3">
                        {joinRequests.requests.map((request) => (
                          <div
                            key={request.id}
                            className="bg-orange-50 border border-orange-200 rounded-lg p-3"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-1">
                                  <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                                    {request.displayName
                                      ? request.displayName
                                          .charAt(0)
                                          .toUpperCase()
                                      : request.email.charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <h4 className="font-medium text-gray-900">
                                      {request.displayName || "名前未設定"}
                                    </h4>
                                    <p className="text-xs text-gray-500">
                                      {request.email}
                                    </p>
                                  </div>
                                </div>

                                <div className="text-xs text-gray-400 ml-11">
                                  申請: {formatDateOnly(request.createdAt)}
                                </div>
                              </div>

                              <div className="flex gap-2 ml-4">
                                <Button
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700 text-white"
                                  onClick={() => handleApprove(request.id)}
                                  disabled={isApproving || isRejecting}
                                >
                                  {isApproving ? "承認中..." : "承認"}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-red-600 border-red-300 hover:bg-red-50"
                                  onClick={() => handleReject(request.id)}
                                  disabled={isApproving || isRejecting}
                                >
                                  {isRejecting ? "拒否中..." : "拒否"}
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}

                {/* メンバー一覧 */}
                <Card className="p-4 mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-gray-900">
                      メンバー ({team.memberCount}人)
                    </h3>
                    {/* ボタン群（管理者のみ） */}
                    {team.role === "admin" && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setPreviousTab(activeTab);
                            setShowInvitePanel(true);
                            handleTabChange("overview");
                          }}
                        >
                          招待
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setIsEditMode(!isEditMode)}
                          className={
                            isEditMode
                              ? "bg-red-50 text-red-700 border-red-200"
                              : ""
                          }
                        >
                          {isEditMode ? "完了" : "編集"}
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* メンバー表示 */}
                  <div
                    className="space-y-3 overflow-hidden md:overflow-y-auto"
                    style={{ maxHeight: "calc(100vh - 250px)" }}
                  >
                    {(team.members || [])
                      .sort((a, b) => {
                        // 自分を一番上に表示
                        if (a.userId === userInfo?.userId) return -1;
                        if (b.userId === userInfo?.userId) return 1;
                        return 0;
                      })
                      .map((member) => (
                        <UserMemberCard
                          key={member.userId}
                          userId={member.userId}
                          displayName={member.displayName}
                          joinedAt={member.joinedAt}
                          isCurrentUser={member.userId === userInfo?.userId}
                          avatarColor={member.avatarColor}
                          onEditClick={
                            member.userId === userInfo?.userId
                              ? () => {
                                  setCurrentMemberDisplayName(
                                    member.displayName,
                                  );
                                  setShowTeamDisplayNameModal(true);
                                }
                              : undefined
                          }
                        >
                          {/* メンバー管理ボタン（編集モード時のみ、管理者・自分以外に表示） */}
                          {isEditMode &&
                            team.role === "admin" &&
                            member.userId !== userInfo?.userId &&
                            member.role !== "admin" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 border-red-300 hover:bg-red-50 text-xs px-2 py-1 h-6"
                                onClick={() =>
                                  setKickConfirmModal({
                                    userId: member.userId,
                                    displayName:
                                      member.displayName ||
                                      `ユーザー${member.userId.slice(-4)}`,
                                  })
                                }
                              >
                                削除
                              </Button>
                            )}
                        </UserMemberCard>
                      ))}
                  </div>
                </Card>

                {/* メッセージ表示エリア */}
                {inviteMessage && (
                  <div
                    className={`mb-4 p-3 rounded text-sm ${
                      inviteMessage.type === "success"
                        ? "bg-green-50 text-green-700"
                        : "bg-red-50 text-red-700"
                    }`}
                  >
                    {inviteMessage.text}
                  </div>
                )}
              </>
            </>
          )}

          {/* チーム設定タブ */}
          {activeTab === "team-settings" && (
            <div className="h-full">
              <TeamSettings customUrl={customUrl} />
            </div>
          )}

          {/* 検索タブ */}
          {activeTab === "search" && (
            <div className="h-full">
              <SearchScreen
                onSelectMemo={handleSelectMemo}
                onSelectTask={handleSelectTask}
                onSelectDeletedMemo={handleSelectDeletedMemo}
                onSelectDeletedTask={handleSelectDeletedTask}
              />
            </div>
          )}
        </div>

        {/* 表示名設定モーダル */}
        <DisplayNameModal
          isOpen={showDisplayNameModal}
          onClose={() => setShowDisplayNameModal(false)}
          currentDisplayName={userInfo?.displayName}
        />

        {/* キック確認モーダル */}
        <Modal
          isOpen={!!kickConfirmModal}
          onClose={() => setKickConfirmModal(null)}
          maxWidth="md"
        >
          <div>
            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-200">
              <WarningIcon className="w-6 h-6 text-red-600" />
              <h3 className="text-lg font-semibold text-gray-900">
                メンバーを削除
              </h3>
            </div>
            <div className="mb-4 p-4 bg-red-50 border-2 border-red-300 rounded-lg">
              <p className="text-red-800 font-medium">
                <span className="font-bold text-red-900">
                  {kickConfirmModal?.displayName}
                </span>
                をチームから削除しますか？
              </p>
              <p className="text-red-600 text-sm mt-2">
                この操作は取り消せません。削除されたメンバーは再度招待する必要があります。
              </p>
            </div>
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setKickConfirmModal(null)}
                disabled={kickMutation.isPending}
              >
                キャンセル
              </Button>
              <Button
                variant="destructive"
                onClick={handleKickMember}
                disabled={kickMutation.isPending}
              >
                {kickMutation.isPending ? "削除中..." : "削除"}
              </Button>
            </div>
          </div>
        </Modal>

        {/* チーム表示名変更モーダル */}
        <TeamDisplayNameModal
          isOpen={showTeamDisplayNameModal}
          onClose={() => setShowTeamDisplayNameModal(false)}
          currentDisplayName={currentMemberDisplayName}
          onSave={async (newName: string) => {
            return new Promise<void>((resolve, reject) => {
              updateDisplayName(
                { customUrl, displayName: newName },
                {
                  onSuccess: () => resolve(),
                  onError: (error) => reject(error),
                },
              );
            });
          }}
        />
      </div>
    </div>
  );
}
