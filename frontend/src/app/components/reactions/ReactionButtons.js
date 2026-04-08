"use client";

import { ThumbsUp, ThumbsDown } from "lucide-react";

export function ReactionButtons({ userReaction, likesCount, dislikesCount, onReact }) {
  return (
    <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onReact("like");
        }}
        className={`btn ${userReaction === "like" ? "btn-primary" : ""}`}
        style={{
          backgroundColor: userReaction === "like" ? "var(--blue-munsell)" : "var(--french-gray)",
          color: "white",
          display: "flex",
          alignItems: "center",
          gap: "6px",
        }}
      >
        <ThumbsUp size={18} color="white" />
        {likesCount}
      </button>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onReact("dislike");
        }}
        className={`btn ${userReaction === "dislike" ? "btn-primary" : ""}`}
        style={{
          backgroundColor: userReaction === "dislike" ? "var(--blue-munsell)" : "var(--french-gray)",
          color: "white",
          display: "flex",
          alignItems: "center",
          gap: "6px",
        }}
      >
        <ThumbsDown size={18} color="white" />
        {dislikesCount}
      </button>
    </div>
  );
}