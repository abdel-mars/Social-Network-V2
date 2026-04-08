"use client";

export function FollowButton({ status, onToggle, loading }) {
  const label =
    status === "pending" ? "Pending" : status === "accepted" ? "Unfollow" : "Follow";

  return (
    <button
      onClick={onToggle}
      disabled={status === "pending" || loading}
      style={{ opacity: loading ? 0.7 : 1, cursor: loading ? "wait" : "pointer" }}
    >
      {loading ? "..." : label}
    </button>
  );
}