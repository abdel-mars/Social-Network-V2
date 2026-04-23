"use client";

import { useState, useEffect } from "react";
import { timeAgo } from "../../lib/time";
import { useNotifications } from "../notifications/NotificationsContext";
import { useRouter } from "next/navigation";
import styles from "./notification.module.css";
import { Check, X, UserPlus } from "lucide-react";

/**
 * Determines the UI display state from the raw notification data.
 */
function getDisplayStatus(request) {
  if (request.state === "accepted") return "accepted";
  if (request.state === "reject" || request.state === "rejected") return "rejected";
  if (request.receiver_is_private) return "pending";
  return "followed";
}

export default function FollowRequest({ request }) {
  const { markNotificationsRead, removeNotifications, setNotifications } = useNotifications();
  
  // Use a combination of local state (for instant feedback) and prop state (for global sync)
  const [status, setStatus] = useState(() => getDisplayStatus(request));
  const [followBackStatus, setFollowBackStatus] = useState(() => {
    if (request.is_following_sender) return "following";
    if (request.is_pending_sender) return "pending";
    return "not_following";
  });
  const [followBackLoading, setFollowBackLoading] = useState(false);

  // Sync local state when the global notification state (request prop) changes
  useEffect(() => {
    setFollowBackStatus(
      request.is_following_sender ? "following" : 
      request.is_pending_sender ? "pending" : 
      "not_following"
    );
    setStatus(getDisplayStatus(request));
  }, [request.is_following_sender, request.is_pending_sender, request.state]);

  // Handle updates from other components while the panel is OPEN
  useEffect(() => {
    const handleUpdate = (e) => {
      if (e.detail && e.detail.followed_id === request.sender.id && e.detail.source !== "notification") {
        const newStatus = e.detail.status || "not_following";
        
        // Map the event status to our local status
        if (newStatus === "following" || newStatus === "accepted") {
          setFollowBackStatus("following");
        } else if (newStatus === "pending") {
          setFollowBackStatus("pending");
        } else {
          setFollowBackStatus("not_following");
        }
      }
    };
    window.addEventListener("followUpdated", handleUpdate);
    return () => window.removeEventListener("followUpdated", handleUpdate);
  }, [request.sender.id]);

  const handleFollowAction = async (senderId, action) => {
    try {
      const res = await fetch(`http://localhost:8080/request_follow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ sender_id: senderId, status: action }),
      });
      if (res.ok) {
        if (action === "accept") {
          setStatus("accepted");
          setNotifications(prev => prev.map(n => n.id === request.id ? { ...n, state: "accepted" } : n));
          
          window.dispatchEvent(new CustomEvent("followUpdated", { 
            detail: { 
              follower_id: senderId, 
              status: "accepted", 
              source: "notification",
              type: "follower_added"
            } 
          }));
        } else if (action === "reject") {
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
      const data = await res.json();
      if (res.ok) {
        const newStatus = data.status === "pending" ? "pending" : data.status === "accepted" ? "following" : "not_following";
        setFollowBackStatus(newStatus);
        
        window.dispatchEvent(new CustomEvent("followUpdated", { 
          detail: { 
            followed_id: user_id, 
            status: newStatus, 
            source: "notification",
            followers_count: data.followers_count,
            following_count: data.following_count
          } 
        }));
      }
    } catch (err) {
      console.error("Error following back:", err);
    } finally {
      setFollowBackLoading(false);
    }
  };

  const handleItemClick = () => {
    if (status !== "pending") {
      markNotificationsRead([request.id]);
    }
  };

  const messageText =
    status === "pending"
      ? "wants to follow you"
      : followBackStatus === "following"
      ? "is now following you"
      : "started following you";

  return (
    <div 
      className={`${styles.notifItem} ${status !== "pending" ? styles.clickable : ""}`}
      onClick={handleItemClick}
      title={status !== "pending" ? "Click to dismiss" : ""}
    >
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
          <span className={styles.username}>@{request.sender.username}</span>{" "}
          {messageText}
        </div>

        {status === "pending" && (
          <div className={styles.actions} onClick={(e) => e.stopPropagation()}>
            <button className={`${styles.actionBtn} ${styles.accept}`} onClick={() => handleFollowAction(request.sender.id, "accept")}>
              <Check size={14} /> Accept
            </button>
            <button className={`${styles.actionBtn} ${styles.reject}`} onClick={() => handleFollowAction(request.sender.id, "reject")}>
              <X size={14} /> Reject
            </button>
          </div>
        )}

        {(status === "followed" || status === "accepted") && followBackStatus !== "following" && (
          <div className={styles.actions} onClick={(e) => e.stopPropagation()}>
            {followBackStatus === "pending" ? (
              <span className={styles.statusLabel}>Request Sent</span>
            ) : (
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
