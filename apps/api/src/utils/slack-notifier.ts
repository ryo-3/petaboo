/**
 * Slack通知ユーティリティ
 * チーム参加申請などの重要なイベントをSlackに通知
 */

interface SlackNotificationOptions {
  teamName: string;
  teamUrl: string;
  applicantName: string;
  applicantEmail: string;
  message?: string;
  webhookUrl?: string;
}

/**
 * チーム参加申請をSlackに通知
 */
export async function notifyTeamJoinRequest(
  options: SlackNotificationOptions,
): Promise<void> {
  const {
    teamName,
    teamUrl,
    applicantName,
    applicantEmail,
    message,
    webhookUrl,
  } = options;

  // Webhook URLが設定されていない場合はスキップ
  const slackWebhookUrl = webhookUrl || process.env.SLACK_WEBHOOK_URL;
  if (!slackWebhookUrl) {
    console.log(
      "Slack Webhook URLが設定されていないため、通知をスキップします",
    );
    return;
  }

  const timestamp = new Date().toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  // アプリケーションのベースURL（環境変数から取得、デフォルトはlocalhost）
  const appBaseUrl = process.env.APP_BASE_URL || "http://localhost:7593";
  const fullUrl = `${appBaseUrl}/team/${teamUrl}?tab=team-list`;

  const slackMessage = {
    text: `新しいチーム参加申請があります`,
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "🔔 チーム参加申請",
          emoji: true,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: [
            `*チーム:* ${teamName}`,
            `*申請者:* ${applicantName}`,
            `*メール:* ${applicantEmail}`,
            message ? `*メッセージ:* ${message}` : null,
            `*申請日時:* ${timestamp}`,
          ]
            .filter(Boolean)
            .join("\n"),
        },
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "申請を確認",
            },
            url: fullUrl,
            style: "primary",
          },
        ],
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `送信元: ぺたぼー | ${timestamp}`,
          },
        ],
      },
    ],
  };

  try {
    const response = await fetch(slackWebhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(slackMessage),
    });

    if (!response.ok) {
      console.error(
        `Slack通知の送信に失敗しました: ${response.status} ${response.statusText}`,
      );
    } else {
      console.log(
        `✅ Slack通知を送信しました: ${teamName}への申請 (${applicantName})`,
      );
    }
  } catch (error) {
    console.error("Slack通知の送信中にエラーが発生しました:", error);
    // エラーが発生してもアプリケーションの処理は継続
  }
}

/**
 * チーム参加承認をSlackに通知
 */
export async function notifyTeamJoinApproval(
  teamName: string,
  memberName: string,
  webhookUrl?: string,
): Promise<void> {
  const slackWebhookUrl = webhookUrl || process.env.SLACK_WEBHOOK_URL;
  if (!slackWebhookUrl) return;

  const timestamp = new Date().toLocaleString("ja-JP", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  const slackMessage = {
    text: `チーム参加が承認されました`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `✅ *${memberName}* さんが *${teamName}* チームに参加しました`,
        },
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `${timestamp}`,
          },
        ],
      },
    ],
  };

  try {
    await fetch(slackWebhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(slackMessage),
    });
  } catch (error) {
    console.error("Slack通知の送信中にエラーが発生しました:", error);
  }
}

/**
 * 汎用Slack通知送信
 */
export interface SlackNotificationResult {
  success: boolean;
  error?: string;
}

export async function sendSlackNotification(
  webhookUrl: string,
  message: string,
): Promise<SlackNotificationResult> {
  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: message }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `Slack notification failed: ${response.status} ${errorText}`,
      );
      return {
        success: false,
        error: `HTTP ${response.status}: ${errorText}`,
      };
    }

    return { success: true };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Slack notification error:", errorMessage);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * メンション通知メッセージをフォーマット
 */
export function formatMentionNotification(
  mentionedDisplayNames: string[],
  commenterDisplayName: string,
  targetType: "memo" | "task" | "board",
  targetTitle: string,
  commentContent: string,
  linkUrl: string,
): string {
  const targetTypeLabel =
    targetType === "memo"
      ? "メモ"
      : targetType === "task"
        ? "タスク"
        : "ボード";

  const mentionText =
    mentionedDisplayNames.length === 1
      ? `@${mentionedDisplayNames[0]} さんがメンションされました`
      : `@${mentionedDisplayNames.join(", @")} さんがメンションされました`;

  // コメント内容を100文字でカット
  const truncatedContent =
    commentContent.length > 100
      ? `${commentContent.substring(0, 100)}...`
      : commentContent;

  return `🔔 ${mentionText}

📝 ${targetTypeLabel}: ${targetTitle}
💬 ${commenterDisplayName}: ${truncatedContent}

🔗 ${linkUrl}`;
}

/**
 * テスト通知メッセージ
 */
export function formatTestNotification(teamName: string): string {
  return `✅ Slack通知のテスト送信に成功しました！

チーム: ${teamName}

ぺたぼーからの通知がこのチャンネルに届きます。`;
}
