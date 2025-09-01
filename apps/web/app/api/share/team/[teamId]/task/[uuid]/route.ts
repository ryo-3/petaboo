import { NextRequest } from "next/server";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:7594";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string; uuid: string }> },
) {
  const { teamId, uuid } = await params;

  try {
    // APIサーバーにプロキシ
    const response = await fetch(
      `${API_BASE_URL}/teams/${teamId}/share/task/${uuid}`,
      {
        headers: {
          "Content-Type": "application/json",
          // 認証ヘッダーがある場合は転送
          ...(request.headers.get("Authorization") && {
            Authorization: request.headers.get("Authorization")!,
          }),
        },
      },
    );

    const data = await response.json();

    return Response.json(data, { status: response.status });
  } catch (error) {
    console.error("Share task proxy error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
