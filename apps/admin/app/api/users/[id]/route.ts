import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL =
  process.env.NODE_ENV === "production"
    ? "https://petaboo-api.t-takatsu02.workers.dev"
    : "http://localhost:7594";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { id } = params;
    console.log(`🔄 Proxy API Route - GET /api/users/${id}`);

    const response = await fetch(`${API_BASE_URL}/users/${id}`, {
      headers: {
        "x-admin-token": "petaboo_admin_dev_token_2025",
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.error(`❌ API Error: ${response.status} ${response.statusText}`);
      return NextResponse.json(
        { error: "Failed to fetch user" },
        { status: response.status },
      );
    }

    const data = await response.json();
    console.log("✅ Proxy API - User data retrieved:", data);
    return NextResponse.json(data);
  } catch (error) {
    console.error("🚨 Proxy API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
