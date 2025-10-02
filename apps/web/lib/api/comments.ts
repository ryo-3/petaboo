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
