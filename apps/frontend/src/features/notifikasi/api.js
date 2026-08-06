import api from "@/lib/api";

export const getNotifications = () =>
    api.get("/api/notifications");

export const getUnreadCount = () =>
    api.get("/api/notifications/unread-count");

export const readNotification = (id) =>
    api.post(`/api/notifications/${id}/read`);

export const readAllNotifications = () =>
    api.post("/api/notifications/read-all");