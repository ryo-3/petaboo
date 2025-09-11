import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useNavigation } from "@/contexts/navigation-context";
import {
  getNotificationConditions,
  getApiEndpointAndParams,
} from "@/src/utils/notification-conditions";

interface SmartNotifierOptions {
  onUpdate?: (data: any) => void;
  onError?: (error: Error) => void;
  enabled?: boolean;
}

interface NotificationData {
  hasUpdates: boolean;
  counts: Record<string, number>;
  lastCheckedAt: string;
}

/**
 * URLとiconStatesを監視して、自動的に最適な通知チェックを実行
 */
export function useSmartNotifier({
  onUpdate,
  onError,
  enabled = true,
}: SmartNotifierOptions = {}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { iconStates } = useNavigation();

  const [isPolling, setIsPolling] = useState(false);
  const [lastData, setLastData] = useState<NotificationData | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentConditionsRef = useRef<string>("");

  // 現在の状態から通知条件を決定
  const conditions = getNotificationConditions(
    pathname,
    iconStates,
    searchParams,
  );

  // 条件が変更された時の識別用キー
  const conditionsKey = JSON.stringify({
    pathname,
    iconStates,
    tab: searchParams.get("tab"),
  });

  // APIエンドポイントとパラメータを取得
  const { endpoint, params } = getApiEndpointAndParams(conditions);

  // チェック実行関数
  const checkNotifications = async () => {
    if (!enabled) return;

    try {
      const url = new URL(
        `${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:7594"}${endpoint}`,
      );

      // パラメータを追加
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });

      // 前回のチェック時刻を追加（差分チェック用）
      if (lastData?.lastCheckedAt) {
        url.searchParams.set("since", lastData.lastCheckedAt);
      }

      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${await getToken()}`, // Clerk token取得
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: NotificationData = await response.json();
      setLastData(data);

      // 更新があった場合のみコールバック実行
      if (data.hasUpdates && onUpdate) {
        console.log(`🔔 通知検知 [${pathname}]:`, data.counts);
        onUpdate(data);
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error("Unknown error");
      console.error("通知チェックエラー:", err);
      if (onError) {
        onError(err);
      }
    }
  };

  // ページ可視性の監視
  const [isPageVisible, setIsPageVisible] = useState(true);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsPageVisible(!document.hidden);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // メインのポーリング制御
  useEffect(() => {
    if (!enabled || !isPageVisible) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        setIsPolling(false);
      }
      return;
    }

    // 条件が変更された場合、即座にチェック実行
    const conditionsChanged = conditionsKey !== currentConditionsRef.current;
    if (conditionsChanged) {
      currentConditionsRef.current = conditionsKey;
      console.log(`🔄 通知条件変更 [${pathname}]:`, conditions);

      // 前回のデータをクリア（新しい画面なので）
      setLastData(null);

      // 即座にチェック
      checkNotifications();
    }

    // 既存のインターバルをクリア
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // 新しいインターバルを設定
    intervalRef.current = setInterval(() => {
      checkNotifications();
    }, conditions.interval);

    setIsPolling(true);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setIsPolling(false);
    };
  }, [enabled, isPageVisible, conditionsKey, conditions.interval]);

  return {
    isPolling,
    conditions,
    lastData,
    checkNow: checkNotifications,
  };
}

// Clerk token取得のヘルパー（実装は環境に合わせて調整）
async function getToken(): Promise<string> {
  // TODO: useAuth() または useClerk() からtoken取得
  // 一時的にダミーtoken
  return "dummy";
}
