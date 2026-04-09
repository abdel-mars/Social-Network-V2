"use client";

import { Clock, UserCheck, UserPlus } from "lucide-react";
import styles from "./FollowButton.module.css";

export function FollowButton({ status, onToggle, loading }) {
  const isPending = status === "pending";
  const isFollowing = status === "accepted";
  
  return (
    <button
      onClick={onToggle}
      disabled={isPending || loading}
      className={`${styles.followBtn} ${isPending ? styles.pending : isFollowing ? styles.following : ""}`}
      title={isPending ? "Request pending" : isFollowing ? "Unfollow" : "Follow"}
    >
      {loading ? (
        <span className={styles.loader} />
      ) : isPending ? (
        <><Clock size={14} /> <span className={styles.label}>Pending</span></>
      ) : isFollowing ? (
        <><UserCheck size={14} /> <span className={styles.label}>Unfollow</span></>
      ) : (
        <><UserPlus size={14} /> <span className={styles.label}>Follow</span></>
      )}
    </button>
  );
}