"use client";

export function FollowButton({ status, onToggle }) {
  const label =
    status === "pending" ? "Pending" : status === "accepted" ? "Unfollow" : "Follow";
  return (
    <button onClick={onToggle} disabled={status === "pending"}>
      {label}
    </button>
  );
}