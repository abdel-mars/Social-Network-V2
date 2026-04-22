"use client";

import { useState } from "react";
import { timeAgo } from "../../lib/time";
import { useNotifications } from "../notifications/NotificationsContext";
import { useRouter } from "next/navigation";
import styles from "./notification.module.css";
import { Check, X, UserPlus, UserCheck } from "lucide-react";

export default function FollowRequest({ request }) {
  const router = useRouter();
  const { markNotificationsRead, removeNotifications } = useNotifications();
  const [status, setStatus] = useState(
    request.state === "accepted"
      ? "accepted"
      : request.receiver_is_private === true
        ? "pending"
        : "accepted"
  );
  const [followBackStatus, setFollowBackStatus] = useState(
    request.is_following_sender ? "following" : "not_following"
  );
  const [followBackLoading, setFollowBackLoading] = useState(false);
  const hasFollowedBack = followBackStatus === "following";

  const handleFollowAction = async (senderId, action) => {
    try {
      const res = await fetch(`http://localhost:8080/request_follow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ sender_id: senderId, status: action }),
      });
      if (res.ok) {
        setStatus(action);
        if (action === "reject") {
          removeNotifications([request.id]);
        }
      }
    } catch (err) {
      console.error("Error:", err);
    }
  };

  const handleFollowBack = async (user_id) => {
    try {
      setFollowBackLoading(true);
      const res = await fetch("http://localhost:8080/toggle-follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ followed_id: user_id }),
        credentials: "include",
      });
      if (res.ok) {
        setFollowBackStatus("following");
        await markNotificationsRead([request.id]);
        window.dispatchEvent(new CustomEvent("followUpdated"));
      }
    } catch (err) {
      console.error("Error following back:", err);
    } finally {
      setFollowBackLoading(false);
    }
  };

  return (
    <div className={styles.notifItem}>
      <img
        className={styles.avatar}
        src={request.sender.avatar ? `http://localhost:8080/${request.sender.avatar}` : "/default-avatar.png"}
        alt={request.sender.first_name}
        onError={(e) => { e.currentTarget.src = "/default-avatar.png"; }}
        onClick={(e) => { e.stopPropagation(); router.push(`/profile?id=${request.sender.id}`); }}
        style={{ cursor: "pointer" }}
      />
      
      <div className={styles.content}>
        <div className={styles.textLine}>
          <span 
            className={styles.username}
            onClick={(e) => { e.stopPropagation(); router.push(`/profile?id=${request.sender.id}`); }}
            style={{ cursor: "pointer", transition: "color 0.2s" }}
            onMouseOver={(e) => e.currentTarget.style.color = "var(--primary)"}
            onMouseOut={(e) => e.currentTarget.style.color = ""}
          >
            @{request.sender.username}
          </span>{" "}
          {hasFollowedBack ? "followed you back" : "requested to follow you"}
        </div>

        {status === "pending" && (
          <div className={styles.actions}>
            <button className={`${styles.actionBtn} ${styles.accept}`} onClick={() => handleFollowAction(request.sender.id, "accept")}>
              <Check size={14} /> Accept
            </button>
            <button className={`${styles.actionBtn} ${styles.reject}`} onClick={() => handleFollowAction(request.sender.id, "reject")}>
              <X size={14} /> Reject
            </button>
          </div>
        )}

        {status === "accepted" && (
          <div className={styles.actions}>
            <span className={styles.statusLabel}>
              {hasFollowedBack ? "Followed back" : "Accepted"}
            </span>
            {!hasFollowedBack && (
              <button
                className={styles.followBackBtn}
                onClick={() => handleFollowBack(request.sender.id)}
                disabled={followBackLoading}
              >
                {followBackLoading ? (
                  "..."
                ) : (
                  <><UserPlus size={13} /> Follow Back</>
                )}
              </button>
            )}
          </div>
        )}

        {status === "rejected" && <span className={styles.statusLabel}>Rejected</span>}
        
        {request.created_at && (
          <div className={styles.time}>{timeAgo(request.created_at)}</div>
        )}
      </div>
    </div>
  );
}
