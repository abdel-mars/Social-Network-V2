"use client";

import { ThumbsUp, ThumbsDown } from "lucide-react";
import styles from "./ReactionButtons.module.css";

export function ReactionButtons({ userReaction, likesCount, dislikesCount, onReact }) {
  return (
    <div className={styles.reactionRow}>
      <button
        id="like-btn"
        onClick={(e) => { e.stopPropagation(); onReact("like"); }}
        className={`${styles.reactionBtn} ${userReaction === "like" ? styles.active : ""}`}
        data-reaction="like"
      >
        <ThumbsUp size={15} strokeWidth={2.2} />
        <span>{likesCount}</span>
      </button>

      <button
        id="dislike-btn"
        onClick={(e) => { e.stopPropagation(); onReact("dislike"); }}
        className={`${styles.reactionBtn} ${userReaction === "dislike" ? styles.activeDislike : ""}`}
        data-reaction="dislike"
      >
        <ThumbsDown size={15} strokeWidth={2.2} />
        <span>{dislikesCount}</span>
      </button>
    </div>
  );
}