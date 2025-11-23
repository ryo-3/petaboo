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
      const errorText = await response.text();
      console.error("❌ [createTeamMemo] エラー詳細:", {
        status: response.status,
        statusText: response.statusText,
        teamId,
        sentData: data,
        errorResponse: errorText,
      });
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
      const errorText = await response.text();
      console.error("❌ [updateTeamMemo] エラー詳細:", {
        status: response.status,
        statusText: response.statusText,
        teamId,
        memoId: id,
        sentData: data,
        errorResponse: errorText,
      });
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

  // DELETE /memos/deleted/:displayId (完全削除)
  permanentDeleteNote: async (displayId: string, token?: string) => {
    const response = await fetch(`${API_BASE_URL}/memos/deleted/${displayId}`, {
      method: "DELETE",
      headers: createHeaders(token),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response;
  },

  // POST /memos/deleted/:displayId/restore (復元)
  restoreNote: async (displayId: string, token?: string) => {
    const response = await fetch(
      `${API_BASE_URL}/memos/deleted/${displayId}/restore`,
      {
        method: "POST",
        headers: createHeaders(token),
      },
    );

    if (!response.ok) {
      // 404は既に復元済みなので正常として扱う
      if (response.status === 404) {
        return response;
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response;
  },

  // POST /teams/:teamId/memos/deleted/:displayId/restore (チームメモ復元)
  restoreTeamMemo: async (
    teamId: number,
    displayId: string,
    token?: string,
  ) => {
    const response = await fetch(
      `${API_BASE_URL}/teams/${teamId}/memos/deleted/${displayId}/restore`,
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

  // DELETE /teams/:teamId/memos/deleted/:displayId (チーム削除済みメモの完全削除)
  permanentDeleteTeamMemo: async (
    teamId: number,
    displayId: string,
    token?: string,
  ) => {
    const response = await fetch(
      `${API_BASE_URL}/teams/${teamId}/memos/deleted/${displayId}`,
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

  // DELETE /tasks/deleted/:displayId (完全削除)
  permanentDeleteTask: async (displayId: string, token?: string) => {
    const response = await fetch(`${API_BASE_URL}/tasks/deleted/${displayId}`, {
      method: "DELETE",
      headers: createHeaders(token),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response;
  },

  // POST /tasks/deleted/:displayId/restore (復元)
  restoreTask: async (displayId: string, token?: string) => {
    const response = await fetch(
      `${API_BASE_URL}/tasks/deleted/${displayId}/restore`,
      {
        method: "POST",
        headers: createHeaders(token),
      },
    );

    if (!response.ok) {
      // 404は既に復元済みなので正常として扱う
      if (response.status === 404) {
        return response;
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response;
  },

  // POST /teams/:teamId/tasks/deleted/:displayId/restore (チームタスク復元)
  restoreTeamTask: async (
    teamId: number,
    displayId: string,
    token?: string,
  ) => {
    const response = await fetch(
      `${API_BASE_URL}/teams/${teamId}/tasks/deleted/${displayId}/restore`,
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

  // DELETE /teams/:teamId/tasks/deleted/:displayId (チーム削除済みタスクの完全削除)
  permanentDeleteTeamTask: async (
    teamId: number,
    displayId: string,
    token?: string,
  ) => {
    const response = await fetch(
      `${API_BASE_URL}/teams/${teamId}/tasks/deleted/${displayId}`,
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
    targetDisplayId?: string,
    tagId?: number,
    teamId?: number,
  ) => {
    const params = new URLSearchParams();
    if (targetType) params.append("targetType", targetType);
    if (targetDisplayId) params.append("targetDisplayId", targetDisplayId);
    if (tagId) params.append("tagId", tagId.toString());
    if (teamId) params.append("teamId", teamId.toString());
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
    targetDisplayId?: string,
    token?: string,
    teamId?: number,
  ) => {
    const requestBody = {
      tagId,
      targetType,
      targetDisplayId,
    };

    const url = new URL(`${API_BASE_URL}/taggings/by-tag`);
    if (teamId) {
      url.searchParams.set("teamId", teamId.toString());
    }

    const response = await fetch(url.toString(), {
      method: "DELETE",
      headers: createHeaders(token),
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
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
