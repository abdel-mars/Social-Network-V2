"use client";

import { Clock, UserCheck, UserPlus } from "lucide-react";
import styles from "./FollowButton.module.css";

export function FollowButton({ status, onToggle, loading, isFollower }) {
  const isPending = status === "pending";
  const isFollowing = status === "accepted";
  
  // Show "Follow Back" if the other user follows us but we don't follow them back yet
  const showFollowBack = !isFollowing && !isPending && isFollower;

  return (
    <button
      onClick={onToggle}
      disabled={loading}
      className={`${styles.followBtn} ${isPending ? styles.pending : isFollowing ? styles.following : ""}`}
      title={isPending ? "Cancel request" : isFollowing ? "Unfollow" : showFollowBack ? "Follow Back" : "Follow"}
    >
      {loading ? (
        <span className={styles.loader} />
      ) : isPending ? (
        <><Clock size={14} /> <span className={styles.label}>Pending</span></>
      ) : isFollowing ? (
        <><UserCheck size={14} /> <span className={styles.label}>Unfollow</span></>
      ) : showFollowBack ? (
        <><UserPlus size={14} /> <span className={styles.label}>Follow Back</span></>
      ) : (
        <><UserPlus size={14} /> <span className={styles.label}>Follow</span></>
      )}
    </button>
  );
}