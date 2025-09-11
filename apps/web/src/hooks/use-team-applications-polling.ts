import { useConditionalPolling } from "./use-conditional-polling";
import { useTeamDetail } from "./use-team-detail";
import { useQueryClient } from "@tanstack/react-query";

interface TeamApplication {
  id: number;
  userId: string;
  displayName: string | null;
  appliedAt: string;
}

interface TeamUpdates {
  newApplications: TeamApplication[];
}

interface PollingOptions {
  customUrl: string | null;
  adminRole?: boolean; // 管理者権限を外部から指定
}

export function useTeamApplicationsPolling(
  customUrl: string | null,
  adminRole?: boolean,
) {
  const { data: teamDetail } = useTeamDetail(customUrl || "");
  const queryClient = useQueryClient();

  const handleUpdates = (updates: TeamUpdates) => {
    if (!customUrl) return; // customUrlが無い場合は何もしない

    console.log("📦 handleUpdates called with:", updates);

    // React Query キャッシュ更新（正しいキャッシュキー使用）
    console.log("🔄 Invalidating React Query cache for:", [
      "join-requests",
      customUrl,
    ]);
    queryClient.invalidateQueries({
      queryKey: ["join-requests", customUrl],
    });

    // チーム詳細も更新（申請数の表示などのため）
    console.log("🔄 Invalidating React Query cache for:", ["team", customUrl]);
    queryClient.invalidateQueries({
      queryKey: ["team", customUrl],
    });

    // チーム統計を更新（TeamWelcomeで使用）
    console.log("🔄 Invalidating React Query cache for: team-stats");
    queryClient.invalidateQueries({
      queryKey: ["team-stats"],
    });

    // 自分の申請状況を更新（TeamWelcomeで使用）
    console.log("🔄 Invalidating React Query cache for: my-join-requests");
    queryClient.invalidateQueries({
      queryKey: ["my-join-requests"],
    });

    // 所属チーム一覧を更新（TeamWelcomeで使用）
    console.log("🔄 Invalidating React Query cache for: teams");
    queryClient.invalidateQueries({
      queryKey: ["teams"],
    });

    // コンソールログ（開発用）
    console.log(
      `🔔 新しいチーム申請: ${updates.newApplications.length}件`,
      updates,
    );

    // ブラウザ通知を表示
    if ("Notification" in window && Notification.permission === "granted") {
      console.log("🔔 Showing browser notification");
      new Notification("新しいチーム申請", {
        body: `${updates.newApplications.length}件の新規申請があります`,
        icon: "/favicon.ico",
      });
    } else if (
      "Notification" in window &&
      Notification.permission !== "denied"
    ) {
      // 通知許可を求める
      console.log("🔔 Requesting notification permission");
      Notification.requestPermission().then((permission) => {
        if (permission === "granted") {
          console.log("🔔 Permission granted, showing notification");
          new Notification("新しいチーム申請", {
            body: `${updates.newApplications.length}件の新規申請があります`,
            icon: "/favicon.ico",
          });
        }
      });
    }

    // TODO: 将来的にはトーストメッセージも追加
    // showToast({
    //   title: "新しい申請",
    //   message: `${updates.newApplications.length}件の新規申請があります`,
    //   type: "info",
    // });
  };

  const handleError = (error: Error) => {
    // ネットワークエラーは軽微なログにして開発中のノイズを軽減
    if (error.message === "Failed to fetch") {
      console.debug("チーム申請ポーリング接続エラー（リトライ中）");
    } else {
      console.error("チーム申請ポーリングエラー:", error);
    }
  };

  // 管理者権限を確認（外部から指定されるか、teamDetailから取得）
  const isTeamAdmin =
    adminRole !== undefined ? adminRole : teamDetail?.role === "admin";

  const pollingResult = useConditionalPolling<TeamUpdates>({
    endpoint: customUrl ? `/teams/${customUrl}/wait-updates` : "",
    iconStateKey: "team", // チームアイコンがアクティブな時のみ
    additionalConditions: {
      isAdmin: isTeamAdmin,
      teamExists: Boolean(customUrl), // customUrlが存在すればOK（ホーム画面対応）
      // チーム詳細ページ内であれば、どのタブやパネルでも通知を受け取る
      onTeamPage: true, // 常にtrueに設定してチーム詳細ページ内では常に通知
    },
    onUpdate: handleUpdates,
    onError: handleError,
    waitTimeoutSec: 120, // 2分待機
    enabled: Boolean(customUrl && isTeamAdmin), // customUrlと管理者権限が存在する時のみ
  });

  return {
    isPolling: pollingResult.isPolling,
    conditions: pollingResult.conditions,
  };
}
