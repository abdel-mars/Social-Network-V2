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

  useEffect(() => {
    const userId = window.localStorage.getItem("userId");
    if (!userId) {
      setNotifications([]);
      return;
    }

    let isMounted = true;

    fetch("http://localhost:8080/notifications", {
      method: "GET",
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && Array.isArray(data)) {
          setNotifications(data);
        }
      })
      .catch((err) => console.error("Fetch error:", err));

    const eventSource = new EventSource("http://localhost:8080/events", {
      withCredentials: true,
    });

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
      console.error("SSE error:", err);
    };

    return () => {
      isMounted = false;
      eventSource.close();
    };
  }, [pathname]);

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

  const value = useMemo(
    () => ({
      notifications,
      notificationCount: notifications.length,
      markNotificationsRead,
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
