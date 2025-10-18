const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:7594";

export interface TeamComment {
  id: number;
  teamId: number;
  userId: string;
  displayName: string | null;
  avatarColor: string | null;
  targetType: "memo" | "task" | "board";
  targetOriginalId: string;
  content: string;
  mentions: string | null; // JSON文字列: ["user_xxx", "user_yyy"]
  createdAt: number;
  updatedAt: number | null;
}

export interface CreateCommentInput {
  targetType: "memo" | "task" | "board";
  targetOriginalId: string;
  boardId?: number; // メモ/タスクが所属するボードID
  content: string;
}

// コメント一覧取得
export async function getTeamComments(
  teamId: number,
  targetType: "memo" | "task" | "board",
  targetOriginalId: string,
  token?: string,
): Promise<TeamComment[]> {
  const response = await fetch(
    `${API_BASE_URL}/comments?teamId=${teamId}&targetType=${targetType}&targetOriginalId=${targetOriginalId}`,
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
  const response = await fetch(`${API_BASE_URL}/comments?teamId=${teamId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify(input),
  });

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
  const response = await fetch(`${API_BASE_URL}/comments/${commentId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify(input),
  });

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
