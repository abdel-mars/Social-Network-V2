"use client";

import FollowRequest from "../followNotification/followNotification";
import JoinRequest from "../joinNotificaion/joinNotification";
import GroupInvitation from "../groupInvitation/groupInvitation";
import { useNotifications } from "./NotificationsContext";
import { Bell } from "lucide-react";
import styles from "./notificationpanel.module.css";

function requiresInteraction(notification) {
  if (!notification) return false;

  if (notification.type === "group_invitation") {
    return notification.state === "unread";
  }

  if (notification.type === "request_join_groub" || notification.type === "group_join_request") {
    return notification.state === "unread";
  }

  if (notification.type === "Invitation_friendships") {
    if (notification.state === "accepted") {
      return !notification.is_following_sender;
    }

    return true;
  }

  return false;
}

export function NotificationPanel() {
  const { notifications, notificationCount, markNotificationsRead, clearAllNotifications } = useNotifications();

  const handleRead = async (id) => {
    await markNotificationsRead([id]);
  };

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <Bell size={16} />
        <span>Notifications</span>
        {notificationCount > 0 && (
          <>
            <span className={styles.badge}>{notificationCount}</span>
            <button 
              className={styles.clearBtn} 
              onClick={clearAllNotifications}
              title="Clear all notifications"
            >
              Clear all
            </button>
          </>
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
            if (n.type === "request_join_groub" || n.type === "group_join_request") {
              return <JoinRequest key={n.id} request={n} />;
            }
            if (n.type === "group_invitation") {
              return <GroupInvitation key={n.id} request={n} />;
            }

            if (n.type === "group_invitation_response") {
              return (
                <button
                  key={n.id}
                  type="button"
                  className={styles.infoItem}
                  onClick={() => handleRead(n.id)}
                >
                  <div className={styles.notifItem}>
                    <img
                      className={styles.avatar}
                      src={n.sender?.avatar ? `http://localhost:8080/${n.sender.avatar}` : "/default-avatar.png"}
                      alt={n.sender?.first_name || "User"}
                      onError={(e) => { e.currentTarget.src = "/default-avatar.png"; }}
                    />
                    <div className={styles.content}>
                      <div className={styles.textLine}>
                        <span className={styles.username}>@{n.sender?.username}</span>{" "}
                        {n.message.toLowerCase().includes("declined")
                          ? <>declined your invitation to join <strong>{n.group_title}</strong></>
                          : <>accepted your invitation to join <strong>{n.group_title}</strong></>}
                      </div>
                      <span className={styles.readHint}>Tap to dismiss</span>
                    </div>
                  </div>
                </button>
              );
            }

            if (n.type === "group_join_response") {
              return (
                <button
                  key={n.id}
                  type="button"
                  className={styles.infoItem}
                  onClick={() => handleRead(n.id)}
                >
                  <div className={styles.notifItem}>
                    <img
                      className={styles.avatar}
                      src={n.sender?.avatar ? `http://localhost:8080/${n.sender.avatar}` : "/default-avatar.png"}
                      alt={n.sender?.first_name || "Admin"}
                      onError={(e) => { e.currentTarget.src = "/default-avatar.png"; }}
                    />
                    <div className={styles.content}>
                      <div className={styles.textLine}>
                        <span className={styles.username}>@{n.sender?.username}</span>{" "}
                        {n.message.toLowerCase().includes("rejected")
                          ? <>rejected your request to join <strong>{n.group_title}</strong></>
                          : <>accepted your request to join <strong>{n.group_title}</strong></>}
                      </div>
                      <span className={styles.readHint}>Tap to dismiss</span>
                    </div>
                  </div>
                </button>
              );
            }

            return (
              <button
                key={n.id}
                type="button"
                className={styles.infoItem}
                onClick={() => handleRead(n.id)}
              >
                <div className={styles.notifItem}>
                  <div className={styles.notifDot} />
                  <div className={styles.notifContent}>
                    <strong>{n.type}</strong> — {n.message}
                    {n.sender && (
                      <span className={styles.sender}> from {n.sender.username}</span>
                    )}
                    <div className={styles.readHint}>Tap to dismiss</div>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
