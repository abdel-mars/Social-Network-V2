"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

const NotificationsContext = createContext(null);

function mergeNotifications(current, incoming) {
  const existing = Array.isArray(current) ? current : [];
  const nextItems = Array.isArray(incoming) ? incoming : [incoming];
  const uniqueItems = nextItems.filter(
    (item) => item?.id && !existing.some((notif) => notif.id === item.id)
  );

  return [...uniqueItems, ...existing];
}

export function NotificationsProvider({ children }) {
  const pathname = usePathname();
  const [notifications, setNotifications] = useState([]);

  const [userId, setUserId] = useState(null);

  // Poll for userId changes (e.g. login/logout)
  useEffect(() => {
    const checkUser = () => {
      const currentId = window.localStorage.getItem("userId");
      if (currentId !== userId) {
        setUserId(currentId);
      }
    };
    checkUser();
    const interval = setInterval(checkUser, 2000);
    return () => clearInterval(interval);
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setNotifications([]);
      return;
    }

    let isMounted = true;

    fetch("http://localhost:8080/notifications", {
      method: "GET",
      credentials: "include",
    })
      .then((res) => {
        if (!res.ok) throw new Error("Auth failed");
        return res.json();
      })
      .then((data) => {
        if (isMounted && Array.isArray(data)) {
          setNotifications(data);
        }
      })
      .catch((err) => console.error("Fetch error:", err));

    const eventSource = new EventSource("http://localhost:8080/events", {
      withCredentials: true,
    });

    eventSource.onopen = () => {
      console.log("[SSE] Connected successfully");
    };

    eventSource.onmessage = (event) => {
      try {
        let incoming = JSON.parse(event.data);
        if (!Array.isArray(incoming)) {
          incoming = [incoming];
        }
        setNotifications((prev) => mergeNotifications(prev, incoming));
      } catch (err) {
        console.error("Failed to parse notification event:", err);
      }
    };

    eventSource.onerror = (err) => {
      // Don't log error if the connection was closed intentionally or by navigate
      if (eventSource.readyState === EventSource.CLOSED) return;
      console.error("SSE error:", err);
    };

    return () => {
      isMounted = false;
      eventSource.close();
    };
  }, [userId]); // Only reconnect if the user ID actually changes

  const removeNotifications = (ids) => {
    if (!Array.isArray(ids) || ids.length === 0) return;

    setNotifications((prev) => prev.filter((notif) => !ids.includes(notif.id)));
  };

  const markNotificationsRead = async (ids) => {
    if (!Array.isArray(ids) || ids.length === 0) return;

    try {
      const res = await fetch("http://localhost:8080/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ids }),
      });

      if (!res.ok) {
        throw new Error("Failed to mark notifications as read");
      }

      removeNotifications(ids);
    } catch (err) {
      console.error("Failed to mark notifications as read:", err);
    }
  };

  const clearAllNotifications = async () => {
    try {
      const res = await fetch("http://localhost:8080/notifications/clear", {
        method: "POST",
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("Failed to clear notifications");
      }

      setNotifications([]);
    } catch (err) {
      console.error("Failed to clear notifications:", err);
    }
  };

  const value = useMemo(
    () => ({
      notifications,
      notificationCount: notifications.length,
      markNotificationsRead,
      clearAllNotifications,
      removeNotifications,
      setNotifications,
    }),
    [notifications]
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationsContext);

  if (!context) {
    throw new Error("useNotifications must be used within a NotificationsProvider");
  }

  return context;
}
