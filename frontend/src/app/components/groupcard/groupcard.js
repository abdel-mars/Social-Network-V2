"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Globe, Lock, ShieldCheck } from "lucide-react";
import { useNotifications } from "../notifications/NotificationsContext";
import styles from "./groupcard.module.css";

export default function GroupCard({ group, Clickable = true }) {
  const router = useRouter();
  const { notifications, markNotificationsRead, removeNotifications } = useNotifications();
  const [status, setStatus] = useState(group.user_status || group.member_status || "not_member");
  const joined = status === "member";
  const isPending = status === "requested" || status === "declined";
  const [loading, setLoading] = useState(false);

  const handleCardClick = () => {
    if (Clickable) router.push(`/groups/${group.id}`);
  };

  const handleJoin = async (e) => {
    e.stopPropagation();
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:8080/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ group_id: group.id }),
      });
      if (res.ok) {
        const data = await res.json();
        const nextState = data?.state === "member" ? "member" : "requested";
        setStatus(nextState);

        if (nextState === "member") {
          const inviteNotificationIds = notifications
            .filter(
              (notification) =>
                notification.type === "group_invitation" && notification.group_id === group.id
            )
            .map((notification) => notification.id);

          if (inviteNotificationIds.length > 0) {
            await markNotificationsRead(inviteNotificationIds);
            removeNotifications(inviteNotificationIds);
          }
        }
      }
    } catch (err) {
      console.error("Failed to join:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className={`${styles.liner} ${Clickable ? styles.clickable : ""}`} 
      onClick={handleCardClick}
    >
      <div className={styles.linerLeft}>
        <div className={styles.iconWrapper}>
          <ShieldCheck size={24} />
        </div>
        <div className={styles.infoWrapper}>
          <div className={styles.headerRow}>
            <h2 className={styles.title}>{group.name}</h2>
            <div className={styles.privacyBadge}>
              {group.privacy === "Private" ? <Lock size={12} /> : <Globe size={12} />}
              <span>{group.privacy}</span>
            </div>
          </div>
          <p className={styles.description}>
            {group.description?.length > 10 
              ? `${group.description.substring(0, 10)}...` 
              : group.description}
          </p>
        </div>
      </div>

      <div className={styles.linerRight} onClick={(e) => e.stopPropagation()}>
        {joined ? (
          <button className={`${styles.joinBtn} ${styles.joined}`} disabled>
            Joined
          </button>
        ) : isPending ? (
          <button className={styles.joinBtn} disabled>
            {status === "requested" ? "Request Sent" : "Invited"}
          </button>
        ) : (
          <button 
            className={styles.joinBtn} 
            onClick={handleJoin}
            disabled={loading}
          >
            {loading ? "Joining..." : status === "invited" ? "Accept Invite" : "Join Group"}
          </button>
        )}
      </div>
    </div>
  );
}
