"use client";

import { ThumbsUp, ThumbsDown } from "lucide-react";
import styles from "./ReactionButtons.module.css";

export function ReactionButtons({ userReaction, likesCount, dislikesCount, onReact }) {
  return (
    <div className={styles.reactionRow}>
      <div className={styles.reactionGroup}>
        <button
          id="like-btn"
          onClick={(e) => { e.stopPropagation(); onReact("like"); }}
          className={`${styles.reactionBtn} ${userReaction === "like" ? styles.active : ""}`}
          data-reaction="like"
          title="Like"
          aria-label="Like"
        >
          <ThumbsUp size={15} strokeWidth={2.2} />
        </button>
        <span className={styles.count}>{likesCount ?? 0}</span>
      </div>

      <div className={styles.reactionGroup}>
        <button
          id="dislike-btn"
          onClick={(e) => { e.stopPropagation(); onReact("dislike"); }}
          className={`${styles.reactionBtn} ${userReaction === "dislike" ? styles.activeDislike : ""}`}
          data-reaction="dislike"
          title="Dislike"
          aria-label="Dislike"
        >
          <ThumbsDown size={15} strokeWidth={2.2} />
        </button>
        <span className={styles.count}>{dislikesCount ?? 0}</span>
      </div>
    </div>
  );
}
