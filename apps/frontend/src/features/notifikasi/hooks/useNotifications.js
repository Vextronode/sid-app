import { useEffect, useState } from "react";

import {
    getNotifications,
    getUnreadCount,
    readNotification,
    readAllNotifications,
} from "../api";

export default function useNotifications() {

    const [notifications, setNotifications] = useState([]);

    const [unreadCount, setUnreadCount] = useState(0);

    const [loading, setLoading] = useState(true);

    const loadNotifications = async () => {

        try {

            setLoading(true);

            const [notifRes, unreadRes] = await Promise.all([
                getNotifications(),
                getUnreadCount(),
            ]);

            setNotifications(notifRes.data);

            setUnreadCount(unreadRes.data.count);

        } finally {

            setLoading(false);

        }

    };

    useEffect(() => {

        loadNotifications();

    }, []);

    const markAsRead = async (id) => {

        await readNotification(id);

        await loadNotifications();

    };

    const markAllAsRead = async () => {

        await readAllNotifications();

        await loadNotifications();

    };

    return {

        notifications,

        unreadCount,

        loading,

        markAsRead,

        markAllAsRead,

        reload: loadNotifications,

    };

}