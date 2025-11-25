import { createRoute, z } from "@hono/zod-openapi";
import { eq, and, isNull, sql } from "drizzle-orm";
import { getAuth } from "@hono/clerk-auth";
import { teamAttachments } from "../../db/schema/team/attachments";
import { attachments } from "../../db/schema/attachments";
import { teamMembers } from "../../db/schema/team/teams";
import {
  validateImageFile,
  generateR2Key,
  MAX_ATTACHMENTS_PER_ITEM,
  ALLOWED_MIME_TYPES,
} from "../../utils/image-processor";
import {
  validateFile,
  generateFileR2Key,
  MAX_FILE_SIZE,
  MAX_FILES_PER_ITEM,
  ALLOWED_FILE_TYPES,
  isImageFile,
} from "../../utils/file-processor";
import type { OpenAPIHono } from "@hono/zod-openapi";

// 共通スキーマ定義
const TeamAttachmentSchema = z.object({
  id: z.number(),
  teamId: z.number(),
  userId: z.string(),
  attachedTo: z.enum(["memo", "task", "comment"]),
  attachedDisplayId: z.string(),
  displayId: z.string(),
  fileName: z.string(),
  fileSize: z.number(),
  mimeType: z.string(),
  r2Key: z.string(),
  url: z.string(),
  createdAt: z.number(),
  deletedAt: z.number().nullable(),
});

// チームメンバー確認ヘルパー
async function checkTeamMember(teamId: number, userId: string, db: any) {
  const member = await db
    .select()
    .from(teamMembers)
    .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)))
    .limit(1);

  return member.length > 0 ? member[0] : null;
}

// GET /attachments（添付ファイル一覧取得 - 個人・チーム両対応）
export const getAttachmentsRoute = createRoute({
  method: "get",
  path: "/",
  request: {
    query: z.object({
      teamId: z.string().regex(/^\d+$/).transform(Number).optional(),
      attachedTo: z.enum(["memo", "task", "comment"]),
      attachedDisplayId: z.string(),
    }),
  },
  responses: {
    200: {
      description: "List of attachments",
      content: {
        "application/json": {
          schema: z.array(TeamAttachmentSchema),
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: {
        "application/json": {
          schema: z.object({ error: z.string() }),
        },
      },
    },
    403: {
      description: "Not a team member",
      content: {
        "application/json": {
          schema: z.object({ error: z.string() }),
        },
      },
    },
  },
});

export const getAttachments = async (c: any) => {
  const auth = getAuth(c);
  const db = c.get("db");

  if (!auth?.userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const { teamId, attachedTo, attachedDisplayId } = c.req.valid("query");

  let results;
  if (teamId) {
    // チームモード：メンバー確認
    const member = await checkTeamMember(teamId, auth.userId, db);
    if (!member) {
      return c.json({ error: "Not a team member" }, 403);
    }

    results = await db
      .select()
      .from(teamAttachments)
      .where(
        and(
          eq(teamAttachments.teamId, teamId),
          eq(teamAttachments.attachedTo, attachedTo),
          eq(teamAttachments.attachedDisplayId, attachedDisplayId),
          isNull(teamAttachments.deletedAt),
        ),
      )
      .orderBy(teamAttachments.createdAt);
  } else {
    // 個人モード（displayIdを使用）
    results = await db
      .select()
      .from(attachments)
      .where(
        and(
          eq(attachments.userId, auth.userId),
          eq(attachments.attachedTo, attachedTo as "memo" | "task"),
          eq(attachments.displayId, attachedDisplayId),
          isNull(attachments.deletedAt),
        ),
      )
      .orderBy(attachments.createdAt);
  }

  return c.json(results, 200);
};

// GET /attachments/all（全添付ファイル一括取得 - 個人・チーム両対応）
export const getAllAttachmentsRoute = createRoute({
  method: "get",
  path: "/all",
  request: {
    query: z.object({
      teamId: z.string().regex(/^\d+$/).transform(Number).optional(),
      attachedTo: z.enum(["memo", "task", "comment"]),
    }),
  },
  responses: {
    200: {
      description: "List of all attachments",
      content: {
        "application/json": {
          schema: z.array(TeamAttachmentSchema),
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: {
        "application/json": {
          schema: z.object({ error: z.string() }),
        },
      },
    },
    403: {
      description: "Not a team member",
      content: {
        "application/json": {
          schema: z.object({ error: z.string() }),
        },
      },
    },
  },
});

export const getAllAttachments = async (c: any) => {
  const auth = getAuth(c);
  const db = c.get("db");

  if (!auth?.userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const { teamId, attachedTo } = c.req.valid("query");

  let results;
  if (teamId) {
    // チームモード：メンバー確認
    const member = await checkTeamMember(teamId, auth.userId, db);
    if (!member) {
      return c.json({ error: "Not a team member" }, 403);
    }

    results = await db
      .select()
      .from(teamAttachments)
      .where(
        and(
          eq(teamAttachments.teamId, teamId),
          eq(teamAttachments.attachedTo, attachedTo),
          isNull(teamAttachments.deletedAt),
        ),
      )
      .orderBy(teamAttachments.createdAt);
  } else {
    // 個人モード
    results = await db
      .select()
      .from(attachments)
      .where(
        and(
          eq(attachments.userId, auth.userId),
          eq(attachments.attachedTo, attachedTo as "memo" | "task"),
          isNull(attachments.deletedAt),
        ),
      )
      .orderBy(attachments.createdAt);
  }

  return c.json(results, 200);
};

// POST /attachments/upload（画像アップロード - 個人・チーム両対応）
export const uploadAttachmentRoute = createRoute({
  method: "post",
  path: "/upload",
  request: {
    query: z.object({
      teamId: z.string().regex(/^\d+$/).transform(Number).optional(),
    }),
    body: {
      content: {
        "multipart/form-data": {
          schema: z.object({
            file: z.any(), // FormDataのファイル
            attachedTo: z.enum(["memo", "task", "comment"]),
            attachedDisplayId: z.string(),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "Uploaded attachment",
      content: {
        "application/json": {
          schema: TeamAttachmentSchema,
        },
      },
    },
    400: {
      description: "Bad request",
      content: {
        "application/json": {
          schema: z.object({ error: z.string() }),
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: {
        "application/json": {
          schema: z.object({ error: z.string() }),
        },
      },
    },
    403: {
      description: "Not a team member",
      content: {
        "application/json": {
          schema: z.object({ error: z.string() }),
        },
      },
    },
    413: {
      description: "File too large",
      content: {
        "application/json": {
          schema: z.object({ error: z.string() }),
        },
      },
    },
  },
});

export const uploadAttachment = async (c: any) => {
  const auth = getAuth(c);
  const db = c.get("db");
  const env = c.env;

  if (!auth?.userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const { teamId } = c.req.valid("query");

  // チームIDがある場合はメンバー確認
  if (teamId) {
    const member = await checkTeamMember(teamId, auth.userId, db);
    if (!member) {
      return c.json({ error: "Not a team member" }, 403);
    }
  }

  // FormData パース
  const formData = await c.req.formData();
  const file = formData.get("file") as File;
  const attachedTo = formData.get("attachedTo") as string;
  const attachedDisplayId = formData.get("attachedDisplayId") as string;

  if (!file || !attachedTo || !attachedDisplayId) {
    return c.json({ error: "Missing required fields" }, 400);
  }

  // ファイル種別判定
  const isImage = isImageFile(file.type);

  // 添付上限チェック
  const maxItems = isImage ? MAX_ATTACHMENTS_PER_ITEM : MAX_FILES_PER_ITEM;

  let existingCount;
  if (teamId) {
    // チームモード
    existingCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(teamAttachments)
      .where(
        and(
          eq(teamAttachments.teamId, teamId),
          eq(
            teamAttachments.attachedTo,
            attachedTo as "memo" | "task" | "comment",
          ),
          eq(teamAttachments.attachedDisplayId, attachedDisplayId),
          isNull(teamAttachments.deletedAt),
        ),
      );
  } else {
    // 個人モード（displayIdを使用）
    existingCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(attachments)
      .where(
        and(
          eq(attachments.userId, auth.userId),
          eq(attachments.attachedTo, attachedTo as "memo" | "task"),
          eq(attachments.displayId, attachedDisplayId),
          isNull(attachments.deletedAt),
        ),
      );
  }

  if (existingCount[0].count >= maxItems) {
    return c.json({ error: `添付ファイルは最大${maxItems}個までです` }, 400);
  }

  // ファイルバリデーション（画像 or 一般ファイル）
  const validation = isImage
    ? validateImageFile(file, file.type)
    : validateFile(file, file.type);

  if (!validation.valid) {
    return c.json({ error: validation.error }, 400);
  }

  // R2にアップロード（単一バケット、パスで分離）
  const r2Key = isImage
    ? generateR2Key(auth.userId, attachedTo, file.name)
    : generateFileR2Key(auth.userId, attachedTo, file.name);
  const r2Bucket = env.R2_BUCKET;

  if (!r2Bucket) {
    return c.json({ error: "R2 bucket not configured" }, 500);
  }

  console.log("🔵 [R2アップロード開始]", {
    r2Key,
    fileName: file.name,
    fileSize: file.size,
    mimeType: file.type,
    teamId,
    attachedTo,
    attachedDisplayId,
  });

  try {
    await r2Bucket.put(r2Key, file.stream(), {
      httpMetadata: {
        contentType: file.type,
      },
    });
    console.log("✅ [R2アップロード成功]", { r2Key });
  } catch (error) {
    console.error("❌ [R2アップロード失敗]", { r2Key, error });
    return c.json({ error: "File upload failed" }, 500);
  }

  // DB保存（URLはWorker経由アクセス用に後で生成）
  const createdAt = Date.now();
  const displayId = `${createdAt}-${Math.random().toString(36).substring(2, 10)}`;

  let result;
  if (teamId) {
    // チームモード
    result = await db
      .insert(teamAttachments)
      .values({
        teamId,
        userId: auth.userId,
        attachedTo,
        attachedDisplayId,
        displayId,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        r2Key,
        url: "",
        createdAt,
        deletedAt: null,
      })
      .returning();
  } else {
    // 個人モード（displayIdを使用）
    result = await db
      .insert(attachments)
      .values({
        userId: auth.userId,
        attachedTo: attachedTo as "memo" | "task",
        attachedId: 0, // displayIdで管理するためダミー
        displayId: attachedDisplayId,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        r2Key,
        url: "",
        createdAt,
        deletedAt: null,
      })
      .returning();
  }

  // Worker経由アクセスURL生成（キャッシュバスティング用にタイムスタンプ追加）
  const url = new URL(c.req.url);
  const apiBaseUrl = `${url.protocol}//${url.host}`;
  const endpoint = isImage ? "image" : "file";
  const prefix = teamId ? "" : "personal/";
  const workerUrl = `${apiBaseUrl}/attachments/${prefix}${endpoint}/${result[0].id}?v=${createdAt}`;

  // URLを更新
  if (teamId) {
    await db
      .update(teamAttachments)
      .set({ url: workerUrl })
      .where(eq(teamAttachments.id, result[0].id));
  } else {
    await db
      .update(attachments)
      .set({ url: workerUrl })
      .where(eq(attachments.id, result[0].id));
  }

  console.log("✅ [DB保存完了]", {
    id: result[0].id,
    displayId,
    workerUrl,
    teamId: teamId || null,
  });

  return c.json({ ...result[0], url: workerUrl, teamId: teamId || null }, 200);
};

// DELETE /attachments/:id（添付ファイル削除 - 個人・チーム両対応）
export const deleteAttachmentRoute = createRoute({
  method: "delete",
  path: "/{id}",
  request: {
    params: z.object({
      id: z.string().regex(/^\d+$/).transform(Number),
    }),
    query: z.object({
      teamId: z.string().regex(/^\d+$/).transform(Number).optional(),
    }),
  },
  responses: {
    200: {
      description: "Deleted successfully",
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean() }),
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: {
        "application/json": {
          schema: z.object({ error: z.string() }),
        },
      },
    },
    403: {
      description: "Forbidden",
      content: {
        "application/json": {
          schema: z.object({ error: z.string() }),
        },
      },
    },
    404: {
      description: "Not found",
      content: {
        "application/json": {
          schema: z.object({ error: z.string() }),
        },
      },
    },
  },
});

export const deleteAttachment = async (c: any) => {
  const auth = getAuth(c);
  const db = c.get("db");
  const env = c.env;

  if (!auth?.userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const { id } = c.req.valid("param");
  const { teamId } = c.req.valid("query");

  let attachment;
  if (teamId) {
    // チームモード：メンバー確認
    const member = await checkTeamMember(teamId, auth.userId, db);
    if (!member) {
      return c.json({ error: "Not a team member" }, 403);
    }

    const results = await db
      .select()
      .from(teamAttachments)
      .where(
        and(
          eq(teamAttachments.id, id),
          eq(teamAttachments.teamId, teamId),
          isNull(teamAttachments.deletedAt),
        ),
      )
      .limit(1);

    if (results.length === 0) {
      return c.json({ error: "Attachment not found" }, 404);
    }

    attachment = results[0];

    // 所有者確認
    if (attachment.userId !== auth.userId) {
      return c.json({ error: "You can only delete your own attachments" }, 403);
    }

    // 論理削除
    await db
      .update(teamAttachments)
      .set({ deletedAt: Date.now() })
      .where(eq(teamAttachments.id, id));
  } else {
    // 個人モード
    const results = await db
      .select()
      .from(attachments)
      .where(and(eq(attachments.id, id), isNull(attachments.deletedAt)))
      .limit(1);

    if (results.length === 0) {
      return c.json({ error: "Attachment not found" }, 404);
    }

    attachment = results[0];

    // 所有者確認
    if (attachment.userId !== auth.userId) {
      return c.json({ error: "Forbidden" }, 403);
    }

    // 論理削除
    await db
      .update(attachments)
      .set({ deletedAt: Date.now() })
      .where(eq(attachments.id, id));
  }

  // R2から削除（オプション）
  const r2Bucket = env.R2_BUCKET;
  if (r2Bucket) {
    try {
      await r2Bucket.delete(attachment.r2Key);
    } catch (error) {
      console.error("R2 delete failed:", error);
      // R2削除失敗してもDB削除は成功とする
    }
  }

  return c.json({ success: true }, 200);
};

// GET /attachments/image/:id（画像配信 - チームメンバー認証付き）
export const getImageRoute = createRoute({
  method: "get",
  path: "/image/{id}",
  request: {
    params: z.object({
      id: z.string().regex(/^\d+$/).transform(Number),
    }),
  },
  responses: {
    200: {
      description: "Image file",
      content: {
        "image/jpeg": { schema: z.any() },
        "image/png": { schema: z.any() },
        "image/gif": { schema: z.any() },
        "image/webp": { schema: z.any() },
        "image/svg+xml": { schema: z.any() },
      },
    },
    401: {
      description: "Unauthorized",
      content: {
        "application/json": {
          schema: z.object({ error: z.string() }),
        },
      },
    },
    403: {
      description: "Forbidden",
      content: {
        "application/json": {
          schema: z.object({ error: z.string() }),
        },
      },
    },
    404: {
      description: "Not found",
      content: {
        "application/json": {
          schema: z.object({ error: z.string() }),
        },
      },
    },
  },
});

export const getImage = async (c: any) => {
  const auth = getAuth(c);
  const db = c.get("db");
  const env = c.env;

  if (!auth?.userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const { id } = c.req.valid("param");

  // 添付ファイル情報取得
  const attachments = await db
    .select()
    .from(teamAttachments)
    .where(and(eq(teamAttachments.id, id), isNull(teamAttachments.deletedAt)))
    .limit(1);

  if (attachments.length === 0) {
    return c.json({ error: "Attachment not found" }, 404);
  }

  const attachment = attachments[0];

  // チームメンバー確認
  const member = await checkTeamMember(attachment.teamId, auth.userId, db);
  if (!member) {
    return c.json({ error: "Not a team member" }, 403);
  }

  // R2から画像取得（後方互換性: 新形式→旧形式の順で試す）
  const r2Bucket = env.R2_BUCKET;
  if (!r2Bucket) {
    return c.json({ error: "R2 bucket not configured" }, 500);
  }

  console.log("🔵 [getImage] R2取得開始", {
    attachmentId: id,
    r2Key: attachment.r2Key,
    fileName: attachment.fileName,
  });

  let object = await r2Bucket.get(attachment.r2Key);

  // 新形式で見つからない場合、旧形式を試す（後方互換性）
  // 新: user_xxx/images/memo/xxx.png → 旧: user_xxx/memo/xxx.png
  if (!object) {
    const oldKey = attachment.r2Key.replace(/\/images\//, "/");
    console.log("⚠️ [getImage] 新形式で見つからず、旧形式を試行", { oldKey });
    if (oldKey !== attachment.r2Key) {
      object = await r2Bucket.get(oldKey);
    }
  }

  if (!object) {
    console.error("❌ [getImage] R2に画像が存在しない", {
      attachmentId: id,
      r2Key: attachment.r2Key,
    });
    return c.json({ error: "Image not found in storage" }, 404);
  }

  console.log("✅ [getImage] R2から画像取得成功", {
    attachmentId: id,
    size: object.size,
  });

  // 画像を返却
  const origin = c.req.header("Origin") || "https://petaboo.vercel.app";
  return new Response(object.body, {
    headers: {
      "Content-Type": attachment.mimeType,
      "Cache-Control": "no-cache", // キャッシュ無効化（開発中）
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Credentials": "true",
    },
  });
};

// GET /attachments/file/:id（ファイル配信 - チームメンバー認証付き）
export const getFileRoute = createRoute({
  method: "get",
  path: "/file/{id}",
  request: {
    params: z.object({
      id: z.string().regex(/^\d+$/).transform(Number),
    }),
  },
  responses: {
    200: {
      description: "File",
      content: {
        "application/pdf": { schema: z.any() },
        "application/msword": { schema: z.any() },
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
          { schema: z.any() },
        "application/vnd.ms-excel": { schema: z.any() },
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
          schema: z.any(),
        },
        "application/vnd.ms-powerpoint": { schema: z.any() },
        "application/vnd.openxmlformats-officedocument.presentationml.presentation":
          { schema: z.any() },
        "text/plain": { schema: z.any() },
        "text/csv": { schema: z.any() },
      },
    },
    401: {
      description: "Unauthorized",
      content: {
        "application/json": {
          schema: z.object({ error: z.string() }),
        },
      },
    },
    403: {
      description: "Forbidden",
      content: {
        "application/json": {
          schema: z.object({ error: z.string() }),
        },
      },
    },
    404: {
      description: "Not found",
      content: {
        "application/json": {
          schema: z.object({ error: z.string() }),
        },
      },
    },
  },
});

export const getFile = async (c: any) => {
  const auth = getAuth(c);
  const db = c.get("db");
  const env = c.env;

  if (!auth?.userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const { id } = c.req.valid("param");

  // 添付ファイル情報取得
  const attachments = await db
    .select()
    .from(teamAttachments)
    .where(and(eq(teamAttachments.id, id), isNull(teamAttachments.deletedAt)))
    .limit(1);

  if (attachments.length === 0) {
    return c.json({ error: "Attachment not found" }, 404);
  }

  const attachment = attachments[0];

  // チームメンバー確認
  const member = await checkTeamMember(attachment.teamId, auth.userId, db);
  if (!member) {
    return c.json({ error: "Not a team member" }, 403);
  }

  // R2からファイル取得（後方互換性: 新形式→旧形式の順で試す）
  const r2Bucket = env.R2_BUCKET;
  if (!r2Bucket) {
    return c.json({ error: "R2 bucket not configured" }, 500);
  }

  let object = await r2Bucket.get(attachment.r2Key);

  // 新形式で見つからない場合、旧形式を試す（後方互換性）
  // 新: user_xxx/files/memo/xxx.pdf → 旧: user_xxx/memo/xxx.pdf
  if (!object) {
    const oldKey = attachment.r2Key.replace(/\/files\//, "/");
    if (oldKey !== attachment.r2Key) {
      object = await r2Bucket.get(oldKey);
    }
  }

  if (!object) {
    return c.json({ error: "File not found in storage" }, 404);
  }

  // ファイルを返却（Content-Dispositionでダウンロード用ファイル名指定）
  const origin = c.req.header("Origin") || "https://petaboo.vercel.app";
  return new Response(object.body, {
    headers: {
      "Content-Type": attachment.mimeType,
      "Content-Disposition": `inline; filename="${encodeURIComponent(attachment.fileName)}"`,
      "Cache-Control": "no-cache", // キャッシュ無効化（開発中）
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Credentials": "true",
    },
  });
};

// GET /attachments/personal/image/:id（個人用画像配信）
export const getPersonalImageRoute = createRoute({
  method: "get",
  path: "/personal/image/{id}",
  request: {
    params: z.object({
      id: z.string().regex(/^\d+$/).transform(Number),
    }),
  },
  responses: {
    200: {
      description: "Image file",
      content: {
        "image/jpeg": { schema: z.any() },
        "image/png": { schema: z.any() },
        "image/gif": { schema: z.any() },
        "image/webp": { schema: z.any() },
        "image/svg+xml": { schema: z.any() },
      },
    },
    401: {
      description: "Unauthorized",
      content: {
        "application/json": { schema: z.object({ error: z.string() }) },
      },
    },
    403: {
      description: "Forbidden",
      content: {
        "application/json": { schema: z.object({ error: z.string() }) },
      },
    },
    404: {
      description: "Not found",
      content: {
        "application/json": { schema: z.object({ error: z.string() }) },
      },
    },
  },
});

export const getPersonalImage = async (c: any) => {
  const auth = getAuth(c);
  const db = c.get("db");
  const env = c.env;

  if (!auth?.userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const { id } = c.req.valid("param");

  // 個人用添付ファイル取得
  const results = await db
    .select()
    .from(attachments)
    .where(and(eq(attachments.id, id), isNull(attachments.deletedAt)))
    .limit(1);

  if (results.length === 0) {
    return c.json({ error: "Attachment not found" }, 404);
  }

  const attachment = results[0];

  // 所有者確認
  if (attachment.userId !== auth.userId) {
    return c.json({ error: "Forbidden" }, 403);
  }

  // R2から画像取得
  const r2Bucket = env.R2_BUCKET;
  if (!r2Bucket) {
    return c.json({ error: "R2 bucket not configured" }, 500);
  }

  const object = await r2Bucket.get(attachment.r2Key);

  if (!object) {
    return c.json({ error: "Image not found in storage" }, 404);
  }

  // 画像を返却
  const origin = c.req.header("Origin") || "http://localhost:7593";
  return new Response(object.body, {
    headers: {
      "Content-Type": attachment.mimeType,
      "Cache-Control": "no-cache", // キャッシュ無効化（開発中）
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Credentials": "true",
    },
  });
};

export function registerAttachmentRoutes(app: OpenAPIHono<any, any, any>) {
  app.openapi(getAllAttachmentsRoute, getAllAttachments);
  app.openapi(getAttachmentsRoute, getAttachments);
  app.openapi(uploadAttachmentRoute, uploadAttachment);
  app.openapi(deleteAttachmentRoute, deleteAttachment);
  app.openapi(getImageRoute, getImage);
  app.openapi(getFileRoute, getFile);
  app.openapi(getPersonalImageRoute, getPersonalImage);
}
