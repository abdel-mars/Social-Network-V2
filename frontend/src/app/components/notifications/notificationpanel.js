"use client";

import { useEffect, useState } from "react";
import FollowRequest from "../followNotification/followNotification";
import JoinRequest from "../joinNotificaion/joinNotification";
import { Bell } from "lucide-react";
import styles from "./notificationpanel.module.css";

export function NotificationPanel() {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const eventSource = new EventSource("http://localhost:8080/events", { withCredentials: true });

    eventSource.onmessage = (e) => {
      let notif = JSON.parse(e.data);
      if (!Array.isArray(notif)) notif = [notif];
      setNotifications((prev) => {
        const current = Array.isArray(prev) ? prev : [];
        const newNotifs = notif.filter((n) => !current.some((c) => c.id === n.id));
        return [...newNotifs, ...current];
      });
    };

    eventSource.onerror = (err) => {
      console.error("SSE error:", err);
    };

    return () => eventSource.close();
  }, []);

  useEffect(() => {
    fetch("http://localhost:8080/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setNotifications(data);
      })
      .catch((err) => console.error("Fetch error:", err));
  }, []);

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <Bell size={16} />
        <span>Notifications</span>
        {notifications.length > 0 && (
          <span className={styles.badge}>{notifications.length}</span>
        )}
      </div>

      <div className={styles.list}>
        {!notifications || notifications.length === 0 ? (
          <div className={styles.empty}>
            <p>All caught up! 🎉</p>
          </div>
        ) : (
          notifications.map((n) => {
            if (n.type === "Invitation_friendships") {
              return <FollowRequest key={n.id} request={n} />;
            }
            if (n.type === "request_join_groub") {
              return <JoinRequest key={n.id} request={n} />;
            }
            return (
              <div key={n.id} className={styles.notifItem}>
                <div className={styles.notifDot} />
                <div className={styles.notifContent}>
                  <strong>{n.type}</strong> — {n.message}
                  {n.sender && (
                    <span className={styles.sender}> from {n.sender.username}</span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
