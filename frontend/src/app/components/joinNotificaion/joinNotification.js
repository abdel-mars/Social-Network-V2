"use client";

import { useState } from "react";
import { useNotifications } from "../notifications/NotificationsContext";
import styles from "../followNotification/notification.module.css";
import { Check, X } from "lucide-react";
import { API_URL, UPLOAD_URL } from "../../lib/api";

export default function JoinRequest({ request }) {
  const { removeNotifications } = useNotifications();
  const [status, setStatus] = useState(request.state);

  const handlestate = async (newStatus) => {
    try {
      const res = await fetch(`${API_URL}/accept-reject-join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          group_id: request.group_id,
          user_id: request.sender.id,
          state: newStatus,
        }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      const r = await res.json();
      setStatus(r.state);
      removeNotifications([request.id]);
    } catch (err) {
      console.error(err);
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
          <span className={styles.username}>@{request.sender.username}</span> wants to join <strong>{request.group_title}</strong>
        </div>

        {status === "unread" ? (
          <div className={styles.actions}>
            <button className={`${styles.actionBtn} ${styles.accept}`} onClick={() => handlestate("accept")}>
              <Check size={14} /> Accept
            </button>
            <button className={`${styles.actionBtn} ${styles.reject}`} onClick={() => handlestate("reject")}>
              <X size={14} /> Reject
            </button>
          </div>
        ) : (
          <div className={styles.actions}>
             <span className={styles.statusLabel}>
               {status === "accept" ? "Accepted" : "Rejected"}
             </span>
          </div>
        )}
      </div>
    </div>
  );
}
