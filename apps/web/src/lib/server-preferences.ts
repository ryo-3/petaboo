import { UserPreferences } from '@/src/contexts/user-preferences-context';

const API_BASE = process.env.API_URL || 'http://localhost:8794';

export async function getServerUserPreferences(userId: number): Promise<UserPreferences | null> {
  try {
    const response = await fetch(`${API_BASE}/user-preferences/${userId}`, {
      cache: 'no-store', // Always fetch fresh data
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    return null;
  }
}