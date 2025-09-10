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

export function useTeamApplicationsPolling(customUrl: string) {
  const { data: teamDetail } = useTeamDetail(customUrl);
  const queryClient = useQueryClient();

  const handleUpdates = (updates: TeamUpdates) => {
    // React Query キャッシュ更新
    queryClient.invalidateQueries({
      queryKey: ["team-applications", customUrl],
    });

    // コンソールログ（開発用）
    console.log(
      `🔔 新しいチーム申請: ${updates.newApplications.length}件`,
      updates,
    );

    // TODO: 将来的には通知システムと連携
    // showNotification({
    //   title: "新しい申請",
    //   message: `${updates.newApplications.length}件の新規申請があります`,
    //   type: "info",
    // });
  };

  const handleError = (error: Error) => {
    console.error("チーム申請ポーリングエラー:", error);
  };

  const pollingResult = useConditionalPolling<TeamUpdates>({
    endpoint: `/teams/${customUrl}/wait-updates`,
    iconStateKey: "team", // チームアイコンがアクティブな時のみ
    additionalConditions: {
      isAdmin: teamDetail?.role === "admin",
      teamExists: Boolean(teamDetail),
    },
    onUpdate: handleUpdates,
    onError: handleError,
    waitTimeoutSec: 120, // 2分待機
    enabled: Boolean(customUrl && teamDetail), // customUrlとteamDetailが存在する時のみ
  });

  return {
    isPolling: pollingResult.isPolling,
    conditions: pollingResult.conditions,
  };
}
