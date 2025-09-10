import { getAuth } from "@hono/clerk-auth";
import { eq, and, desc, ne, gt } from "drizzle-orm";
import { teams, teamMembers, teamInvitations } from "../../db";
import {
  teamEventEmitter,
  TEAM_EVENTS,
  type TeamApplicationEvent,
} from "../../utils/event-emitter.js";

type DatabaseType = any;

// イベント駆動型wait-updatesハンドラー
export async function waitUpdatesHandlerEventDriven(c: any) {
  console.log(
    "🚀 EVENT-DRIVEN HANDLER CALLED - イベント駆動型ハンドラーが呼ばれました！",
  );
  const auth = getAuth(c);
  if (!auth?.userId) {
    return c.json({ error: "認証が必要です" }, 401);
  }

  const { customUrl } = c.req.param();
  const body = await c.req.json();
  const { lastCheckedAt, waitTimeoutSec } = body;
  const db = c.get("db") as DatabaseType;

  try {
    // チーム存在確認
    const team = await db
      .select()
      .from(teams)
      .where(eq(teams.customUrl, customUrl))
      .get();

    if (!team) {
      return c.json({ error: "チームが見つかりません" }, 404);
    }

    // ユーザーがチームの管理者かチェック
    const member = await db
      .select()
      .from(teamMembers)
      .where(
        and(
          eq(teamMembers.teamId, team.id),
          eq(teamMembers.userId, auth.userId),
        ),
      )
      .get();

    if (!member) {
      return c.json({ error: "チームメンバーではありません" }, 403);
    }

    if (member.role !== "admin") {
      return c.json({ error: "管理者権限が必要です" }, 403);
    }

    const lastCheckedDate = new Date(lastCheckedAt);
    const startTime = Date.now();
    const timeoutMs = waitTimeoutSec * 1000;

    // 初回チェック: lastCheckedAt以降の新しい申請があるかチェック
    const checkForUpdates = async (): Promise<{
      hasUpdates: boolean;
      updates?: any;
    }> => {
      const newApplications = await db
        .select({
          id: teamInvitations.id,
          userId: teamInvitations.userId,
          displayName: teamInvitations.displayName,
          appliedAt: teamInvitations.createdAt,
        })
        .from(teamInvitations)
        .where(
          and(
            eq(teamInvitations.teamId, team.id),
            eq(teamInvitations.status, "pending"),
            ne(teamInvitations.email, "URL_INVITE"), // URL招待レコードは除外
            gt(
              teamInvitations.createdAt,
              Math.floor(lastCheckedDate.getTime() / 1000),
            ),
          ),
        )
        .orderBy(desc(teamInvitations.createdAt));

      if (newApplications.length > 0) {
        return {
          hasUpdates: true,
          updates: {
            newApplications: newApplications.map((app: any) => ({
              id: app.id,
              userId: app.userId || "unknown",
              displayName: app.displayName || "未設定",
              appliedAt: new Date(app.appliedAt * 1000).toISOString(),
            })),
          },
        };
      }

      return { hasUpdates: false };
    };

    // 初回チェック
    const initialResult = await checkForUpdates();
    if (initialResult.hasUpdates) {
      console.log("🔍 Initial check found updates, returning immediately");
      return c.json({
        ...initialResult,
        timestamp: new Date().toISOString(),
      });
    }

    // イベント駆動型待機
    console.log(`🎧 Setting up event listener for team: ${customUrl}`);

    return new Promise((resolve, reject) => {
      let hasResolved = false;
      let timeout: NodeJS.Timeout;

      // クリーンアップ関数
      const cleanup = () => {
        clearTimeout(timeout);
        teamEventEmitter.off(
          TEAM_EVENTS.NEW_APPLICATION,
          handleApplicationEvent,
        );
      };

      // イベントリスナー
      const handleApplicationEvent = (eventData: TeamApplicationEvent) => {
        console.log("🔥 Received application event:", eventData);

        // 対象チームの申請イベントかチェック
        if (eventData.teamCustomUrl === customUrl && !hasResolved) {
          hasResolved = true;
          cleanup();

          console.log("✅ Sending real-time update for team:", customUrl);
          try {
            resolve(
              c.json({
                hasUpdates: true,
                updates: {
                  newApplications: [eventData.application],
                },
                timestamp: new Date().toISOString(),
              }),
            );
          } catch (error) {
            console.error("Error resolving event-driven promise:", error);
            reject(error);
          }
        }
      };

      // イベントリスナーを登録
      teamEventEmitter.on(TEAM_EVENTS.NEW_APPLICATION, handleApplicationEvent);

      // タイムアウト設定
      timeout = setTimeout(() => {
        if (!hasResolved) {
          hasResolved = true;
          cleanup();

          console.log(`⏰ Timeout reached for team: ${customUrl}`);
          try {
            resolve(
              c.json({
                hasUpdates: false,
                timestamp: new Date().toISOString(),
              }),
            );
          } catch (error) {
            console.error("Error resolving timeout promise:", error);
            reject(error);
          }
        }
      }, timeoutMs);

      console.log(
        `⏳ Waiting for events or timeout (${waitTimeoutSec}s) for team: ${customUrl}`,
      );
    });
  } catch (error) {
    console.error("wait-updates エラー:", error);
    return c.json({ error: "内部エラーが発生しました" }, 500);
  }
}
