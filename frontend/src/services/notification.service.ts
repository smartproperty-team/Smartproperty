// ===========================================
// SmartProperty - Notification Service
// ===========================================

import api from "./api";

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type:
    | "verification_approved"
    | "verification_rejected"
    | "application_submitted"
    | "application_status_changed"
    | "application_document_requested"
    | "application_deadline_reminder"
    | "maintenance_request_submitted"
    | "maintenance_assigned"
    | "maintenance_status_changed"
    | "maintenance_completed"
    | "system"
    | "info";
  isRead: boolean;
  link?: string;
  createdAt: string;
}

export const notificationService = {
  // Get all notifications
  async getAll(): Promise<Notification[]> {
    const response = await api.get<Notification[]>("/notifications");
    return response.data;
  },

  // Get unread count
  async getUnreadCount(): Promise<number> {
    const response = await api.get<{ count: number }>(
      "/notifications/unread-count",
    );
    return response.data.count;
  },

  // Mark one as read
  async markAsRead(id: string): Promise<void> {
    await api.patch(`/notifications/${id}/read`);
  },

  // Mark all as read
  async markAllAsRead(): Promise<void> {
    await api.patch("/notifications/read-all");
  },

  // Delete a notification
  async delete(id: string): Promise<void> {
    await api.delete(`/notifications/${id}`);
  },
};

export default notificationService;
