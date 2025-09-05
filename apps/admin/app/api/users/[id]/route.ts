import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:7594";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    console.log(`🔄 Proxy API Route - PUT /api/users/${id}`);
    console.log("📝 Update data:", body);

    const response = await fetch(`${API_BASE_URL}/users/${id}`, {
      method: "PUT",
      headers: {
        "x-admin-token": "petaboo_admin_dev_token_2025",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `❌ API Error: ${response.status} ${response.statusText}`,
        errorText,
      );
      return NextResponse.json(
        { error: "Failed to update user" },
        { status: response.status },
      );
    }

    const data = await response.json();
    console.log("✅ Proxy API - User updated:", data);
    return NextResponse.json(data);
  } catch (error) {
    console.error("🚨 Proxy API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
