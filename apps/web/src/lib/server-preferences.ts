import { UserPreferences } from "@/src/contexts/user-preferences-context";

const API_BASE = process.env.API_URL || "http://localhost:7594";

export async function getServerUserPreferences(
  userId: number,
): Promise<UserPreferences | null> {
  // 本番環境でAPI_URLが未設定の場合はnullを返す
  if (!process.env.API_URL && process.env.NODE_ENV === "production") {
    console.warn("[server-preferences] API_URL not set in production");
    return null;
  }

  try {
    const response = await fetch(`${API_BASE}/user-preferences/${userId}`, {
      cache: "no-store", // Always fetch fresh data
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data;
  } catch {
    return null;
  }
}
