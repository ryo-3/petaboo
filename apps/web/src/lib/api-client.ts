// 直接fetchを使用したAPIクライアント
import type { CreateMemoData, UpdateMemoData } from "@/src/types/memo";
import type { CreateTaskData, UpdateTaskData } from "@/src/types/task";
import type {
  CreateTagData,
  UpdateTagData,
  CreateTaggingData,
} from "@/src/types/tag";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:7594";

// 共通ヘッダー生成関数
const createHeaders = (
  token?: string,
  includeContentType = true,
): Record<string, string> => {
  const headers: Record<string, string> = {};

  if (includeContentType) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
};

export const memosApi = {
  // GET /memos
  getMemos: async (token?: string) => {
    const response = await fetch(`${API_BASE_URL}/memos`, {
      headers: createHeaders(token),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response;
  },

  // GET /teams/:teamId/memos
  getTeamMemos: async (teamId: number, token?: string) => {
    const response = await fetch(`${API_BASE_URL}/teams/${teamId}/memos`, {
      headers: createHeaders(token),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response;
  },

  // GET /teams/:teamId/memos/deleted
  getDeletedTeamMemos: async (teamId: number, token?: string) => {
    const response = await fetch(
      `${API_BASE_URL}/teams/${teamId}/memos/deleted`,
      {
        headers: createHeaders(token),
      },
    );
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response;
  },

  // POST /teams/:teamId/memos
  createTeamMemo: async (
    teamId: number,
    data: CreateMemoData,
    token?: string,
  ) => {
    const response = await fetch(`${API_BASE_URL}/teams/${teamId}/memos`, {
      method: "POST",
      headers: createHeaders(token),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response;
  },

  // PUT /teams/:teamId/memos/:id
  updateTeamMemo: async (
    teamId: number,
    id: number,
    data: UpdateMemoData,
    token?: string,
  ) => {
    const response = await fetch(
      `${API_BASE_URL}/teams/${teamId}/memos/${id}`,
      {
        method: "PUT",
        headers: createHeaders(token),
        body: JSON.stringify(data),
      },
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response;
  },

  // DELETE /teams/:teamId/memos/:id
  deleteTeamMemo: async (teamId: number, id: number, token?: string) => {
    const response = await fetch(
      `${API_BASE_URL}/teams/${teamId}/memos/${id}`,
      {
        method: "DELETE",
        headers: createHeaders(token),
      },
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response;
  },

  // POST /memos
  createNote: async (data: CreateMemoData, token?: string) => {
    const response = await fetch(`${API_BASE_URL}/memos`, {
      method: "POST",
      headers: createHeaders(token),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response;
  },

  // PUT /memos/:id
  updateNote: async (id: number, data: UpdateMemoData, token?: string) => {
    const response = await fetch(`${API_BASE_URL}/memos/${id}`, {
      method: "PUT",
      headers: createHeaders(token),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response;
  },

  // DELETE /memos/:id
  deleteNote: async (id: number, token?: string) => {
    const response = await fetch(`${API_BASE_URL}/memos/${id}`, {
      method: "DELETE",
      headers: createHeaders(token),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response;
  },

  // GET /memos/deleted
  getDeletedMemos: async (token?: string) => {
    const response = await fetch(`${API_BASE_URL}/memos/deleted`, {
      headers: createHeaders(token),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response;
  },

  // DELETE /memos/deleted/:originalId (完全削除)
  permanentDeleteNote: async (originalId: string, token?: string) => {
    const response = await fetch(
      `${API_BASE_URL}/memos/deleted/${originalId}`,
      {
        method: "DELETE",
        headers: createHeaders(token),
      },
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response;
  },

  // POST /memos/deleted/:originalId/restore (復元)
  restoreNote: async (originalId: string, token?: string) => {
    const response = await fetch(
      `${API_BASE_URL}/memos/deleted/${originalId}/restore`,
      {
        method: "POST",
        headers: createHeaders(token),
      },
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response;
  },

  // POST /memos/import (CSVインポート)
  importMemos: async (file: File, token?: string) => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`${API_BASE_URL}/memos/import`, {
      method: "POST",
      headers: createHeaders(token, false), // Content-Typeを含めない
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response;
  },
};

export const tasksApi = {
  // GET /tasks
  getTasks: async (token?: string) => {
    const response = await fetch(`${API_BASE_URL}/tasks`, {
      headers: createHeaders(token),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response;
  },

  // GET /teams/:teamId/tasks
  getTeamTasks: async (teamId: number, token?: string) => {
    const response = await fetch(`${API_BASE_URL}/teams/${teamId}/tasks`, {
      headers: createHeaders(token),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response;
  },

  // GET /teams/:teamId/tasks/deleted
  getDeletedTeamTasks: async (teamId: number, token?: string) => {
    const response = await fetch(
      `${API_BASE_URL}/teams/${teamId}/tasks/deleted`,
      {
        headers: createHeaders(token),
      },
    );
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response;
  },

  // POST /tasks
  createTask: async (data: CreateTaskData, token?: string) => {
    const response = await fetch(`${API_BASE_URL}/tasks`, {
      method: "POST",
      headers: createHeaders(token),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response;
  },

  // POST /teams/:teamId/tasks
  createTeamTask: async (
    teamId: number,
    data: CreateTaskData,
    token?: string,
  ) => {
    const response = await fetch(`${API_BASE_URL}/teams/${teamId}/tasks`, {
      method: "POST",
      headers: createHeaders(token),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response;
  },

  // PUT /teams/:teamId/tasks/:id
  updateTeamTask: async (
    teamId: number,
    id: number,
    data: UpdateTaskData,
    token?: string,
  ) => {
    const response = await fetch(
      `${API_BASE_URL}/teams/${teamId}/tasks/${id}`,
      {
        method: "PUT",
        headers: createHeaders(token),
        body: JSON.stringify(data),
      },
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response;
  },

  // DELETE /teams/:teamId/tasks/:id
  deleteTeamTask: async (teamId: number, id: number, token?: string) => {
    const response = await fetch(
      `${API_BASE_URL}/teams/${teamId}/tasks/${id}`,
      {
        method: "DELETE",
        headers: createHeaders(token),
      },
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response;
  },

  // PUT /tasks/:id
  updateTask: async (id: number, data: UpdateTaskData, token?: string) => {
    const response = await fetch(`${API_BASE_URL}/tasks/${id}`, {
      method: "PUT",
      headers: createHeaders(token),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response;
  },

  // DELETE /tasks/:id
  deleteTask: async (id: number, token?: string) => {
    const response = await fetch(`${API_BASE_URL}/tasks/${id}`, {
      method: "DELETE",
      headers: createHeaders(token),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response;
  },

  // GET /tasks/deleted
  getDeletedTasks: async (token?: string) => {
    const response = await fetch(`${API_BASE_URL}/tasks/deleted`, {
      headers: createHeaders(token),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response;
  },

  // DELETE /tasks/deleted/:originalId (完全削除)
  permanentDeleteTask: async (originalId: string, token?: string) => {
    const response = await fetch(
      `${API_BASE_URL}/tasks/deleted/${originalId}`,
      {
        method: "DELETE",
        headers: createHeaders(token),
      },
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response;
  },

  // POST /tasks/deleted/:originalId/restore (復元)
  restoreTask: async (originalId: string, token?: string) => {
    const response = await fetch(
      `${API_BASE_URL}/tasks/deleted/${originalId}/restore`,
      {
        method: "POST",
        headers: createHeaders(token),
      },
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response;
  },

  // POST /tasks/import (CSVインポート)
  importTasks: async (file: File, token?: string) => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`${API_BASE_URL}/tasks/import`, {
      method: "POST",
      headers: createHeaders(token, false), // Content-Typeを含めない
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response;
  },
};

export const tagsApi = {
  // GET /tags
  getTags: async (
    token?: string,
    search?: string,
    sort?: "name" | "usage" | "recent",
    limit?: number,
  ) => {
    const params = new URLSearchParams();
    if (search) params.append("search", search);
    if (sort) params.append("sort", sort);
    if (limit) params.append("limit", limit.toString());

    const url = `${API_BASE_URL}/tags${params.toString() ? `?${params.toString()}` : ""}`;
    const response = await fetch(url, {
      headers: createHeaders(token),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response;
  },

  // POST /tags
  createTag: async (data: CreateTagData, token?: string) => {
    const response = await fetch(`${API_BASE_URL}/tags`, {
      method: "POST",
      headers: createHeaders(token),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response;
  },

  // PUT /tags/:id
  updateTag: async (id: number, data: UpdateTagData, token?: string) => {
    const response = await fetch(`${API_BASE_URL}/tags/${id}`, {
      method: "PUT",
      headers: createHeaders(token),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response;
  },

  // DELETE /tags/:id
  deleteTag: async (id: number, token?: string) => {
    const response = await fetch(`${API_BASE_URL}/tags/${id}`, {
      method: "DELETE",
      headers: createHeaders(token),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response;
  },

  // GET /tags/:id/stats
  getTagStats: async (id: number, token?: string) => {
    const response = await fetch(`${API_BASE_URL}/tags/${id}/stats`, {
      headers: createHeaders(token),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response;
  },
};

export const taggingsApi = {
  // GET /taggings
  getTaggings: async (
    token?: string,
    targetType?: string,
    targetOriginalId?: string,
    tagId?: number,
  ) => {
    const params = new URLSearchParams();
    if (targetType) params.append("targetType", targetType);
    if (targetOriginalId) params.append("targetOriginalId", targetOriginalId);
    if (tagId) params.append("tagId", tagId.toString());
    params.append("includeTag", "true"); // タグ情報を含める

    const url = `${API_BASE_URL}/taggings${params.toString() ? `?${params.toString()}` : ""}`;
    const response = await fetch(url, {
      headers: createHeaders(token),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response;
  },

  // POST /taggings
  createTagging: async (data: CreateTaggingData, token?: string) => {
    // ネットワークログを抑制するため、try-catchで囲む
    const response = await fetch(`${API_BASE_URL}/taggings`, {
      method: "POST",
      headers: createHeaders(token),
      body: JSON.stringify(data),
    }).catch(() => {
      // ネットワークエラーの場合、ダミーレスポンスを返す
      return new Response('{"error":"Network error"}', {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    });

    if (!response.ok) {
      const errorText = await response.text();

      // 400エラー（重複）の場合はデバッグログのみ
      if (
        response.status === 400 &&
        errorText.includes("Tag already attached")
      ) {
        throw new Error(`HTTP error 400: ${errorText}`);
      }

      // その他のエラーは通常通りログ出力
      console.error("createTagging error:", response.status, errorText);

      if (response.status === 400) {
        throw new Error(`HTTP error 400: ${errorText}`);
      }

      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response;
  },

  // DELETE /taggings/:id
  deleteTagging: async (id: number, token?: string) => {
    const response = await fetch(`${API_BASE_URL}/taggings/${id}`, {
      method: "DELETE",
      headers: createHeaders(token),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response;
  },

  // DELETE /taggings/by-tag
  deleteTaggingsByTag: async (
    tagId: number,
    targetType?: string,
    targetOriginalId?: string,
    token?: string,
  ) => {
    const requestBody = {
      tagId,
      targetType,
      targetOriginalId,
    };

    console.log("🌐 API削除リクエスト:", {
      url: `${API_BASE_URL}/taggings/by-tag`,
      method: "DELETE",
      body: requestBody,
      headers: createHeaders(token),
    });

    const response = await fetch(`${API_BASE_URL}/taggings/by-tag`, {
      method: "DELETE",
      headers: createHeaders(token),
      body: JSON.stringify(requestBody),
    });

    console.log("🌐 API削除レスポンス:", {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log("🌐 API削除エラー詳細:", errorText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response;
  },
};

export const usersApi = {
  // 表示名更新
  updateDisplayName: async (displayName: string, token?: string) => {
    const response = await fetch(`${API_BASE_URL}/users/displayname`, {
      method: "PATCH",
      headers: createHeaders(token),
      body: JSON.stringify({ displayName }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response;
  },
};
