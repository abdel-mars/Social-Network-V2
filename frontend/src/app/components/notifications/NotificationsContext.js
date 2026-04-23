"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

const NotificationsContext = createContext(null);

function mergeNotifications(current, incoming) {
  const existing = Array.isArray(current) ? current : [];
  const nextItems = Array.isArray(incoming) ? incoming : [incoming];

  let updated = [...existing];
  
  for (const item of nextItems) {
    if (!item?.id) continue;

    // Handle deduplication for follow requests
    if (item.type === "Invitation_friendships" && item.sender?.id) {
      updated = updated.filter(
        (n) => !(n.type === "Invitation_friendships" && n.sender?.id === item.sender.id && n.id !== item.id)
      );
    }

    const index = updated.findIndex((n) => n.id === item.id);
    if (index !== -1) {
      // Update existing item with new data
      updated[index] = { ...updated[index], ...item };
    } else {
      // Add as new item at the beginning
      updated = [item, ...updated];
    }
  }

  return updated;
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

        // Handle removal events (sent when someone unfollows / cancels request)
        if (incoming.action === "remove") {
          const senderIdToRemove = Number(incoming.sender_id);
          setNotifications((prev) =>
            prev.filter(
              (n) => !(Number(n.sender?.id) === senderIdToRemove && n.type === incoming.type)
            )
          );
          
          window.dispatchEvent(new CustomEvent("followUpdated", { 
            detail: { 
              follower_id: senderIdToRemove, 
              status: "none", 
              source: "sse",
              type: "follower_removed" 
            } 
          }));
          return;
        }

        if (!Array.isArray(incoming)) {
          incoming = [incoming];
        }

        incoming.forEach(notif => {
          if (notif.type === "follow_accepted") {
            window.dispatchEvent(new CustomEvent("followUpdated", { 
              detail: { 
                followed_id: Number(notif.sender?.id), 
                status: "following", 
                source: "sse",
              } 
            }));
          } else if (notif.type === "Invitation_friendships") {
             const isAccepted = notif.message?.includes("started following");
             window.dispatchEvent(new CustomEvent("followUpdated", { 
              detail: { 
                follower_id: Number(notif.sender?.id), 
                status: isAccepted ? "accepted" : "pending", 
                source: "sse",
                type: "follower_added"
              } 
            }));
          }
        });

        setNotifications((prev) => mergeNotifications(prev, incoming));
      } catch (err) {
        console.error("Failed to parse notification event:", err);
      }
    };

    eventSource.onerror = (err) => {
      if (eventSource.readyState === EventSource.CLOSED) return;
      console.error("SSE error:", err);
    };

    return () => {
      isMounted = false;
      eventSource.close();
    };
  }, [userId]);

  const removeNotifications = (ids) => {
    if (!Array.isArray(ids) || ids.length === 0) return;
    setNotifications((prev) => prev.filter((notif) => !ids.includes(notif.id)));
  };

  const removeNotificationsBySender = (senderId, type = "Invitation_friendships") => {
    const sId = Number(senderId);
    setNotifications((prev) => prev.filter((n) => !(Number(n.sender?.id) === sId && n.type === type)));
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
      if (res.ok) removeNotifications(ids);
    } catch (err) {
      console.error(err);
    }
  };

  const clearAllNotifications = async () => {
    try {
      const res = await fetch("http://localhost:8080/notifications/clear", {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.filter((n) => n.type === "Invitation_friendships" && n.state === "unread" && n.receiver_is_private)
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Background listener to keep notification state in sync with follow actions
  useEffect(() => {
    const handleFollowUpdate = (e) => {
      if (!e.detail || !e.detail.followed_id) return;
      
      const { followed_id, status } = e.detail;
      const isNowFollowing = status === "following" || status === "accepted";

      // Sync the "is_following_sender" state without removing the notification
      setNotifications((prev) => 
        prev.map(n => {
          if (n.type === "Invitation_friendships" && n.sender?.id === Number(followed_id)) {
            return { ...n, is_following_sender: isNowFollowing };
          }
          return n;
        })
      );
    };
    window.addEventListener("followUpdated", handleFollowUpdate);
    return () => window.removeEventListener("followUpdated", handleFollowUpdate);
  }, []);

  const value = useMemo(
    () => ({
      notifications,
      notificationCount: notifications.length,
      markNotificationsRead,
      clearAllNotifications,
      removeNotifications,
      removeNotificationsBySender,
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
  if (!context) throw new Error("useNotifications must be used within a NotificationsProvider");
  return context;
}
