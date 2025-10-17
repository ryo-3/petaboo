const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:7594";

export interface Notification {
  id: number;
  teamId: number;
  userId: string;
  type: string;
  sourceType: string | null;
  sourceId: number | null;
  targetType: string | null;
  targetOriginalId: string | null;
  actorUserId: string | null;
  actorDisplayName: string | null;
  message: string | null;
  isRead: number;
  createdAt: number;
  readAt: number | null;
}

export interface NotificationsResponse {
  notifications: Notification[];
  unreadCount: number;
}

// 通知一覧取得
export async function getNotifications(
  teamId: number,
  token?: string,
): Promise<NotificationsResponse> {
  const response = await fetch(
    `${API_BASE_URL}/notifications?teamId=${teamId}`,
    {
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch notifications: ${response.statusText}`);
  }

  return response.json();
}

// 通知を既読にする
export async function markNotificationAsRead(
  notificationId: number,
  token?: string,
): Promise<{ success: boolean }> {
  const response = await fetch(
    `${API_BASE_URL}/notifications/${notificationId}/read`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    },
  );

  if (!response.ok) {
    throw new Error(
      `Failed to mark notification as read: ${response.statusText}`,
    );
  }

  return response.json();
}

// すべて既読にする
export async function markAllNotificationsAsRead(
  teamId: number,
  token?: string,
): Promise<{ success: boolean }> {
  const response = await fetch(
    `${API_BASE_URL}/notifications/mark-all-read?teamId=${teamId}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    },
  );

  if (!response.ok) {
    throw new Error(
      `Failed to mark all notifications as read: ${response.statusText}`,
    );
  }

  return response.json();
}
