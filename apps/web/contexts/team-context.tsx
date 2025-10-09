"use client";

import {
  createContext,
  useContext,
  ReactNode,
  useMemo,
  useEffect,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import { useTeamDetail } from "@/src/hooks/use-team-detail";

/**
 * チーム/個人モード判定を一元管理するContext
 *
 * 使用例:
 * ```typescript
 * const { isTeamMode, teamId, teamSlug } = useTeamContext();
 *
 * if (isTeamMode && teamId) {
 *   // チームモードの処理
 * } else {
 *   // 個人モードの処理
 * }
 * ```
 */
interface TeamContextValue {
  /** チームモードかどうか（URLベース判定） */
  isTeamMode: boolean;
  /** チームID（APIから取得、取得中はnull） */
  teamId: number | null;
  /** チームSlug（customUrl） */
  teamSlug: string | null;
  /** チーム情報取得中フラグ */
  isLoading: boolean;
}

const TeamContext = createContext<TeamContextValue>({
  isTeamMode: false,
  teamId: null,
  teamSlug: null,
  isLoading: false,
});

interface TeamProviderProps {
  children: ReactNode;
}

/**
 * TeamProvider
 *
 * URLから自動的にチーム判定を行い、Context経由で提供する
 * team/[customUrl]/layout.tsx に配置することを想定
 */
export function TeamProvider({ children }: TeamProviderProps) {
  const pathname = usePathname();
  const [teamSlugState, setTeamSlugState] = useState<string | null>(null);

  // URLからチームSlugを抽出（単一の信頼できるソース）
  const teamSlug = useMemo(() => {
    if (!pathname) return null;

    // /team/[customUrl] または /team/[customUrl]/... の形式
    const match = pathname.match(/^\/team\/([^/]+)/);
    return match?.[1] || null;
  }, [pathname]);

  // teamSlugの変更を検知してステートに反映
  useEffect(() => {
    setTeamSlugState(teamSlug);
  }, [teamSlug]);

  const isTeamMode = !!teamSlug;

  // teamSlugからチーム詳細を取得（APIキャッシュ活用）
  const { data: teamDetail, isLoading } = useTeamDetail(teamSlug || "");

  const teamId = teamDetail?.id || null;

  const value = useMemo(
    () => ({
      isTeamMode,
      teamId,
      teamSlug: teamSlugState,
      isLoading,
    }),
    [isTeamMode, teamId, teamSlugState, isLoading],
  );

  return <TeamContext.Provider value={value}>{children}</TeamContext.Provider>;
}

/**
 * useTeamContext
 *
 * チーム/個人モード判定を取得するカスタムフック
 *
 * @returns {TeamContextValue} チームコンテキスト値
 * @throws {Error} TeamProvider外で使用された場合
 *
 * @example
 * ```typescript
 * function MyComponent() {
 *   const { isTeamMode, teamId } = useTeamContext();
 *
 *   const { data } = useMemos({
 *     teamMode: isTeamMode,
 *     teamId
 *   });
 * }
 * ```
 */
export function useTeamContext(): TeamContextValue {
  const context = useContext(TeamContext);

  if (context === undefined) {
    throw new Error("useTeamContext must be used within a TeamProvider");
  }

  return context;
}
