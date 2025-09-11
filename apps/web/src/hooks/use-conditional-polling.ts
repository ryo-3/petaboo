import { useEffect, useRef, useMemo, useCallback, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useNavigation } from "@/contexts/navigation-context";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

type IconStateKey =
  | "home"
  | "memo"
  | "task"
  | "board"
  | "boardDetail"
  | "search"
  | "settings"
  | "team";

export interface ConditionalPollingOptions<T> {
  endpoint: string;
  iconStateKey: IconStateKey;
  additionalConditions?: Record<string, boolean>;
  onUpdate: (data: T) => void;
  onError?: (error: Error) => void;
  waitTimeoutSec?: number;
  enabled?: boolean;
}

export function useConditionalPolling<T>({
  endpoint,
  iconStateKey,
  additionalConditions = {},
  onUpdate,
  onError,
  waitTimeoutSec = 120,
  enabled = true,
}: ConditionalPollingOptions<T>) {
  const { getToken } = useAuth();
  const { iconStates } = useNavigation();
  const abortControllerRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isPageVisible, setIsPageVisible] = useState(true); // SSR対応のためデフォルトtrue

  // ページの可視性を監視
  useEffect(() => {
    if (typeof window === "undefined") return; // SSR時はスキップ

    const handleVisibilityChange = () => {
      setIsPageVisible(!document.hidden);
    };

    // 初期値を設定
    setIsPageVisible(!document.hidden);

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // 条件判定
  const shouldPoll = useMemo(() => {
    if (!enabled) return false;

    // グローバル通知の場合は常に実行
    if (additionalConditions.alwaysEnabled) {
      console.log("🌐 Always enabled polling - shouldPoll: true", {
        endpoint,
        iconStateKey,
        additionalConditions,
      });
      return true;
    }

    const baseCondition = iconStates[iconStateKey]; // アイコンがアクティブか
    const visibilityCondition = isPageVisible; // ページがアクティブか
    const otherConditions = Object.values(additionalConditions).every(
      (condition) => condition === true,
    );

    // チーム申請監視の場合は、特別にチーム詳細ページ内では常に監視する
    const isTeamPolling =
      iconStateKey === "team" && additionalConditions.onTeamPage;
    const effectiveBaseCondition = isTeamPolling ? true : baseCondition;

    // チーム通知の場合は他タブでも通知を有効にする
    const effectiveVisibilityCondition =
      iconStateKey === "team" ? true : visibilityCondition;

    return (
      effectiveBaseCondition && effectiveVisibilityCondition && otherConditions
    );
  }, [iconStates, iconStateKey, additionalConditions, enabled, isPageVisible]);

  // ポーリング実行関数
  const executePoll = useCallback(async () => {
    if (!shouldPoll) return;

    try {
      // 既存のリクエストをキャンセル
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // 新しいAbortController作成
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      const token = await getToken();
      const requestUrl = `${API_URL}${endpoint}`;
      const requestBody = {
        lastCheckedAt: new Date().toISOString(),
        waitTimeoutSec,
      };

      // console.log("🚀 Polling request details:", {
      //   url: requestUrl,
      //   method: "POST",
      //   hasToken: Boolean(token),
      //   body: requestBody,
      //   apiUrl: API_URL,
      //   endpoint: endpoint,
      // });

      const response = await fetch(requestUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(requestBody),
        signal: abortController.signal,
      });

      // リクエストがキャンセルされた場合
      if (abortController.signal.aborted) {
        return;
      }

      // console.log("📥 Polling response:", {
      //   status: response.status,
      //   statusText: response.statusText,
      //   ok: response.ok,
      //   url: response.url,
      //   headers: Object.fromEntries(response.headers.entries()),
      // });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Polling request failed:", {
          status: response.status,
          statusText: response.statusText,
          body: errorText,
          url: response.url,
        });
        throw new Error(
          `HTTP ${response.status}: ${response.statusText} - ${errorText}`,
        );
      }

      // console.log("🔍 About to parse JSON response...");
      const data = await response.json();
      // console.log("✅ JSON parsed successfully:", data);

      // 更新がある場合のみログ出力
      if (data.hasUpdates) {
        console.log("🔄 Calling onUpdate with:", data.updates);
        onUpdate(data.updates);
      } else if (
        data &&
        typeof data === "object" &&
        !data.hasUpdates &&
        Object.keys(data).length > 0
      ) {
        console.log(
          "🔄 Direct update data detected, calling onUpdate with:",
          data,
        );
        onUpdate(data);
      }
      // 更新なしの場合はログ出力しない（ノイズ削減）

      // 条件が満たされている場合は再度ポーリング
      if (shouldPoll) {
        timeoutRef.current = setTimeout(() => {
          executePoll();
        }, 5000); // 5秒後に再実行（負荷軽減）
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        // キャンセルされた場合は何もしない
        return;
      }

      // ネットワークエラーは詳細ログを避ける（開発中の頻繁な接続エラーを軽減）
      if (error instanceof Error && error.message === "Failed to fetch") {
        // ネットワーク接続エラーは軽微なログにする
        console.debug("ポーリング接続エラー（リトライ中）");
      } else {
        console.error(
          "Conditional polling error:",
          error instanceof Error ? error.message : String(error),
        );
      }
      if (onError) {
        onError(error as Error);
      }

      // エラー時は10秒後にリトライ（条件が満たされている場合）
      if (shouldPoll) {
        timeoutRef.current = setTimeout(() => {
          executePoll();
        }, 10000);
      }
    }
  }, [shouldPoll, endpoint, getToken, waitTimeoutSec, onUpdate, onError]);

  // ポーリング開始・停止制御
  useEffect(() => {
    if (shouldPoll) {
      // ポーリング開始
      executePoll();
    } else {
      // ポーリング停止
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }

    // クリーンアップ
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [shouldPoll, executePoll]);

  // 重複するvisibilitychangeリスナーは削除（上で実装済み）

  return {
    isPolling: shouldPoll,
    conditions: {
      iconActive: iconStates[iconStateKey],
      pageVisible: isPageVisible,
      additionalConditions,
    },
  };
}
