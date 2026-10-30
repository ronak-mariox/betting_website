import { apiRequest } from '../api';

export type ApiNotificationCategory = 'risk' | 'wallet' | 'general';

export type ApiNotification = {
  _id: string;
  recipientRole: string;
  emoji: string;
  title: string;
  body: string;
  category: ApiNotificationCategory;
  unread: boolean;
  createdAt: string;
  updatedAt: string;
};

export type NotificationsResponse = {
  notifications: ApiNotification[];
  unreadCount: number;
};

export const notificationsApi = {
  list: (accessToken?: string | null) =>
    apiRequest<NotificationsResponse>('/notifications', { accessToken }),

  /** Marks every notification for this role read — the response already carries the refreshed list. */
  markAllRead: (accessToken?: string | null) =>
    apiRequest<NotificationsResponse>('/notifications/read-all', { method: 'PATCH', accessToken }),

  /** Clears the whole feed for this role. */
  clear: (accessToken?: string | null) =>
    apiRequest<{ success: true }>('/notifications', { method: 'DELETE', accessToken }),
};
