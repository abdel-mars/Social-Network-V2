"use client";

import { useState } from "react";
import { useNotifications } from "../notifications/NotificationsContext";
import styles from "../followNotification/notification.module.css";
import { Check, X } from "lucide-react";
import { API_URL, UPLOAD_URL } from "../../lib/api";

export default function GroupInvitation({ request }) {
  const { removeNotifications } = useNotifications();
  const [status, setStatus] = useState(request.state);
  const [loading, setLoading] = useState(false);

  const respondToInvite = async (newState) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/group/invite/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ group_id: request.group_id, state: newState }),
      });
      if (!res.ok) throw new Error("Failed to respond to invitation");
      const data = await res.json();
      setStatus(data.state);
      removeNotifications([request.id]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.notifItem}>
      <img
        className={styles.avatar}
        src={request.sender.avatar ? `${UPLOAD_URL}/${request.sender.avatar}` : "/default-avatar.png"}
        alt={request.sender.first_name}
        onError={(e) => { e.currentTarget.src = "/default-avatar.png"; }}
      />
      <div className={styles.content}>
        <div className={styles.textLine}>
          <span className={styles.username}>@{request.sender.username}</span> invited you to join <strong>{request.group_title}</strong>
        </div>

        {status === "unread" ? (
          <div className={styles.actions}>
            <button className={`${styles.actionBtn} ${styles.accept}`} disabled={loading} onClick={() => respondToInvite("accept")}>
              <Check size={14} /> Accept
            </button>
            <button className={`${styles.actionBtn} ${styles.reject}`} disabled={loading} onClick={() => respondToInvite("reject")}>
              <X size={14} /> Decline
            </button>
          </div>
        ) : (
          <div className={styles.actions}>
            <span className={styles.statusLabel}>
              {status === "accept" || status === "accepted" ? "Accepted" : "Declined"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
