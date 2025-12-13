const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:7594";

// 500系エラー・ネットワークエラー時のリトライ付きfetch
const fetchWithRetry = async (
  url: string,
  options: RequestInit = {},
  maxRetries = 2,
  baseDelay = 1000,
): Promise<Response> => {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);

      if (response.ok || (response.status >= 400 && response.status < 500)) {
        return response;
      }

      if (response.status >= 500 && attempt < maxRetries) {
        const delay = Math.min(baseDelay * Math.pow(2, attempt), 10000);
        console.warn(
          `⚠️ API ${response.status}エラー、${delay}ms後にリトライ (${attempt + 1}/${maxRetries})`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      return response;
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries) {
        const delay = Math.min(baseDelay * Math.pow(2, attempt), 10000);
        console.warn(
          `⚠️ ネットワークエラー、${delay}ms後にリトライ (${attempt + 1}/${maxRetries})`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }

  throw lastError || new Error("Max retries exceeded");
};

export interface TeamComment {
  id: number;
  teamId: number;
  userId: string;
  displayName: string | null;
  avatarColor: string | null;
  targetType: "memo" | "task" | "board";
  targetOriginalId: string;
  targetDisplayId: string;
  content: string;
  mentions: string | null; // JSON文字列: ["user_xxx", "user_yyy"]
  createdAt: number;
  updatedAt: number | null;
}

export interface CreateCommentInput {
  targetType: "memo" | "task" | "board";
  targetDisplayId: string;
  boardId?: number; // メモ/タスクが所属するボードID
  content: string;
  mentionedUserIds?: string[]; // フロントから送信されたメンションuserIds
  notificationUrl?: string; // 通知用: 現在のURL（クエリ部分）
}

// コメント一覧取得
export async function getTeamComments(
  teamId: number,
  targetType: "memo" | "task" | "board",
  targetDisplayId: string,
  token?: string,
): Promise<TeamComment[]> {
  const response = await fetch(
    `${API_BASE_URL}/comments?teamId=${teamId}&targetType=${targetType}&targetDisplayId=${targetDisplayId}`,
    {
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch comments: ${response.statusText}`);
  }

  return response.json();
}

// すべてのボードのコメント一覧取得
export async function getAllTeamBoardComments(
  teamId: number,
  token?: string,
): Promise<TeamComment[]> {
  const response = await fetch(
    `${API_BASE_URL}/comments?teamId=${teamId}&targetType=board`,
    {
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    },
  );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch all board comments: ${response.statusText}`,
    );
  }

  return response.json();
}

// ボード内アイテムのコメント一覧取得
export async function getBoardItemComments(
  teamId: number,
  boardId: number,
  token?: string,
): Promise<TeamComment[]> {
  const response = await fetch(
    `${API_BASE_URL}/comments/board-items?teamId=${teamId}&boardId=${boardId}`,
    {
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    },
  );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch board item comments: ${response.statusText}`,
    );
  }

  return response.json();
}

// コメント投稿
export async function createTeamComment(
  teamId: number,
  input: CreateCommentInput,
  token?: string,
): Promise<TeamComment> {
  const response = await fetchWithRetry(
    `${API_BASE_URL}/comments?teamId=${teamId}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify(input),
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to create comment: ${response.statusText}`);
  }

  return response.json();
}

// コメント編集
export async function updateTeamComment(
  commentId: number,
  input: { content: string },
  token?: string,
): Promise<TeamComment> {
  const response = await fetchWithRetry(
    `${API_BASE_URL}/comments/${commentId}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify(input),
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to update comment: ${response.statusText}`);
  }

  return response.json();
}

// コメント削除
export async function deleteTeamComment(
  commentId: number,
  token?: string,
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/comments/${commentId}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to delete comment: ${response.statusText}`);
  }
}
