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
import { useTeamDetail, TeamMember } from "@/src/hooks/use-team-detail";
import { useAuth } from "@clerk/nextjs";

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
  /** 現在のユーザーのメンバー情報（チームモード時のみ） */
  currentMember: TeamMember | null;
}

const TeamContext = createContext<TeamContextValue>({
  isTeamMode: false,
  teamId: null,
  teamSlug: null,
  isLoading: false,
  currentMember: null,
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
  const { userId } = useAuth();

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

  // 現在のユーザーのメンバー情報を取得
  const currentMember = useMemo(() => {
    if (!teamDetail?.members || !userId) return null;
    return teamDetail.members.find((m) => m.userId === userId) || null;
  }, [teamDetail?.members, userId]);

  const value = useMemo(
    () => ({
      isTeamMode,
      teamId,
      teamSlug: teamSlugState,
      isLoading,
      currentMember,
    }),
    [isTeamMode, teamId, teamSlugState, isLoading, currentMember],
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

/**
 * useTeamContextSafe
 *
 * TeamProvider外でも安全に使えるバージョン
 * Provider外の場合はnullを返す
 *
 * @example
 * ```typescript
 * function Header() {
 *   const teamContext = useTeamContextSafe();
 *   const teamId = teamContext?.teamId;
 * }
 * ```
 */
export function useTeamContextSafe(): TeamContextValue | null {
  const context = useContext(TeamContext);

  // Provider外の場合、contextは初期値（デフォルト値）のまま
  // isLoadingがfalseで、他の値がすべてnull/falseの場合はProvider外と判断
  if (
    !context.isTeamMode &&
    context.teamId === null &&
    context.teamSlug === null &&
    !context.isLoading
  ) {
    return null;
  }

  return context;
}
